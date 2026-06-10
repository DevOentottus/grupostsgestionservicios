# Tasks: Implementación Completa Sistema Gestión

Total: **49 tasks** across 6 phases.

---

## Phase 1: Database Schema + Auth + Usuarios (Backbone)

### P1-01 | Schema: Add New DB Tables
- **Description**: Add 7 new tables to Drizzle schema: `areas`, `areas_colaboradores`, `plantillas_proceso`, `plantillas_tarea`, `servicios_plantillas`, `servicios_colaboradores`, `comentarios`, `auditoria` with all FK constraints, indexes, and cascading deletes.
- **Files**: `backend/src/db/schema.ts`
- **RFs**: RF-01, RF-04, RF-25, RF-29, RF-33, RF-47
- **Dependencies**: None
- **AC**: All new tables are defined with proper FK references, unique constraints, and indexes. `drizzle-kit push` creates them.
- **Complexity**: M

### P1-02 | Schema: Add Columns to Existing Tables
- **Description**: Add columns to `usuarios` (apellidos, dni UNIQUE, telefono, reset_token, reset_expires, updated_at), `servicios` (area_id→FK areas, prioridad DEFAULT 'normal', tiempo_estimado INT, fecha_inicio DATE, fecha_fin DATE, bloqueado_motivo TEXT, updated_at, estado add 'bloqueado'), `tareas` (tiempo_estimado INT, asignado_a→FK usuarios NULL). Extend estado enum type.
- **Files**: `backend/src/db/schema.ts`
- **RFs**: RF-01, RF-04, RF-28, RF-30
- **Dependencies**: P1-01
- **AC**: All new columns exist in Drizzle schema. Column types match design. Estado type includes 'bloqueado'.
- **Complexity**: M

### P1-03 | Schema: Add `asignado_a` to Tareas + Create `servicios_colaboradores` Junction
- **Description**: Add `asignado_a` FK column on `tareas` referencing `usuarios.id`. Create `servicios_colaboradores` junction table (servicio_id, usuario_id) PK(servicio_id, usuario_id) for tracking assigned techs per service.
- **Files**: `backend/src/db/schema.ts`
- **RFs**: RF-28, RF-30, RF-48
- **Dependencies**: P1-01, P1-02
- **AC**: Junction table exists with FK cascading. Tareas table has asignado_a column.
- **Complexity**: S

### P1-04 | Core: Create `auditLog()` Helper Utility
- **Description**: Create `backend/src/core/audit/helper.ts` with `auditLog(db, usuario_id, accion, entidad, entidad_id, detalle?)` function that inserts into `auditoria` table. Export as reusable module.
- **Files**: `backend/src/core/audit/helper.ts`
- **RFs**: RF-47
- **Dependencies**: P1-01
- **AC**: Helper function exists, inserts correct audit record with all fields. Tests with curl show audit entries created.
- **Complexity**: S

### P1-05 | Core: Create `generarUsername()` Utility
- **Description**: Create `backend/src/core/utils/username.ts` with pure function `generarUsername(nombres: string, apellidos: string): string` that NFKD-normalizes, strips diacritics, lowercases, dot-separates first name + first surname, and appends `.N` counter if collision. Accept existing usernames array for collision checking.
- **Files**: `backend/src/core/utils/username.ts`
- **RFs**: RF-05
- **Dependencies**: None
- **AC**: "José María García López"→"jose.garcia". Collision→"jose.garcia.2". NFKD strips ñ/á/é/í/ó/ú/ü correctly.
- **Complexity**: S

### P1-06 | Auth: Enhance JWT with `area_id` + Password Change
- **Description**: Update `auth.service.ts` to fetch user's `area_id` from areas (via areas_colaboradores or encargado_id) and embed in JWT. Add `PATCH /api/auth/password` (change own password). Update `GET /api/auth/me` to return area_id. Add auditLog() call on successful login.
- **Files**: `backend/src/modules/auth/auth.service.ts`, `backend/src/modules/auth/auth.controller.ts`
- **RFs**: RF-01, RF-02, RF-03
- **Dependencies**: P1-01, P1-02, P1-04
- **AC**: JWT contains `area_id`. Login auditLog created. Password change works. Weak password returns 422.
- **Complexity**: M

