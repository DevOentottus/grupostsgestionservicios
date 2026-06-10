# Seguimiento — Delta Specification

## Modified Requirements

**Current state**: Time tracking (start/pause/resume/stop), surveys (create/read), public portal (GET by code), dashboard KPIs (8 indicators).

**Changes**: Enhanced client view with history and export (RF-42). Satisfaction by area (RF-19, shared with dashboard-v2). Manager views (RF-39, RF-40, RF-41).

### RF-39: Manager Sees Area Services + Collaborator Progress
Encargado users SHALL see a manager view showing all services in their area with per-collaborator task completion status.

#### Scenario: Manager view shows area services
- GIVEN encargado assigned to area/3
- WHEN GET `/api/manager/mi-area`
- THEN returns all servicios with area_id=3, including: progress %, assigned techs with their individual completion stats

#### Scenario: Manager sees only own area
- GIVEN encargado/5 (area=3), another encargado/6 (area=4)
- WHEN each calls GET `/api/manager/mi-area`
- THEN encargado/5 sees area/3 data, encargado/6 sees area/4 data only

### RF-40: Task Distribution Across Collaborators
The manager view SHALL show how tasks are distributed across collaborators in the area, with counts of pending, in-progress, and completed tasks per person.

#### Scenario: Task distribution endpoint
- GIVEN area/3 with 3 collaborators and 20 tasks
- WHEN GET `/api/manager/distribucion`
- THEN response includes per-collaborator breakdown: `[{ usuario_id, nombres, pendientes: N, completadas: N }]`

### RF-41: Performance Evaluation Per Collaborator
The system SHALL provide a performance view per collaborator showing: tasks completed in period, avg completion time, services worked on, satisfaction ratings received.

#### Scenario: Collaborator performance
- GIVEN usuario/7 completed 15 tasks this month with 3h avg completion
- WHEN GET `/api/manager/desempeno/7?periodo=mensual`
- THEN response includes { tasks_completed, avg_time_min, services_count, avg_rating }

### RF-42: Client Portal Enhanced
(Previously: Client portal only showed service status + task list)

Enhance the public portal (GET `/api/public/servicios/:codigo`) to include: full progress %, ETA, service history timeline, ability to rate, and report export link.

#### Scenario: Client portal shows progress and history
- GIVEN a client accesses their service via code
- WHEN GET `/api/public/servicios/:codigo`
- THEN response includes `{ servicio, tareas, progreso_pct, eta_min, historial: [{ accion, timestamp }] }`

### RF-19: Satisfaction by Area (from dashboard-v2)
GET `/api/dashboard/satisfaccion-areas` SHALL return avg rating grouped by area. This endpoint lives in the seguimiento module.

#### Scenario: Satisfaction per area
- GIVEN 3 areas with survey data
- WHEN GET `/api/dashboard/satisfaccion-areas`
- THEN response includes `[{ area_id, area_nombre, promedio, cantidad_encuestas }]`

## Dependencies
- RF-25: Areas module for area assignment
- RF-03: Role guards for manager endpoints
- RF-04: Users must have DNI/apellidos for display
