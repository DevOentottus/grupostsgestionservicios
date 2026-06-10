# Proposal: Implementación Completa Sistema Gestión

## Intent

Deliver all 48 functional requirements (RF-01 to RF-48) for ServicioLocalSTS — a service management platform with auth, tasks, time tracking, dashboards, areas, templates, audit, displays, and reports.

## Scope

### In Scope

| # | Area | What |
|---|------|------|
| 1 | DB schema | 5 new tables (areas, area_colaboradores, plantillas_proceso, comentarios, auditoria) + 5 modified (usuarios, servicios, tareas, tiempo_tracking, encuestas) |
| 2 | Backend | 5 new modules (areas, plantillas, comentarios, auditoria, reportes) + enhanced dashboard (charts, alerts, KPIs), exports (PDF/Excel), drag-drop reorder |
| 3 | Frontend | Redesigned dashboard (7+ tabs, charts via recharts, alerts), 6 new pages (Areas, Plantillas, Kanban, TV Display, Waiting Room, Work Room), Reports, Audit Log |
| 4 | Auth/Users | RF-02 (password change), RF-03 (enforce role guards), RF-05 (auto-usernames), RF-06 (complete CRUD) |
| 5 | New Features | Kanban (RF-35), display modes (RF-36/37/38), manager views (RF-39/40/41), reports with export (RF-44/45/46), audit trail (RF-47) |

### Out of Scope
- WebSockets for real-time (use polling initially; RF-21)
- Mobile app / PWA
- Multi-tenant isolation
- CI/CD pipeline

## Capabilities

### New Capabilities
- `areas`: CRUD areas + assign managers/colaboradores
- `plantillas-proceso`: Process & task templates
- `comentarios`: Internal comments with history
- `auditoria`: Full audit trail per entity
- `reportes`: Reports with Excel/PDF export
- `kanban`: Visual kanban board
- `displays`: TV / Waiting / Work room modes
- `dashboard-v2`: Multi-tab dashboard with charts, alerts, indicators

### Modified Capabilities
- `auth`: Add password change, role enforcement across all modules
- `usuarios`: Add DNI, apellidos, area_id, auto-username generation
- `servicios`: Add area_id, assigned techs, templates, blocked/delay detection
- `seguimiento`: Enhanced client view, satisfaction-by-area

## Approach

**Phase 1 — Backbone**: New tables + migration → Areas module → Plantillas module → Schema migrations on existing tables
**Phase 2 — Core enhancements**: Password change, role guards, auto-username, enhanced dashboard API (blocked, delayed, stale, pie/bar charts, rankings)
**Phase 3 — Comments & Audit**: Comentarios module + Auditoria module + auto-logging hooks
**Phase 4 — Frontend redesign**: Dashboard tabs (7+), Areas/Plantillas pages, Kanban board
**Phase 5 — Displays & Reports**: TV/Waiting/Work room modes, collaborator/area reports, Excel/PDF export
**Phase 6 — Polish**: Clickable dashboard elements, dynamic filters, period comparison, drag-drop

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/db/schema.ts` | Modified | +5 tables, +columns on 5 existing |
| `backend/src/modules/areas/` | New | CRUD + manager assignment |
| `backend/src/modules/plantillas/` | New | Process template CRUD |
| `backend/src/modules/comentarios/` | New | Comments CRUD |
| `backend/src/modules/auditoria/` | New | Auto-logging middleware |
| `backend/src/modules/reportes/` | New | Reports + export endpoints |
| `backend/src/modules/auth/` | Modified | Password change endpoint |
| `backend/src/modules/usuarios/` | Modified | Auto-username, DNI fields |
| `backend/src/modules/servicios/` | Modified | Area binding, templates |
| `backend/src/modules/seguimiento/` | Modified | Enhanced dashboard, charts data |
| `backend/src/app.ts` | Modified | Register new modules |
| `shared/types/index.ts` | Modified | New types (Area, Plantilla, Comentario, etc.) |
| `src/api/client.ts` | Modified | New API methods |
| `src/app/pages/dashboard-v2/` | New | Multi-tab dashboard |
| `src/app/pages/areas/` | New | Area CRUD + view |
| `src/app/pages/plantillas/` | New | Template management |
| `src/app/pages/kanban/` | New | Drag-drop kanban |
| `src/app/pages/displays/` | New | 3 display mode views |
| `src/app/pages/reportes/` | New | Reports page |
| `src/app/pages/auditoria/` | New | Audit log viewer |
| `src/App.tsx` | Modified | New routes |
| `src/app/layout/Layout.tsx` | Modified | New nav items |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep (48 RFs) | High | Strict phasing, ship Phase 1-2 before starting 3 |
| Drag-drop lib choice | Med | @dnd-kit (lightweight, React 18 compatible) |
| PDF/Excel export perf | Low | Server-side generation, stream response |
| Real-time polling perf | Med | Configurable intervals (10s-60s), disable when tab hidden |
| DB migration conflicts | Med | Drizzle Kit push; backup before each migration |

## Rollback Plan

Per phase: `git checkout` pre-phase commit. For DB: reverse migration script per new table/column. Feature flags for display modes and dashboard v2.

## Dependencies

- `@dnd-kit/core`, `@dnd-kit/sortable` — Kanban & task drag-drop
- `pdfmake` or `jspdf` + `jspdf-autotable` — PDF export
- `xlsx` (SheetJS) — Excel export
- `recharts` — already installed, used for charts

## Success Criteria

- [ ] All 48 RFs implemented and tested via curl/API calls
- [ ] Dashboard shows all 7+ sections with real data
- [ ] Can create area, assign manager, filter services by area
- [ ] Process templates create task lists on new services
- [ ] Audit log captures all CRUD operations
- [ ] Reports export valid PDF and Excel files
- [ ] Frontend builds without TypeScript errors