### P1-07 | Auth: Admin Password Change Endpoint
- **Description**: Add `PUT /api/usuarios/:id/password` to usuarios controller. Admin confirms own password, then sets new password for target user. Requires admin role. Add `PATCH /api/auth/password` for self-service (current password required).
- **Files**: `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/usuarios/usuarios.controller.ts`
- **RFs**: RF-02
- **Dependencies**: P1-06
- **AC**: Admin can reset any user's password. Non-admin gets 403. Wrong current password returns 401.
- **Complexity**: S

### P1-08 | Auth: Create `authorizeByArea()` Middleware
- **Description**: Create `backend/src/core/middleware/area.ts` with `authorizeByArea()` that checks `request.user.area_id` for encargado/colaborador roles and adds WHERE clause filter. For encargado: filter by own area_id. For colaborador: only servicios where they have assigned tasks. Admin: no filter.
- **Files**: `backend/src/core/middleware/area.ts`
- **RFs**: RF-03
- **Dependencies**: P1-06
- **AC**: Encargado sees only their area's servicios. Colaborador sees only their assigned servicios. Admin sees all.
- **Complexity**: M

### P1-09 | Usuarios: Update Controller with New Fields + Auto-Username
- **Description**: Update usuarios controller (create + edit) to accept new fields (dni, apellidos, telefono). Auto-generate username via `generarUsername()` before insert. Return generated username in response. Update edit to accept all new fields. Add DNI uniqueness check returns 409.
- **Files**: `backend/src/modules/usuarios/usuarios.controller.ts`, `backend/src/modules/auth/auth.schema.ts`
- **RFs**: RF-04, RF-05, RF-06
- **Dependencies**: P1-02, P1-05, P1-06
- **AC**: Create user without username→auto-generated. Duplicate DNI→409. Edit updates all new fields.
- **Complexity**: M

### P1-10 | Frontend: Update Shared Types
- **Description**: Add new TypeScript types to `shared/types/index.ts`: `Area`, `AreaColaborador`, `PlantillaProceso`, `PlantillaTarea`, `Comentario`, `Auditoria`, `DisplayData`. Update existing types: `Servicio` (add area_id, prioridad, etc.), `Usuario` (add apellidos, dni, etc.), `Tarea` (add tiempo_estimado, asignado_a), `JwtPayload` (add area_id). Add `DashboardV2Response` interface.
- **Files**: `shared/types/index.ts`
- **RFs**: RF-01, RF-04, RF-07, RF-25, RF-28, RF-33, RF-47
- **Dependencies**: P1-01, P1-02
- **AC**: All new types exported and referenced correctly. TypeScript `--noEmit` passes.
- **Complexity**: M

### P1-11 | Frontend: Add API Client Methods for New Modules
- **Description**: Add API methods to `src/api/client.ts`: `areasApi` (listar, obtener, crear, editar, eliminar, asignarColaborador, removerColaborador, listarColaboradores), `plantillasApi` (listar, obtener, crear, editar, eliminar, listarTareas, crearTarea, eliminarTarea), `comentariosApi` (listar, crear, eliminar), `auditoriaApi` (listar), `reportesApi` (colaborador, area, exportar). Enhance `seguimientoApi.dashboardV2()`.
- **Files**: `src/api/client.ts`
- **RFs**: RF-25, RF-29, RF-33, RF-44, RF-47
- **Dependencies**: P1-10
- **AC**: All new API methods defined and exported. Follow existing Axios pattern.
- **Complexity**: M

### P1-12 | Frontend: Create Areas Pages + React Query Hooks
- **Description**: Create `useAreas.ts` React Query hooks (listar, crear, editar, eliminar, asignarColaborador). Create `AreasPage.tsx` with CRUD table, assign manager modal, collaborator management. Add `/areas` route to App.tsx and nav item to Layout.tsx sidebar.
- **Files**: `src/api/queries/useAreas.ts`, `src/app/pages/areas/Areas.tsx`, `src/app/layout/Layout.tsx`, `src/App.tsx`
- **RFs**: RF-25, RF-26, RF-27
- **Dependencies**: P1-10, P1-11
- **AC**: Areas page renders with CRUD. Manager assignment works. Collaborator management works. Route protected.
- **Complexity**: L

