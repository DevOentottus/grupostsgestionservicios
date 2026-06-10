# Comentarios — Specification

## Purpose
Internal comments on services and tasks with full history. Covers RF-33.

## Requirements

### RF-33: Internal Comments on Tasks/Services with History
The system MUST support creating, reading, and (optionally) deleting comments on a service or individual task. Each comment SHALL record the author, timestamp, and content. Comments MUST be immutable after creation (no editing) to preserve audit quality.

| Field | Type | Constraints |
|-------|------|-------------|
| servicio_id | integer | FK to servicios, required |
| tarea_id | integer | FK to tareas, nullable |
| usuario_id | integer | FK to usuarios, auto-set from JWT |
| contenido | text | Required, max 2000 chars |

#### Scenario: Add comment to service
- GIVEN an authenticated user viewing servicio/5
- WHEN they POST `/api/servicios/5/comentarios` with `{ contenido: "Cliente llamó para preguntar estado" }`
- THEN a comment is created with author=current user, timestamp=now, servicio_id=5, tarea_id=null

#### Scenario: Add comment to specific task
- GIVEN servicio/5 has tarea/12
- WHEN user POSTs `/api/servicios/5/tareas/12/comentarios`
- THEN the comment is linked to both servicio_id=5 AND tarea_id=12

#### Scenario: List comments chronologically
- GIVEN 8 comments on servicio/5
- WHEN GET `/api/servicios/5/comentarios`
- THEN comments are returned ordered by `created_at ASC`
- AND each comment includes `usuario: { id, nombres }` for display

#### Scenario: Comment on deleted task
- GIVEN a tarea that has been deleted (cascade)
- WHEN attempting to add a comment referencing it
- THEN the system returns 404 (tarea not found)

#### Scenario: Empty content rejected
- WHEN user POSTs a comment with empty or whitespace-only `contenido`
- THEN the system returns 422 Validation Error

## Dependencies
- RF-28: Servicios must exist
- RF-30: Tareas must exist
