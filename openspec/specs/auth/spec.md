# Auth — Delta Specification

## Modified Requirements

**Current state**: Login with username/password returning JWT. GET /api/auth/me returns basic user info. No role-based guards on auth routes. No password change endpoint.

**Changes**: Add password change (RF-02), enforce role guards across all routes (RF-03), add area_id to JWT payload.

### RF-02: Admin Can Change Any User's Password
Admin users MUST be able to change another user's password via `PATCH /api/usuarios/:id/password`. The admin's own password MUST be confirmed to authorize the change. Users SHALL change their own password via `PATCH /api/auth/password` (requires current password).

#### Scenario: Admin changes another user's password
- GIVEN admin authenticated, user/5 exists
- WHEN admin PATCHes `/api/usuarios/5/password` with `{ new_password: "nueva123", confirm_admin_password: "admin_pass" }`
- THEN the system verifies admin's password, hashes the new password, updates it, returns 200

#### Scenario: User changes own password
- GIVEN any authenticated user
- WHEN they PATCH `/api/auth/password` with `{ current_password, new_password }`
- THEN the system verifies current_password, updates to new_password hash, returns 200

#### Scenario: Wrong current password
- WHEN user provides incorrect `current_password`
- THEN 401 Unauthorized with "Contraseña actual incorrecta"

#### Scenario: Weak new password rejected
- WHEN `new_password` is less than 6 characters
- THEN 422 Validation Error

#### Scenario: Non-admin cannot change another user's password
- GIVEN a colaborador user
- WHEN they PATCH `/api/usuarios/5/password`
- THEN 403 Forbidden

### RF-03: Role Control (Enforce Across All Modules)
Every protected route SHALL enforce role-based access. Admin has full access. Encargado sees own-area data. Colaborador sees own assigned services/tasks. Unauthorized access SHALL return 403.

#### Scenario: Encargado restricted to own area
- GIVEN encargado of area/3
- WHEN they GET `/api/servicios` with no filters
- THEN only servicios with area_id=3 are returned

#### Scenario: Colaborador sees own tasks only
- GIVEN colaborador with user_id=7
- WHEN they GET `/api/servicios`
- THEN only servicios where they have assigned tasks are returned

#### Scenario: Admin sees everything
- GIVEN an admin user
- WHEN they GET `/api/servicios`
- THEN ALL servicios are returned regardless of area

### RF-01 Enhancement: JWT Includes area_id
The JWT payload SHALL include `area_id` (nullable) for role-based filtering. Login endpoint SHALL fetch and embed the user's area_id.
(Previously: JWT only had user_id and rol)

#### Scenario: Login returns area_id in JWT
- GIVEN an encargado assigned to area/3
- WHEN POST `/api/auth/login`
- THEN the returned JWT contains `{ user_id, rol, area_id: 3 }`

## Dependencies
- RF-04: Usuarios must support area_id field
- RF-25: Areas module must exist for area assignment