### P1-13 | Seed: Update Seed Script with Areas + Test Data
- **Description**: Update `backend/src/seeds/run.ts` to create sample areas with encargados, colaboradores, service templates, and demo services with new fields (area_id, prioridad, assigned techs). Add sample audit entries and comments.
- **Files**: `backend/src/seeds/run.ts`
- **RFs**: RF-01, RF-04, RF-25, RF-28, RF-29, RF-33, RF-47
- **Dependencies**: P1-01, P1-02, P1-09
- **AC**: `npm run seed` creates areas, assigns colaboradores, creates services with area binding. No errors.
- **Complexity**: M

### P1-14 | Migration: Run `drizzle-kit push`
- **Description**: Execute `drizzle-kit push` to apply all schema changes to the database. Verify by checking that all new tables and columns exist. Backup database first.
- **Files**: None (CLI operation)
- **RFs**: All
- **Dependencies**: P1-01, P1-02, P1-03
- **AC**: All tables and columns created in PostgreSQL. Existing data preserved. No migration errors.
- **Complexity**: S

---

## Phase 2: Dashboard v2

### P2-01 | Backend: Create Dashboard V2 Endpoint
- **Description**: Create `GET /api/dashboard/v2?desde=&hasta=&area_id=` endpoint in seguimiento controller returning: `kpi` (8 existing KPIs), `alertas` (bloqueados, demorados>estimado, estancados>48h), `graficos` (estado_distribucion, servicios_por_area, tendencia_mensual), `activos` (table of in-progress+blocked with progress), `periodo_comparacion` (% vs previous period), `rankings` (top colaboradores by tasks, areas by completados). Apply area-based access.
- **Files**: `backend/src/modules/seguimiento/seguimiento.controller.ts`
- **RFs**: RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-22, RF-23, RF-24
- **Dependencies**: P1-01, P1-02, P1-08
- **AC**: Dashboard v2 returns all sections. Filters work. Area-based access respected. Period comparison shows % change.
- **Complexity**: L

### P2-02 | Backend: Create Satisfaction-by-Area + Indicator Endpoints
- **Description**: Add `GET /api/dashboard/satisfaccion-areas` returning avg rating grouped by area. Add filter endpoints for specific indicators: `GET /api/dashboard/v2?indicador=productividad&periodo=mensual` (tasks per collaborator), `?indicador=eficiencia` (avg vs estimated), `?indicador=satisfaccion` (NPS distribution).
- **Files**: `backend/src/modules/seguimiento/seguimiento.controller.ts`
- **RFs**: RF-11, RF-12, RF-13, RF-19
- **Dependencies**: P1-01, P1-08
- **AC**: Satisfaction-by-area returns correct averages. Indicator endpoints filter correctly.
- **Complexity**: M

### P2-03 | Backend: Add Ranking Endpoint
- **Description**: Add `GET /api/dashboard/ranking?periodo=mensual&limit=5` returning top collaborators by completed tasks and top areas by completed services. Apply area-based filter for non-admins.
- **Files**: `backend/src/modules/seguimiento/seguimiento.controller.ts`
- **RFs**: RF-16
- **Dependencies**: P1-08, P2-01
- **AC**: Ranking endpoint returns top N with correct ordering. Filters by area for encargado.
- **Complexity**: S

### P2-04 | Frontend: Create Chart Components
- **Description**: Create `src/app/pages/seguimiento/components/PieChartCard.tsx` (status distribution), `BarChartCard.tsx` (services by area), `LineChartCard.tsx` (monthly trend). Each wraps recharts with consistent styling, title prop, and legend. Handle empty state (no data message).
- **Files**: `src/app/pages/seguimiento/components/PieChartCard.tsx`, `src/app/pages/seguimiento/components/BarChartCard.tsx`, `src/app/pages/seguimiento/components/LineChartCard.tsx`
- **RFs**: RF-14, RF-15
- **Dependencies**: P1-10
- **AC**: Charts render with recharts. Empty states handled. Responsive sizing works.
- **Complexity**: M

