# Servicios — Delta Specification

## Modified Requirements

**Current state**: CRUD servicios with titulo, descripcion, cliente_nombre, cliente_email, estado, codigo. Tasks have crud + complete/reopen + reorder. No area binding, no assigned techs, no blocked state, no delay detection.

**Changes**: Add area_id, assigned techs, bloqueado state, delay/blocked detection (RF-28). Process template application (RF-29, shared with plantillas). Enhanced task management (RF-30). Progress recording (RF-31). Progress visualization (RF-32).

### RF-28: Create Service with Area, Techs, and Start Button
(Previously: Create only had titulo, desc, cliente_nombre, email)

The service creation schema SHALL expand to include:

| Field | Type | Constraints |
|-------|------|-------------|
| area_id | integer | FK to areas, required |
| tecnicos_asignados | integer[] | Array of usuario_ids, optional |
| tiempo_estimado | integer | Minutes, optional |
| Estado permitido | | pendiente, en_progreso, completado, cancelado, **bloqueado** |

A "Start" button on the frontend SHALL transition estado from pendiente → en_progreso and set `fecha_inicio`.

#### Scenario: Create service with area and techs
- GIVEN area/2 exists with 3 collaborators
- WHEN POST `/api/servicios` with `{ area_id: 2, tecnicos_asignados: [5, 7] }`
- THEN the service is created linked to area/2 with assigned techs

#### Scenario: Start button transitions to en_progreso
- GIVEN a service in pendiente state
- WHEN PATCH `/api/servicios/:id/iniciar`
- THEN estado changes to en_progreso, fecha_inicio is set to now

### RF-30: Task Management with Drag & Drop, Edit
(Previously: Tasks could be reordered via PUT /api/tareas/reordenar with orden)

Enhance task reorder to use drag-and-drop on the frontend. Task inline editing (titulo, descripcion, asignado_a) via modal or inline form.

#### Scenario: Drag-and-drop reorder
- GIVEN a service with 4 tasks
- WHEN user drags task 4 to position 1
- THEN the reorder API is called, tasks re-render in new order

### RF-31: Progress Recording
The system SHALL record progress via task completion timestamps and time tracking. Each task completion records who completed it and when. Service progress = completed_tasks / total_tasks * 100.

### RF-32: Progress Visualization
The service detail view SHALL show: progress bar (%), ETA based on remaining estimated time, and metrics (time spent vs estimated). This is a frontend enhancement using available data.

### RF-34: Process Flow Diagrams
The service detail page SHALL optionally display a simple process flow visualization showing task dependency order. This is a frontend enhancement using task sort_order for linear flow.

#### Scenario: Progress bar updates on task completion
- GIVEN a service with 10 tasks, 3 completed
- WHEN user completes task 4
- THEN the progress bar updates to 40% (4/10)
- AND the service detail shows "40% completado · 4 de 10 tareas"

#### Scenario: Blocked service with delay alert
- GIVEN a service in bloqueado state for > 1 hour
- WHEN the service detail loads
- THEN a red alert banner shows "Servicio bloqueado desde HH:mm · Tiempo perdido: Xh Ym"

## Dependencies
- RF-25: Areas module for area_id FK
- RF-48: Template application logic
- RF-33: Comments for blocking reasons
