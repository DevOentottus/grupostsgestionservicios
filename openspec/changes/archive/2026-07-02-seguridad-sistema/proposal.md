# Proposal: Seguridad del Sistema — Dashboard y monitoreo para rol sistema

## Intent

El rol `sistema` no tiene visibilidad del estado de seguridad del sistema. No hay registro de intentos fallidos de login, no hay rate limiting, no hay detección de actividad anómala, y no se puede exportar logs de auditoría. Esto es un riesgo operativo y de compliance.

Agregar una sección "Seguridad del Sistema" que cierre estas brechas con 6 tabs funcionales.

## Scope

### In Scope
- DB migration: tabla `login_attempts`, columna `ip_address` en `auditoria`
- Módulo backend `seguridad/` con 6 endpoints (resumen, intentos, sesiones, auditoría sensible, actividad sospechosa, exportación)
- Rate limiting via `@fastify/rate-limit`
- Frontend: página `SeguridadSistema.tsx` con 6 tabs, navegación solo para rol `sistema`
- CSV/PDF export de logs de seguridad
- Detección query-based de actividad sospechosa (fuerza bruta, fuera de horario, escalada)
- DB migration: tabla `sessions` con jti, IP, user-agent, timestamps, revocación
- Auth flow con `jti` (JWT ID) generado vía `crypto.randomUUID()` — sesión creada en login, `last_activity` actualizado en refresh
- Middleware de verificación de sesión no revocada en cada request autenticado
- Endpoints `GET /api/seguridad/sesiones` (activas) y `DELETE /api/seguridad/sesiones/:id` (revocar)
- Frontend: tab "Sesiones" con tabla de sesiones activas y botón "Revocar" por fila

### Out of Scope
- Notificaciones push o alertas por email
- Geolocalización de IPs
- Histórico de login_attempts (tabla nueva, arranca vacía)

## Capabilities

### New Capabilities
- `seguridad-resumen`: Checklist visual del postureo (HTTPS, JWT, CORS, RLS, rate limiting)
- `seguridad-login-attempts`: Tabla paginada de intentos fallidos con IP, usuario, fecha
- `seguridad-sesiones`: Sesiones activas reales con tracking DB (tabla `sessions`), revocación, detalle IP/user-agent
- `seguridad-auditoria-sensible`: Vista filtrada de acciones críticas (cambios de rol, status toggles, eliminaciones)
- `seguridad-actividad-sospechosa`: Reglas query-based: >5 fallos/5min, login fuera 6:00-22:00, escalada directa de privilegios
- `seguridad-exportacion-logs`: Descarga CSV/PDF con filtros y paginación

### Modified Capabilities
- `frontend`/`backend/auth`: Login flow registra intentos fallidos con IP y origen

## Approach

**Backend**: Nuevo módulo `seguridad/` con controller + service. Interceptar `auth.controller.ts` para capturar IP y registrar en `login_attempts`. Agregar `@fastify/rate-limit` como plugin global (excluir `/auth/login` de límites).

**Sessions tracking**: Tabla `sessions` con jti único. `auth.service.ts` genera jti vía `crypto.randomUUID()` en login, crea fila. `/auth/refresh` actualiza `last_activity`. Middleware global verifica `sessions.revoked = false` en cada request autenticado (caché short-TTL para mitigar overhead DB).

**Frontend**: Página `/seguridad` con 6 tabs siguiendo el patrón `RendimientoSistema.tsx`. React Query hooks en `useSeguridad.ts`. Export con `jspdf` + `xlsx`.

**Suspicious detection**: Sin ML — reglas SQL/comparativas sobre la tabla `login_attempts` y `auditoria`. Thresholds configurables vía constantes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| DB schema | New + alter | `login_attempts` table, `sessions` table, `auditoria.ip_address` |
| `backend/src/modules/auth/auth.service.ts` | Modified | Generate jti, create session row on login |
| `backend/src/modules/auth/auth.controller.ts` | Modified | Log failed attempts, capture IP, create session, refresh last_activity |
| `backend/src/middleware/auth.ts` | Modified | Verify session not revoked on each authed request |
| `backend/src/modules/seguridad/` | New | 6-endpoint module |
| `backend/src/app.ts` | Modified | Register routes + rate-limit plugin |
| `shared/types/index.ts` | Modified | Interfaces for new entities |
| `src/api/client.ts` | Modified | New API functions |
| `src/api/queries/useSeguridad.ts` | New | React Query hooks |
| `src/app/pages/admin/SeguridadSistema.tsx` | New | 6-tab page |
| `src/App.tsx` | Modified | Route `/seguridad` |
| `src/app/layout/Layout.tsx` | Modified | Nav item (sistema only) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rate limiting bloquea auth flow | Low | Excluir `/auth/login` del rate-limit |
| Falsos positivos en actividad sospechosa | Med | Thresholds configurables, solo alerta (no bloqueo) |
| Export genera archivos muy grandes | Low | Paginación query, generación async |
| IP column NULL en filas existentes de auditoria | High | Columna nullable, DEFAULT NULL |
| Overhead DB por verificar sesión en cada request | Med | Caché short-TTL (30s), lookup por PK indexado |
| Sesiones huérfanas si usuario cierra browser sin logout | Low | Expiración natural por `expires_at`, cleanup programado |

## Rollback Plan

1. **DB**: `DROP TABLE sessions; DROP TABLE login_attempts; ALTER TABLE auditoria DROP COLUMN ip_address;`
2. **Backend**: Eliminar módulo `seguridad/`, revertir cambios en `auth.controller.ts` y `auth.service.ts` (jti, creación de sesión), desregistrar middleware de verificación de sesión, desregistrar rate-limit plugin
3. **Frontend**: Eliminar ruta, nav item, componente `SeguridadSistema.tsx`, hooks `useSeguridad.ts`, funciones API

Cada paso es independientemente reversible. Orden: backend → DB → frontend.

## Dependencies
- `@fastify/rate-limit` (nueva dep backend)
- `jspdf`, `xlsx` (ya en frontend, verificar disponibilidad)
- `crypto.randomUUID()` (nativo Node 19+, no requiere dep externa — verificar versión de Node en deploy)

## Success Criteria

- [ ] Rol `sistema` ve nav item "Seguridad"; otros roles no lo ven
- [ ] Intento fallido de login aparece en tabla <30s después del evento
- [ ] Cada tab carga datos sin error
- [ ] CSV export descarga archivo válido con header row
- [ ] Rate limiting bloquea >100 req/min (threshold configurable)
- [ ] Actividad sospechosa detecta >5 fallos en 5min como brute-force