### P2-05 | Frontend: Create Dashboard Shared Components
- **Description**: Create `AlertCard.tsx` (blocked/delayed/stale card with count + drill-down link), `DateRangeFilter.tsx` (desde/hasta inputs), `AreaFilter.tsx` (area dropdown), `StatusFilter.tsx` (estado checkboxes), `PeriodComparison.tsx` (Δ% diff indicator with green/red coloring), `FilterBar.tsx` (composable filter bar).
- **Files**: `src/app/pages/seguimiento/components/AlertCard.tsx`, `src/app/pages/seguimiento/components/DateRangeFilter.tsx`, `src/app/pages/seguimiento/components/AreaFilter.tsx`, `src/app/pages/seguimiento/components/StatusFilter.tsx`, `src/app/pages/seguimiento/components/PeriodComparison.tsx`, `src/app/pages/seguimiento/components/FilterBar.tsx`
- **RFs**: RF-07, RF-08, RF-09, RF-10, RF-23, RF-24
- **Dependencies**: P1-10
- **AC**: All components render correctly. Filters emit onChange events. PeriodComparison shows diff with correct color.
- **Complexity**: M

### P2-06 | Frontend: Create useDashboardV2 Hook
- **Description**: Create `useDashboardV2.ts` React Query hook with `refetchInterval: 30000`, `refetchIntervalInBackground: false` (polls only when tab visible). Hook accepts `{ desde, hasta, area_id, estado }` params. Returns typed `DashboardV2Response`.
- **Files**: `src/api/queries/useSeguimiento.ts` (extend), `src/api/queries/useDashboardV2.ts`
- **RFs**: RF-21
- **Dependencies**: P1-10, P2-01
- **AC**: Hook fetches dashboard v2 data. Polls every 30s. Stops polling when tab hidden.
- **Complexity**: S

### P2-07 | Frontend: Redesign DashboardPage
- **Description**: Rewrite `DashboardPage.tsx` with tab navigation (Resumen, KPIs, Alertas, Servicios Activos, Gráficos, Ranking, Comparativo). URL updates to `?tab=`. Each tab section renders appropriate components. Active services table has clickable rows→`/servicios/:id`. KPI cards link to filtered views. Period comparison tab shows diff table.
- **Files**: `src/app/pages/seguimiento/Dashboard.tsx`, `src/app/pages/seguimiento/Dashboard-v2.tsx` (new)
- **RFs**: RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-22, RF-23, RF-24
- **Dependencies**: P2-04, P2-05, P2-06
- **AC**: 7 tabs render. Each shows correct data. Tab switches work without page reload. URL updates.
- **Complexity**: L

---

## Phase 3: Comments + Audit

### [x] P3-01 | Backend: Create Comentarios Controller
- **Description**: Create `backend/src/modules/comentarios/comentarios.controller.ts` with endpoints: `GET /api/servicios/:id/comentarios` (ordered by created_at ASC, with usuario join), `POST /api/servicios/:id/comentarios` (auto-set usuario_id from JWT, max 2000 chars), `POST /api/servicios/:id/tareas/:tareaId/comentarios` (link to task), `DELETE /api/comentarios/:id` (own comment or admin). Validate empty content→422. Add auditLog on create. Register in app.ts.
- **Files**: `backend/src/modules/comentarios/comentarios.controller.ts`, `backend/src/app.ts`
- **RFs**: RF-33
- **Dependencies**: P1-01, P1-04, P1-06
- **AC**: Create comment works. List returns chronological with usuario info. Empty content→422. Delete own comment works.
- **Complexity**: M

### [x] P3-02 | Frontend: Add Comentarios API + Hooks + UI
- **Description**: Create `useComentarios.ts` React Query hooks (listar, crear, eliminar). Add comments timeline UI component to ServicioDetail (renders as chat-like feed with author avatar, timestamp, content). Add comment input box with submit button. Wire into ServicioDetail tab.
- **Files**: `src/api/queries/useComentarios.ts`, `src/app/pages/servicios/components/CommentsTab.tsx`, `src/app/pages/servicios/ServicioDetail.tsx`
- **RFs**: RF-33
- **Dependencies**: P1-10, P1-11, P3-01
- **AC**: Comments render in timeline. New comment appears optimistically. Delete button visible for own comments.
- **Complexity**: M

