# Design: Implementación Completa Sistema Gestión

## Technical Approach

Evolve the existing module-based Fastify backend and React frontend with 5 new modules, 5 new DB tables, 6 new pages, and enhanced dashboard/reports. **No rewrite** — extend existing patterns (controller pattern, Zod validation, Drizzle queries, React Query hooks). Use polling (React Query `refetchInterval`) instead of WebSockets for real-time. Server-side export via exceljs + pdfkit.

---

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| **Audit logging** | DB trigger vs app-level middleware | App-level `auditLog()` helper | Portable, testable, consistent with existing pattern; DB triggers hard to maintain across schema changes |
| **Area-based access** | Row-level security vs query filter | Query filter in controller layer | Simpler; controllers check `request.user.area_id` and add WHERE clause; shim `area_id` into JWT payload on login |
| **Auto-username** | DB trigger vs backend service | Backend `generarUsername()` util before insert | No DB-side logic; pure function on `nombres + apellidos` (NFKD normalize, remove diacritics, lowercase, dot-separate, append counter if collision) |
| **Display modes** | Separate SPA routes vs query param | Separate routes (`/display/tv`, `/display/waiting-room`, `/display/work-room`) | Cleaner route guards; each has unique layout (fullscreen, no sidebar, auto-refresh 5-10s) |
| **Kanban** | react-beautiful-dnd vs @dnd-kit | @dnd-kit/core + @dnd-kit/sortable | Lighter, maintained, React 18 compatible; already in proposal deps |
| **Export format** | Client-side vs server-side | Server-side (GET `/api/reportes/exportar/:tipo/:formato`) | Consistent data access; stream large datasets; no client-size bloat |
| **Process templates** | Many-to-many vs copy-on-apply | Copy-on-apply: template → task instances on service creation | Simpler; avoids sync issues (template changes don't retroactively modify existing services) |
| **Dashboard polling** | WebSockets vs React Query interval | React Query `refetchInterval: 30000` | No infra change; configurable; auto-pauses on tab blur via `document.hidden` |

---

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  React SPA  │────→│  Fastify Router  │────→│  Drizzle ORM │
│  (Vite 6)   │     │  (JWT auth hook) │     │  (Postgres)  │
└──────┬──────┘     └────────┬─────────┘     └──────┬───────┘
       │                     │                      │
  ┌────▼────┐          ┌─────▼──────┐          ┌────▼────┐
  │ React   │          │ Controller │          │ Schema  │
  │ Query   │          │ → validate │          │ (Drizzle│
  │ (5min   │          │ → auditLog │          │  push)  │
  │ cache)  │          │ → response  │          └─────────┘
  └─────────┘          └────────────┘
```

**Create Service with Template**: `POST /api/servicios` → validate → lookup template → insert servicio + tareas from template → auditLog() → return

**Complete Task**: `PATCH /api/tareas/:id/completar` → set completada=true → check all tareas done → auto-update servicio estado to "completado" → auditLog()

**Dashboard**: `GET /api/dashboard?desde=&hasta=` → 4 parallel queries (KPIs, alerts, charts, active services) → single response → React Query caches 30s

---

## Database Design

### New Tables

| Table | Columns | Constraints |
|-------|---------|-------------|
| `areas` | `id SERIAL PK, nombre VARCHAR(150) NOT NULL, encargado_id INT NULL→FK(usuarios), created_at, updated_at` | encargado_id nullable (area may have no manager yet) |
| `areas_colaboradores` | `area_id INT NOT NULL→FK(areas) ON DELETE CASCADE, usuario_id INT NOT NULL→FK(usuarios) ON DELETE CASCADE` | PK(area_id, usuario_id); unique constraint |
| `plantillas_proceso` | `id SERIAL PK, nombre VARCHAR(150) NOT NULL, descripcion TEXT, created_at, updated_at` | — |
| `plantillas_tarea` | `id SERIAL PK, plantilla_id INT NOT NULL→FK(plantillas_proceso) ON DELETE CASCADE, titulo VARCHAR(250) NOT NULL, orden INT NOT NULL DEFAULT 0, created_at` | Index on plantilla_id |
| `servicios_plantillas` | `servicio_id INT NOT NULL→FK(servicios) ON DELETE CASCADE, plantilla_id INT NOT NULL→FK(plantillas_proceso)` | PK(servicio_id, plantilla_id); records which template was used |
| `comentarios` | `id SERIAL PK, servicio_id INT NOT NULL→FK(servicios) ON DELETE CASCADE, tarea_id INT NULL→FK(tareas) ON DELETE SET NULL, usuario_id INT NOT NULL→FK(usuarios), contenido TEXT NOT NULL, created_at` | Index on (servicio_id, created_at DESC) for timeline queries |
| `auditoria` | `id SERIAL PK, usuario_id INT NULL→FK(usuarios), accion VARCHAR(50) NOT NULL, entidad VARCHAR(50) NOT NULL, entidad_id INT NULL, detalle JSONB NULL, created_at` | Index on (entidad, entidad_id) for per-entity lookup; index on (created_at DESC) for timeline |

### Modified Existing Tables

| Table | New Columns | Description |
|-------|-------------|-------------|
| `usuarios` | `apellidos VARCHAR(150), dni VARCHAR(20) UNIQUE, telefono VARCHAR(20), reset_token VARCHAR(255), reset_expires TIMESTAMP, updated_at` | Fields from RF-01; auto-username derived from nombres+apellidos |
| `servicios` | `area_id INT→FK(areas) NULL, prioridad VARCHAR(20) DEFAULT 'normal', tiempo_estimado INT (minutos), fecha_inicio DATE, fecha_fin DATE, bloqueado_motivo TEXT, updated_at` | Extend estado to include 'bloqueado'; area binding |
| `tareas` | `tiempo_estimado INT (minutos)` | Estimated time per task |
| `tiempo_tracking` | *(no structural change)* | *(already has pausa_at for pause/resume)* |
| `encuestas` | *(no structural change)* | *(already has satisfaccion/visibilidad)* |

### Migration Strategy

1. **New tables**: `drizzle-kit push` — drizzle-kit auto-creates new tables without affecting existing
2. **Existing tables**: `drizzle-kit push` also handles ALTER TABLE ADD COLUMN — run after backing up DB
3. **Seed**: Update seed script to create areas, plantillas, and sample data

---

## Backend API Design

### New Modules

| Module | Endpoints | Auth |
|--------|-----------|------|
| **areas** | `GET|POST /api/areas`, `GET|PUT|DELETE /api/areas/:id`, `POST /api/areas/:id/colaboradores`, `DELETE /api/areas/:id/colaboradores/:userId` | admin (CRUD areas); encargado (GET own area) |
| **plantillas** | `GET|POST /api/plantillas`, `GET|PUT|DELETE /api/plantillas/:id`, `GET|POST /api/plantillas/:id/tareas`, `DELETE /api/plantillas-tareas/:id` | admin, encargado |
| **comentarios** | `GET /api/servicios/:id/comentarios`, `POST /api/servicios/:id/comentarios`, `DELETE /api/comentarios/:id` | authenticated (GET: all; POST: own; DELETE: own or admin) |
| **auditoria** | `GET /api/auditoria?entidad=&entidad_id=&usuario_id=&desde=&hasta=&page=&limit=` | admin only |
| **reportes** | `GET /api/reportes/colaborador?desde=&hasta=&area_id=`, `GET /api/reportes/area?desde=&hasta=`, `GET /api/reportes/exportar/:tipo/:formato?desde=&hasta=&area_id=` | admin, encargado |

### Modified Endpoints

| Endpoint | Changes |
|----------|---------|
| `GET /api/dashboard` | + `alertas` (blocked/delayed/stale services), `graficos` (estado pie chart, servicios por area bar, tendencia line), `periodo_comparacion` (vs previous period), `activos` (table of in-progress + blocked) |
| `POST /api/servicios` | + `area_id`, `plantilla_id` (optional — copies template tasks), `prioridad`, `tiempo_estimado`, `fecha_inicio` |
| `PUT /api/servicios/:id` | + area fields, `bloqueado_motivo` |
| `PATCH /api/servicios/:id/estado` | Add 'bloqueado' state; if bloqueado, require `bloqueado_motivo` |
| `POST /api/servicios/:id/iniciar` | New: sets estado=en_progreso, fecha_inicio=now |
| `PUT /api/tareas/reordenar` | Accepts `{ tareas: [{id, orden}] }` — batch update orden (existing) |
| `PUT /api/usuarios/:id/password` | New: change password (user can change own; admin can change any) |

### Audit Helper

```typescript
// backend/src/core/audit/helper.ts
export async function auditLog(
  db: DrizzleDB,
  usuario_id: number | null,
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'COMPLETE' | 'REOPEN' | 'STATUS_CHANGE',
  entidad: string,
  entidad_id: number | null,
  detalle?: Record<string, unknown>
) {
  await db.insert(schema.auditoria).values({ usuario_id, accion, entidad, entidad_id, detalle: detalle ?? null });
}
```

Auto-logged in each controller after successful mutation. Not wrapped as a DB interceptor — explicit calls at point of use for clarity.

### Auto-Username Generation

```
nombres: "José María", apellidos: "García López"
→ normalize: "jose maria" + "garcia lopez"
→ base: "jose.maria.garcia.lopez"
→ if exists: "jose.maria.garcia.lopez.1"
```

Implementation: `backend/src/core/utils/username.ts` — uses `String.prototype.normalize('NFKD')` to strip diacritics.

---

## Frontend Component Tree

### New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/areas` | `AreasPage` | CRUD areas + assign manager/colaboradores |
| `/plantillas` | `PlantillasPage` | CRUD process templates + task templates |
| `/servicios/:id?tab=kanban` | `KanbanTab` (tab in ServicioDetail) | Drag-drop kanban by tarea status |
| `/display/tv` | `DisplayTVPage` | Fullscreen TV dashboard (auto-refresh 10s) |
| `/display/waiting-room` | `DisplayWaitingRoomPage` | Waiting room view (auto-refresh 5s) |
| `/display/work-room` | `DisplayWorkRoomPage` | Work room view with active services (auto-refresh 8s) |
| `/reportes` | `ReportesPage` | Reports with filters + export buttons |
| `/auditoria` | `AuditoriaPage` | Audit log table with filters (admin only) |

### Enhanced Pages

| Page | Enhancements |
|------|--------------|
| `DashboardPage` → dashboard-v2 | 7+ tab sections: Alertas (blocked/delayed/stale cards), Indicadores (8 KPIs), Gráficos (pie/bar/line via recharts), Servicios Activos (sortable table), Periodo Comparación (% vs previous), Rankings (top colaboradores, areas) |
| `ServicioDetailPage` | Tabs: Details, Kanban (via @dnd-kit), Comments (timeline), Time Tracking (summary), Flow Diagram (static state machine) |
| `Layout` Sidebar | + nav items: Areas, Plantillas, Reportes, Auditoria (admin); + display links in footer |

### Shared Components

- `Charts/`: `PieChartCard`, `BarChartCard`, `LineChartCard` wrapping recharts
- `AlertCard`: Blocked/delayed/stale summary card with count + drill-down link
- `Filters/`: `DateRangeFilter`, `AreaFilter`, `StatusFilter` — reusable filter bars
- `PeriodComparison`: Diff indicator (Δ% vs previous period)
- `ConfirmDialog`: Reusable delete confirmation
- `Tabs`: Generic tab container for detail pages
- `KanbanBoard`: @dnd-kit sortable columns (Pendiente, En Progreso, Completado)

### New API Client Methods

```typescript
// In src/api/client.ts
export const areasApi = { listar, obtener, crear, editar, eliminar, asignarColaborador, removerColaborador, listarColaboradores }
export const plantillasApi = { listar, obtener, crear, editar, eliminar, listarTareas, crearTarea, eliminarTarea }
export const comentariosApi = { listar, crear, eliminar }
export const auditoriaApi = { listar }
export const reportesApi = { colaborador, area, exportar }
// Enhanced
seguimientoApi.dashboardV2(params) // richer response
```

---

## Key Implementation Details

### Dashboard V2 Response Shape

```typescript
interface DashboardV2Response {
  kpi: DashboardKPI;                          // existing KPIs
  alertas: {
    bloqueados: Servicio[];
    demorados: Servicio[];                     // > tiempo_estimado
    estancados: Servicio[];                    // no activity > 7 days
  };
  graficos: {
    estado_distribucion: { name: string; value: number }[];
    servicios_por_area: { area: string; count: number }[];
    tendencia_mensual: { mes: string; creados: number; completados: number }[];
  };
  activos: (Servicio & { tareas_pendientes: number; tiempo_total: number })[];
  periodo_comparacion?: {
    servicios_creados: { actual: number; anterior: number; diff_pct: number };
    completados: { actual: number; anterior: number; diff_pct: number };
    tiempo_promedio: { actual: number; anterior: number; diff_pct: number };
  };
  rankings: {
    colaboradores: { usuario_id: number; nombres: string; tareas_completadas: number; tiempo_total: number }[];
    areas: { area_id: number; nombre: string; servicios_completados: number }[];
  };
}
```

### Area-based Access Control

- JWT payload includes `area_id` (set during login for non-admin users)
- `encargado` role: queries filtered by `area_id` on servicios, tareas, usuarios (only area's colaboradores)
- `colaborador` role: sees only servicios where area_id matches their assigned area
- `admin` role: no filter (all data)
- Auth middleware extended: `authorizeByArea()` — applied to dashboard, servicios list, reportes

### Polling Strategy

| Route | Interval | Condition |
|-------|----------|-----------|
| `/display/*` | 5-10s | Always active |
| `/dashboard` | 30s | Refetch on tab focus + interval |
| `/servicios/:id` | 30s | Only if estado !== "completado" |
| Other pages | None | Manual refresh only |

React Query's `refetchInterval` handles this; `refetchIntervalInBackground: false` pauses when tab hidden.

### Export Implementation

```typescript
// GET /api/reportes/exportar/:tipo/:formato
// tipo: 'colaborador' | 'area' | 'servicios'
// formato: 'xlsx' | 'pdf'
// Streams file response with correct Content-Type + Content-Disposition
// Backend: exceljs (xlsx) + pdfkit (pdf) — installed as deps
```

---

## Phase Breakdown (6 Phases)

| Phase | Scope | Key Files |
|-------|-------|-----------|
| **1 — Backbone** | New DB tables + migration → Areas module (backend+frontend) → Schema changes on existing tables | schema.ts, areas.controller.ts, areas pages |
| **2 — Dashboard v2** | Enhanced dashboard endpoint (alerts, charts, rankings, period comparison) + frontend redesign with recharts tabs | seguimiento.controller.ts, Dashboard-v2.tsx, Chart components |
| **3 — Comments + Audit** | Comentarios module → Auditoria module → auto-logging hooks → Frontend pages | comentarios.controller.ts, auditoria.controller.ts, audit helper |
| **4 — Plantillas** | Plantillas CRUD (backend+frontend) → Template binding on service creation | plantillas.controller.ts, PlantillasPage.tsx |
| **5 — Displays + Reports** | 3 display routes + Reports page + Export endpoints (exceljs/pdfkit) | Display pages, reportes.controller.ts, export service |
| **6 — Kanban + Polish** | Kanban tab with @dnd-kit → Drag-drop reorder → Clickable dashboard → Dynamic filters | KanbanBoard.tsx, enhanced ServicioDetail |

---

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| **Unit** | `generarUsername()` util, `auditLog()` helper, Zod schemas | Manual (no test infra); TS typecheck catches schema issues |
| **Integration** | New API endpoints via curl/httpie | Manual curl scripts per endpoint; verify DB state |
| **Validation** | TS `--noEmit` build check | `npm run typecheck && npm run typecheck:backend` |
| **Data integrity** | FK constraints, unique indexes | Drizzle schema enforces at DB level |

---

## Migration / Rollout

Per phase: commit at end of each phase. DB: `drizzle-kit push` adds tables/columns incrementally. No data migration needed (new nullable columns + new tables). Rollback: `git checkout` pre-phase commit + reverse migration (DROP new tables + ALTER DROP new columns).

---

## Open Questions

- [ ] Period comparison baseline: compare vs previous N days (same length) or vs previous month?
- [ ] Assign `area_id` to existing colaboradores during migration — manual or bulk update script?
- [ ] Display mode routes: separate React entry points or sub-routes within SPA? (Proposal: sub-routes, minimal layout)
- [ ] PDF export design: simple table layout or template-based with logo/header?
