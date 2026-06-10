# Kanban — Specification

## Purpose
Visual kanban board for service management with drag-and-drop status transitions. Covers RF-35. Also supports RF-30 (task drag-and-drop reorder).

## Requirements

### RF-35: Kanban Board
The system SHALL provide a kanban board view with columns for each service status: Pendiente, En Progreso, Completado, Bloqueado. Services SHALL be movable between columns via drag-and-drop. Moving a service SHALL update its estado.

#### Scenario: Move service between columns
- GIVEN a service in "pendiente" column
- WHEN user drags it to "en_progreso" column
- THEN the system PATCHes `/api/servicios/:id/estado` to `en_progreso`
- AND the UI updates optimistically, then confirms from server response

#### Scenario: Kanban filters by area
- GIVEN services across 4 areas
- WHEN user selects "Reparaciones" filter
- THEN only services from that area are shown in the kanban columns

#### Scenario: Task reorder on the board (RF-30 enhanced)
- GIVEN a service with 5 tasks
- WHEN user drags task 5 to position 2
- THEN the system PUTs `/api/tareas/reordenar` with updated orden values
- AND all tasks update their displayed order

#### Scenario: Empty state
- GIVEN no services exist
- WHEN user opens the kanban page
- THEN each column shows "Sin servicios" with dashed border placeholder

#### Scenario: Drop on same column
- GIVEN a service already in "en_progreso"
- WHEN user drops it on the same column
- THEN no API call is made (no-op, state unchanged)

## Dependencies
- RF-28: Service CRUD must exist
- @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