### [x] P3-03 | Backend: Create Auditoria Controller
- **Description**: Create `backend/src/modules/auditoria/auditoria.controller.ts` with `GET /api/auditoria?entidad=&entidad_id=&usuario_id=&desde=&hasta=&page=&limit=` (admin only, paginated). Add auditLog calls to existing controllers: `POST /api/auth/login` (accion=LOGIN), `PUT/POST/DELETE servicios` (CREATE/UPDATE/DELETE), `PATCH servicios/estado` (STATUS_CHANGE), `POST usuarios` (CREATE), `PATCH tareas/completar` (COMPLETE), `PATCH tareas/reabrir` (REOPEN). Register in app.ts.
- **Files**: `backend/src/modules/auditoria/auditoria.controller.ts`, `backend/src/app.ts`
- **RFs**: RF-47
- **Dependencies**: P1-01, P1-04, P1-06
- **AC**: Audit log returns paginated results. Filters work. Non-admin gets 403. Controller mutations create correct audit entries.
- **Complexity**: M

### [x] P3-04 | Backend: Wire Remaining AuditLog Calls
- **Description**: Add auditLog() calls to remaining controllers: areas controller (CREATE/UPDATE/DELETE area, assign/remove colaborador), plantillas controller (CREATE/UPDATE/DELETE plantilla, CREATE/DELETE tarea), comentarios controller (CREATE/DELETE), servicios controller (iniciar servicio).
- **Files**: `backend/src/modules/areas/areas.controller.ts`, `backend/src/modules/plantillas/plantillas.controller.ts`, `backend/src/modules/comentarios/comentarios.controller.ts`, `backend/src/modules/servicios/servicios.controller.ts`
- **RFs**: RF-47
- **Dependencies**: P3-01, P3-03, P4-01
- **AC**: All CRUD operations across modules generate audit records with correct accion and detalle.
- **Complexity**: M

### [x] P3-05 | Frontend: Create Auditoria Hook + Page
- **Description**: Create `useAuditoria.ts` React Query hook (listar con filtros). Create `AuditoriaPage.tsx` with filterable table (entity type dropdown, date pickers, search by usuario). Responsive data table with sortable columns. Admin-only route. Add to App.tsx and Layout sidebar.
- **Files**: `src/api/queries/useAuditoria.ts`, `src/app/pages/auditoria/AuditoriaPage.tsx`, `src/app/layout/Layout.tsx`, `src/App.tsx`
- **RFs**: RF-47
- **Dependencies**: P1-10, P1-11, P3-03
- **AC**: Audit log table renders with pagination. Filters work. Non-admin redirected. Row shows usuario, accion, entidad, timestamp.
- **Complexity**: M

---

## Phase 4: Plantillas de Proceso

### P4-01 | Backend: Create Plantillas Controller
- **Description**: Create `backend/src/modules/plantillas/plantillas.controller.ts` with CRUD endpoints: `GET|POST /api/plantillas`, `GET|PUT|DELETE /api/plantillas/:id`, `GET|POST /api/plantillas/:id/tareas`, `DELETE /api/plantillas-tareas/:id`. Template tasks have titulo, descripcion, orden, asignado_a. Require admin/encargado role. Add auditLog on mutations. Register in app.ts.
- **Files**: `backend/src/modules/plantillas/plantillas.controller.ts`, `backend/src/app.ts`
- **RFs**: RF-29, RF-48
- **Dependencies**: P1-01, P1-04, P1-06
- **AC**: CRUD plantillas works. Create template with tasks returns ordered tasks. Empty template returns 200. auditLog fired.
- **Complexity**: M

