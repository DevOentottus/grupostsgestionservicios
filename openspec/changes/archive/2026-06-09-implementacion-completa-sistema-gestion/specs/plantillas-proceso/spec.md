# Plantillas de Proceso — Specification

## Purpose
Predefined and custom process templates that auto-generate task lists when creating a service. Covers RF-29 and RF-48.

## Requirements

### RF-29: Process Templates (Predefined + Custom)
The system MUST support creating process templates. Each template SHALL contain an ordered list of task templates. When applied to a service, the system SHALL create one tarea per task template.

| Field | Type | Constraints |
|-------|------|-------------|
| nombre | string | Required, max 200 chars |
| descripcion | text | Optional |

Each template has tasks: `{ titulo, descripcion, sort_order, asignado_a (nullable) }`.

#### Scenario: Create template with tasks
- GIVEN an admin user
- WHEN they POST `/api/plantillas` with tasks
- THEN the template is created with ordered tasks, returns 201

#### Scenario: Apply template to service
- GIVEN a template with 5 tasks and a service in `pendiente` state
- WHEN user POSTs `/api/servicios/:id/aplicar-plantilla/:plantilla_id`
- THEN 5 tareas are created for that service, ordered by the template
- AND the response returns 200 with the created tasks

#### Scenario: Template applied to in-progress service
- GIVEN a service already `en_progreso` with tasks
- WHEN user applies a template
- THEN new tasks are APPENDED after existing ones (existing sort_order preserved)

### RF-48: Task Templates — General and Per-Collaborator
Templates MAY specify per-collaborator task assignments. The system SHOULD support documented tasks (tasks with rich description/instructions).

#### Scenario: Template with collaborator assignments
- GIVEN a template where task 3 has `asignado_a: 5`
- WHEN applied to a service
- THEN tarea 3 is marked with `completada_por: null` but stored metadata indicates the intended assignee

#### Scenario: Empty template
- GIVEN a template with 0 tasks
- WHEN applied to a service
- THEN the system returns 200 with empty tasks array (no error)

## Dependencies
- RF-28: Service creation must exist
- RF-30: Task management must support batch creation
