# Auditoría — Specification

## Purpose
Full audit trail capturing all CRUD operations by user, entity, and timestamp. Covers RF-47.

## Requirements

### RF-47: Audit History — Filterable
The system MUST record auditable events automatically via middleware or explicit service hooks. Each event SHALL store: user, action, entity type, entity ID, and a JSON detail blob.

| Field | Type | Constraints |
|-------|------|-------------|
| usuario_id | integer | FK to usuarios, nullable (for system actions) |
| accion | varchar | CREATE, UPDATE, DELETE, LOGIN, STATUS_CHANGE |
| entidad | varchar | servicios, usuarios, tareas, areas, plantillas, etc. |
| entidad_id | integer | ID of the affected record |
| detalle | jsonb | Changed fields (before/after), optional metadata |
| created_at | timestamp | Auto-set, indexed |

#### Scenario: Create service triggers audit
- GIVEN an authenticated user
- WHEN they POST `/api/servicios` to create a new service
- THEN an audit record is created with accion=CREATE, entidad=servicios, detalle containing the new service data

#### Scenario: Update service status triggers audit
- GIVEN a service with estado=pendiente
- WHEN user PATCHes estado to en_progreso
- THEN an audit record captures accion=STATUS_CHANGE, detalle containing `{ before: "pendiente", after: "en_progreso" }`

#### Scenario: Filter audit log by entity and date range
- GIVEN 100 audit records across 3 entities
- WHEN admin GETs `/api/auditoria?entidad=servicios&desde=2026-01-01&hasta=2026-06-01&page=1&limit=20`
- THEN paginated results filtered to servicios within that date range

#### Scenario: Non-admin denied access
- GIVEN a user with rol=colaborador
- WHEN they GET `/api/auditoria`
- THEN the system returns 403 Forbidden (admin only)

#### Scenario: Login attempts
- GIVEN a failed login attempt
- WHEN POST `/api/auth/login` with invalid credentials
- THEN no audit record is created (privacy: failed attempts are not logged)
- BUT successful logins SHALL create an audit record with accion=LOGIN

## Dependencies
- RF-01: Auth must exist for user identification
- RF-03: admin role guard REQUIRED for audit viewing
- All CRUD modules: must emit audit events