### P4-02 | Backend: Add Template Application to Service Creation
- **Description**: Update `POST /api/servicios` to accept optional `plantilla_id`. When provided, copy template tasks as new tareas for the service (copy-on-apply). Add `POST /api/servicios/:id/aplicar-plantilla/:plantilla_id` to apply template to existing service (append tasks, preserve existing sort_order). Update `servicios_plantillas` junction table. Add auditLog.
- **Files**: `backend/src/modules/servicios/servicios.controller.ts`
- **RFs**: RF-29, RF-48
- **Dependencies**: P1-01, P4-01
- **AC**: Service creation with plantilla_id creates tasks from template. Apply to existing service appends tasks. Audit logged.
- **Complexity**: M

### P4-03 | Frontend: Create Plantillas Hook + Page
- **Description**: Create `usePlantillas.ts` React Query hooks (CRUD plantillas + tareas). Create `PlantillasPage.tsx` with template list, create/edit modal, task editor (add/reorder/delete tasks within template). Add to App.tsx and Layout sidebar.
- **Files**: `src/api/queries/usePlantillas.ts`, `src/app/pages/plantillas/PlantillasPage.tsx`, `src/app/layout/Layout.tsx`, `src/App.tsx`
- **RFs**: RF-29, RF-48
- **Dependencies**: P1-10, P1-11, P4-01
- **AC**: Template list renders. Create modal works. Task editor allows add/remove tasks. Reorder updates orden.
- **Complexity**: L

### P4-04 | Frontend: Add Template Selector to Service Creation
- **Description**: Enhance service creation form (create/edit modal in Servicios.tsx) with area_id dropdown (populated from areasApi), plantilla_id dropdown (populated from plantillasApi), prioridad selector, and tecnicos_asignados multi-select. When plantilla selected, show preview of tasks that will be created.
- **Files**: `src/app/pages/servicios/Servicios.tsx`
- **RFs**: RF-28, RF-29
- **Dependencies**: P4-03
- **AC**: Service creation form includes new fields. Plantilla dropdown populated. Area dropdown populated.
- **Complexity**: M

---

## Phase 5: Displays + Reports

### P5-01 | Backend: Create Display Endpoints (TV + Waiting Room + Work Room)
- **Description**: Create display endpoints: `GET /api/public/display/tv` (active en_progreso services with progress %, no auth required), `GET /api/public/display/sala-espera/:codigo` (single service position + ETA based on remaining estimated time), `GET /api/display/trabajo` (team view with blocked/delayed flags, requires auth). Each returns data optimized for display mode.
- **Files**: `backend/src/modules/seguimiento/seguimiento.controller.ts` (or new `displays.controller.ts`)
- **RFs**: RF-36, RF-37, RF-38
- **Dependencies**: P1-01, P1-02
- **AC**: TV endpoint returns active services with progress. Waiting room endpoint returns position+ETA. Work room returns alerts.
- **Complexity**: M

### P5-02 | Frontend: Create TV Display Page
- **Description**: Create `DisplayTVPage.tsx` at `/display/tv` route. Fullscreen layout with large cards showing active services (codigo, cliente, progress bar, assigned techs). Auto-refresh every 10s via React Query `refetchInterval: 10000`. Dark theme optimized for TV. Minimal layout (no sidebar).
- **Files**: `src/app/pages/displays/DisplayTVPage.tsx`, `src/App.tsx`
- **RFs**: RF-36
- **Dependencies**: P5-01
- **AC**: TV page renders fullscreen. Auto-refreshes. Shows only en_progreso services.
- **Complexity**: M

### P5-03 | Frontend: Create Waiting Room Display Page
- **Description**: Create `DisplayWaitingRoomPage.tsx` at `/display/sala-espera/:codigo`. Shows service position in queue, progress bar with %, ETA in minutes, and status badge. Auto-refresh every 5s. Professional client-facing design. Handles invalid code→404 message.
- **Files**: `src/app/pages/displays/DisplayWaitingRoomPage.tsx`, `src/App.tsx`
- **RFs**: RF-37
- **Dependencies**: P5-01
- **AC**: Waiting room shows position and ETA. Invalid code shows not-found message. Auto-refreshes.
- **Complexity**: M

