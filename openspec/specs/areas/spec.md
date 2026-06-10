# Areas — Specification

## Purpose
Manage organizational areas: CRUD, manager assignment, collaborator membership, and per-area service views. Covers RF-25 to RF-27.

## Requirements

### RF-25: CRUD Areas with Manager and Collaborators
The system MUST support creating, reading, updating, and deleting areas. Each area SHALL have a name and an assigned manager (encargado). Collaborators SHALL be assignable via a many-to-many relationship (areas_colaboradores).

| Field | Type | Constraints |
|-------|------|-------------|
| nombre | string | Required, unique, max 150 chars |
| encargado_id | integer | FK to usuarios (rol=encargado), nullable |
| activo | boolean | Default true |

#### Scenario: Create area with manager
- GIVEN an authenticated admin user
- WHEN they POST `/api/areas` with `{ nombre: "Reparaciones", encargado_id: 5 }`
- THEN the system creates the area, returns 201 with the area record
- AND the area appears in GET `/api/areas`

#### Scenario: Assign collaborators to area
- GIVEN an existing area with id=2
- WHEN admin PUTs `/api/areas/2/colaboradores` with `{ usuario_ids: [3, 7, 12] }`
- THEN the system replaces the collaborator list, returns 200
- AND GET `/api/areas/2/colaboradores` returns the three users

#### Scenario: Delete area with services fails
- GIVEN an area with assigned servicios
- WHEN admin attempts DELETE `/api/areas/:id`
- THEN the system returns 409 Conflict with message "Area tiene servicios asignados"

### RF-26: Area View with Services
The system SHALL provide an area detail view showing services (in_progress and completed) grouped by status, with task completion percentages.

#### Scenario: View area services
- GIVEN area with 5 servicios (3 en_progreso, 2 completados)
- WHEN a manager GETs `/api/areas/2/servicios`
- THEN the response returns services grouped by `estado`
- AND each service includes task completion percentage

### RF-27: View Assigned Managers
The system MUST allow listing areas with their assigned manager details.

#### Scenario: List areas with managers
- GIVEN 3 areas each with a different encargado
- WHEN any authenticated user GETs `/api/areas`
- THEN each area includes `encargado: { id, nombres, email }`
- AND the response includes the collaborator count per area

#### Scenario: Unassigned area still listed
- GIVEN an area with `encargado_id = null`
- WHEN GET `/api/areas`
- THEN the area is returned with `encargado: null`

## Dependencies
- RF-03: encargado role must exist for manager assignment
- RF-04: usuarios must support DNI/apellidos for collaborator display
