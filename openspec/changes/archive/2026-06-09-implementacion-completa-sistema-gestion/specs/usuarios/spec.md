# Usuarios — Delta Specification

## Modified Requirements

**Current state**: POST /api/usuarios requires username, password, nombres, email, rol. GET returns { id, username, nombres, email, rol, activo }. No DNI, apellidos, telefono.

**Changes**: Add DNI, apellidos, telefono fields (RF-04). Auto-generate username from nombres/apellidos (RF-05). Full edit support (RF-06 already partially done).

### RF-04: Register Users with DNI, Nombres, Apellidos, Teléfono, Correo, Rol
(Previously: Registration only required username, password, nombres, email, rol)

The user registration schema SHALL expand to include:

| Field | Type | Constraints |
|-------|------|-------------|
| dni | varchar(20) | Required, unique |
| nombres | varchar(150) | Required |
| apellidos | varchar(150) | Required |
| telefono | varchar(20) | Optional |
| email | varchar(150) | Required, unique |
| rol | enum | admin, encargado, colaborador |

#### Scenario: Register with complete data
- GIVEN an admin user
- WHEN POST `/api/usuarios` with `{ dni, nombres, apellidos, telefono, email, rol }`
- THEN user is created with all fields, 201 returned

#### Scenario: Duplicate DNI rejected
- WHEN POST with DNI that already exists
- THEN 409 Conflict

### RF-05: Auto-Generate Username from Nombres/Apellidos
The system SHALL auto-generate username from nombres/apellidos when creating a user. Format: `{primer_nombre}.{primer_apellido}` lowercase, no spaces. If taken, append sequential number: `{base}.2`, `{base}.3`, etc. The `username` field SHALL be removed from the creation request body.

#### Scenario: Auto-username from names
- GIVEN "Juan Carlos" and "Pérez García"
- WHEN creating a user
- THEN username = "juan.perez"
- AND the response includes the generated username

#### Scenario: Auto-username handles duplicates
- GIVEN "juan.perez" already exists
- WHEN creating another "Juan Pérez"
- THEN username = "juan.perez.2"

### RF-06 Enhancement: Edit Users with New Fields
(Previously: PUT only allowed nombres, email, rol)

The PUT `/api/usuarios/:id` endpoint SHALL accept all new fields (dni, apellidos, telefono). Activate/deactivate (PATCH estado) remains unchanged.

#### Scenario: Edit user with new fields
- GIVEN an existing user
- WHEN admin PUTs with updated apellidos and telefono
- THEN the user record is updated, 200 returned

## Dependencies
- RF-02: Password change for admin reset
- RF-03: Role enforcement for admin-only create/edit