### P5-04 | Frontend: Create Work Room Display Page
- **Description**: Create `DisplayWorkRoomPage.tsx` at `/display/trabajo` route. Fullscreen team dashboard with active services table, blocked items highlighted in red, delayed in orange. Shows collaborator presence. Auto-refresh every 8s. Full-screen API mode on first user gesture.
- **Files**: `src/app/pages/displays/DisplayWorkRoomPage.tsx`, `src/App.tsx`
- **RFs**: RF-38
- **Dependencies**: P5-01
- **AC**: Work room dashboard renders. Blocked/delayed services highlighted. Auto-refreshes.
- **Complexity**: M

### P5-05 | Backend: Install exceljs + pdfkit + Create Reports Controller
- **Description**: Install `exceljs` and `pdfkit` in backend package.json. Create `backend/src/modules/reportes/reportes.controller.ts` with: `GET /api/reportes/colaborador/:id?desde=&hasta=` (services, total hours, tasks completed, efficiency), `GET /api/reportes/area/:id?periodo=mensual` (completed count, avg completion time, trend), `GET /api/reportes/exportar/:tipo/:formato?desde=&hasta=&area_id=` (stream XLSX or PDF file with correct Content-Type/Disposition). Support tipos: colaborador, area, servicios. Support formatos: xlsx, pdf. Handle empty data→valid file with header+message. Register in app.ts.
- **Files**: `backend/package.json`, `backend/src/modules/reportes/reportes.controller.ts`, `backend/src/app.ts`
- **RFs**: RF-44, RF-45, RF-46
- **Dependencies**: P1-01, P1-08
- **AC**: Collaborator report returns metrics. Export returns downloadable XLSX/PDF. Invalid format→400. Empty data→valid file.
- **Complexity**: L

### P5-06 | Frontend: Create Reportes Hook + Page
- **Description**: Create `useReportes.ts` React Query hooks. Create `ReportesPage.tsx` with collaborator/area selector, date range picker, report preview table, and export buttons (XLSX/PDF). Export triggers download via blob response. Add to App.tsx and Layout sidebar.
- **Files**: `src/api/queries/useReportes.ts`, `src/app/pages/reportes/ReportesPage.tsx`, `src/app/layout/Layout.tsx`, `src/App.tsx`
- **RFs**: RF-44, RF-45, RF-46
- **Dependencies**: P1-10, P1-11, P5-05
- **AC**: Report page renders with filters. Export buttons trigger file download. Preview table shows data.
- **Complexity**: M

---

## Phase 6: Kanban + Flow Diagram + Polish

### [x] P6-01 | Frontend: Install @dnd-kit Dependencies
- **Description**: Install `@dnd-kit/core` and `@dnd-kit/sortable` in frontend package.json. Verify import works with TypeScript.
- **Files**: `package.json`
- **RFs**: RF-35
- **Dependencies**: None
- **AC**: Packages installed. No TypeScript errors when importing.
- **Complexity**: S

### [x] P6-02 | Frontend: Create KanbanBoard Component
- **Description**: Create `KanbanBoard.tsx` with 4 columns (Pendiente, En Progreso, Completado, Bloqueado) using @dnd-kit DndContext + SortableContext. Each column shows service cards with codigo, titulo, cliente, area badge, progress bar. Drag service between columns→PATCH estado. Optimistic update, then server confirm. Drop on same column→no-op. Empty column→"Sin servicios" dashed placeholder. Area filter dropdown filters visible services.
- **Files**: `src/app/pages/servicios/components/KanbanBoard.tsx`, `src/app/pages/servicios/components/KanbanCard.tsx`, `src/app/pages/servicios/components/KanbanColumn.tsx`
- **RFs**: RF-35
- **Dependencies**: P6-01
- **AC**: 4 columns render. Drag service between columns updates estado. Empty column shows placeholder. Area filter works.
- **Complexity**: L

### [x] P6-03 | Frontend: Add Kanban Tab to ServicioDetail
- **Description**: Enhance ServicioDetail with tab navigation. Create `ServicioDetailTabs.tsx` with tabs: Detalles (existing content), Kanban (KanbanBoard for this service's tasks), Comentarios (CommentsTab), Tiempo (time tracking summary), Flujo (process flow diagram). URL updates to `?tab=kanban`. Default tab from URL or "detalles".
- **Files**: `src/app/pages/servicios/components/ServicioDetailTabs.tsx`, `src/app/pages/servicios/ServicioDetail.tsx`
- **RFs**: RF-32, RF-33, RF-34, RF-35
- **Dependencies**: P6-02, P3-02, P6-05
- **AC**: 5 tabs render. Kanban tab shows task-level kanban. URL updates on tab change.
- **Complexity**: M

### [x] P6-04 | Frontend: Add Drag-Drop Task Reorder
- **Description**: Add drag-and-drop reorder to the task list in ServicioDetail using @dnd-kit/sortable. Users can drag tasks to reorder them. On drop, call `PUT /api/tareas/reordenar` with updated orden. Optimistic update + server confirm. Use dnd-kit SortableContext with vertical list strategy.
- **Files**: `src/app/pages/servicios/ServicioDetail.tsx`
- **RFs**: RF-30
- **Dependencies**: P6-01
- **AC**: Tasks draggable. Drop reorders. API called with correct orden. Optimistic update renders immediately.
- **Complexity**: M

### [x] P6-05 | Frontend: Create Process Flow Diagram Component
- **Description**: Create `ProcessFlow.tsx` component showing linear task flow as connected nodes/steps. Each task is a step node with status indicator (pending=gray, in-progress=blue, completed=green). Arrows connect steps in sort_order. Simple horizontal layout, scrollable. Read-only visualization.
- **Files**: `src/app/pages/servicios/components/ProcessFlow.tsx`
- **RFs**: RF-34
- **Dependencies**: None
- **AC**: Flow diagram renders tasks as connected steps. Status colors correct. Horizontal scroll works for many tasks.
- **Complexity**: S

### [x] P6-06 | Frontend: Add Service "Start" Button + Progress Bar + Blocked Banner
- **Description**: Add "Iniciar" button in ServicioDetail for pendiente→en_progreso transition (calls `PATCH /api/servicios/:id/iniciar`). Add progress bar component showing completed/total tasks with percentage. Add blocked alert banner (red) when servicio.estado=bloqueado, showing bloqueado_motivo and time since blocked. Add ETA display (remaining tasks × avg time).
- **Files**: `src/app/pages/servicios/components/ProgressBar.tsx`, `src/app/pages/servicios/components/BlockedBanner.tsx`, `src/app/pages/servicios/ServicioDetail.tsx`
- **RFs**: RF-28, RF-31, RF-32
- **Dependencies**: None
- **AC**: Start button transitions to en_progreso. Progress bar shows correct %. Blocked banner shows with motivo.
- **Complexity**: M

### [x] P6-07 | Frontend: Create ConfirmDialog Shared Component + Task Inline Edit
- **Description**: Create reusable `ConfirmDialog.tsx` component for delete confirmations. Add inline task edit to ServicioDetail (click task title→edit modal with titulo/descripcion/asignado_a). Wire PUT /api/tareas/:id on save.
- **Files**: `src/app/components/ConfirmDialog.tsx`, `src/app/pages/servicios/ServicioDetail.tsx`
- **RFs**: RF-30
- **Dependencies**: None
- **AC**: Confirm dialog opens on delete. Task edit modal saves changes. Fields pre-populated.
- **Complexity**: M

### [x] P6-08 | Frontend: Add Public Portal Enhancement + Layout Display Links
- **Description**: Enhance public portal (public route) to show full progress %, ETA, service history timeline, rating capability, and export link. Add display mode links in Layout sidebar footer. Ensure display routes bypass auth check (public endpoints).
- **Files**: `src/app/pages/seguimiento/components/ClientPortalEnhanced.tsx`, `src/app/layout/Layout.tsx`, `src/App.tsx`
- **RFs**: RF-42, RF-36, RF-37, RF-38
- **Dependencies**: P5-01, P5-02, P5-03, P5-04
- **AC**: Public portal shows progress, ETA, history. Display links in sidebar footer. Display routes accessible without auth.
- **Complexity**: M
