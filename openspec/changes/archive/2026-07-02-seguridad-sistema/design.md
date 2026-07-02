# Design: Seguridad del Sistema

## Technical Approach

Nuevo módulo backend `seguridad/` con 6 endpoints. Extender auth flow para generar `jti`, trackear sesiones en tabla `sessions`, loguear intentos fallidos en `login_attempts`, y capturar IP. Middleware global verifica sesión no revocada con caché in-memory de 30s. Frontend: página `SeguridadSistema.tsx` con 6 tabs, patrón idéntico a `RendimientoSistema.tsx`. Rate-limiting via `@fastify/rate-limit` configurable.

## Architecture Decisions

| Decisión | Opción | Alternativa | Rationale |
|----------|--------|-------------|-----------|
| Session verification cache | In-memory Map + 30s TTL | Siempre DB | DB overhead en cada request (~5ms/req). 30s de ventana aceptable; si se revoca, el token expira naturalmente y el próximo refresh falla. |
| Export method | Server-side (exceljs/pdfkit) | Client-side | `exceljs` y `pdfkit` ya son dependencias backend. Server-side permite paginación interna y stream sin descargar todo al frontend. |
| Suspicious detection | SQL queries + Node logic | Solo SQL | SQL eficiente para ventanas de tiempo (brute-force: >5 fallos/5min). Node para cross-table (escalada: detectar cambio de rol colaborador→sistema vía usuarios + auditoria). |
| Session revocation | Soft (revoked=true) | DELETE físico | Soft preserva trail forense (quién, cuándo). Permite reactivación futura. Index (revoked, expires_at) mantiene performance. |
| Rate-limiting scope | Global plugin, excluir `/auth/login` | Por ruta | El plugin global es más simple y protege todas las rutas automáticamente. Excluir login porque el rate-limit no debe bloquear autenticación legítima. |

## Data Flow

### Login flow
```
Client → POST /auth/login → controller captura IP (request.ip / x-forwarded-for)
  → auth.service.loginUser() valida credenciales
    → Éxito: crypto.randomUUID() genera jti → INSERT sessions (jti, user_id, ip, user_agent, expires_at)
      → JWT payload incluye { user_id, rol, area_id, jti } → sign → response { token, user }
    → Fracaso: INSERT login_attempts (username_intentado, ip_address, user_agent, exito=false)
      → throw UnauthorizedError
```

### Refresh flow
```
Client → POST /auth/refresh → decode JWT (ignoreExpiration) → extract jti
  → UPDATE sessions SET last_activity=NOW() WHERE token_jti=jti
  → sign nuevo JWT con mismo jti (no regenerar — la sesión es la misma)
  → response { token }
```

### Session middleware
```
Request autenticado → middleware extrae jti de JWT payload
  → cache.get(jti)? → si cache miss: SELECT revoked, expires_at FROM sessions WHERE token_jti=jti
  → cache.set(jti, result, 30s)
  → if revoked=true OR expires_at < NOW() → throw UnauthorizedError
  → else next()
```

### Suspicious detection queries

- **Brute-force**: `SELECT COUNT(*) FROM login_attempts WHERE exito=false AND created_at > NOW() - INTERVAL '5 minutes' AND (username_intentado=$1 OR ip_address=$2) HAVING COUNT(*) > 5`
- **Fuera de horario**: `SELECT * FROM login_attempts WHERE exito=true AND created_at::time NOT BETWEEN '06:00' AND '22:00'`
- **Escalada**: Join `auditoria` (accion=UPDATE, entidad=usuarios) donde detalle contenga cambio de rol a sistema, filtrando usuario_id que antes no tenía ese rol

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/db/migrations/007_seguridad.sql` | Create | Tablas `login_attempts`, `sessions`, ALTER `auditoria` ADD ip_address |
| `backend/src/modules/seguridad/seguridad.controller.ts` | Create | 6 endpoints de seguridad |
| `backend/src/modules/seguridad/seguridad.service.ts` | Create | Lógica: resumen, intentos, sesiones, sospechas, export |
| `backend/src/core/middleware/session.ts` | Create | Middleware verifica revoked con caché 30s |
| `backend/src/modules/auth/auth.controller.ts` | Modify | Capturar IP, insertar login_attempts en fallo, crear session en éxito, update last_activity en refresh |
| `backend/src/modules/auth/auth.service.ts` | Modify | Generar jti via crypto.randomUUID(), devolverlo para el controller |
| `backend/src/core/middleware/auth.ts` | Modify | Agregar verifySession en requireRoles después de jwtVerify |
| `backend/src/app.ts` | Modify | Registrar `seguridadController`, plugin `@fastify/rate-limit` |
| `backend/package.json` | Modify | Agregar `@fastify/rate-limit` |
| `shared/types/index.ts` | Modify | Interfaces `LoginAttempt`, `Session`, `SeguridadResumen`, `ActividadSospechosa` |
| `src/api/client.ts` | Modify | `seguridadApi` con 6 funciones |
| `src/api/queries/useSeguridad.ts` | Create | React Query hooks para cada endpoint |
| `src/app/pages/admin/SeguridadSistema.tsx` | Create | Página con 6 tabs y subcomponentes |
| `src/App.tsx` | Modify | Ruta `/admin/seguridad` con RequireRole(["sistema"]) |
| `src/app/layout/Layout.tsx` | Modify | Nav item "Seguridad" en sección Gestión, solo rol sistema |

## Database Schema

### login_attempts
```sql
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(usuario_id) NULL,
  username_intentado VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  exito BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_username ON login_attempts(username_intentado);
```

### sessions
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES usuarios(usuario_id),
  token_jti TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_jti ON sessions(token_jti);
CREATE INDEX idx_sessions_active ON sessions(revoked, expires_at);
```

### auditoria.ip_address
```sql
ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS auditoria_ip VARCHAR(45) DEFAULT NULL;
```

### TTL / Cleanup
- `login_attempts`: retener 90 días. Job programado (pg_cron o script diario): `DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days'`
- `sessions`: retener expiradas + revocadas por 30 días. Cleanup: `DELETE FROM sessions WHERE (revoked=true OR expires_at < NOW()) AND (revoked_at < NOW() - INTERVAL '30 days' OR (revoked=false AND expires_at < NOW() - INTERVAL '30 days'))`

## API Specification

| Método | Endpoint | Query Params | Response | Auth |
|--------|----------|-------------|----------|------|
| GET | `/api/seguridad/resumen` | — | `{ data: { https, jwt, cors, rls, rate_limit, login_tracking, total_attempts_24h, active_sessions, suspicious_alerts } }` | sistema |
| GET | `/api/seguridad/intentos-fallidos` | page, limit, desde, hasta, username | `{ data: LoginAttempt[], meta: PaginatedMeta }` | sistema |
| GET | `/api/seguridad/sesiones` | page, limit | `{ data: Session[], meta: PaginatedMeta }` | sistema |
| DELETE | `/api/seguridad/sesiones/:id` | — | `{ success: true }` + set revoked=true, revoked_at=now | sistema |
| GET | `/api/seguridad/sospechoso` | page, limit | `{ data: SuspiciousActivity[], meta: PaginatedMeta }` | sistema |
| GET | `/api/seguridad/exportar/:tipo` | desde, hasta, filtro | binary (CSV) con Content-Disposition attachment | sistema |

Tipos de exportación (`:tipo`): `intentos-fallidos`, `sesiones`, `actividad-sospechosa`. CSV generado server-side con `exceljs`.

## Frontend Component Structure

```
SeguridadSistema.tsx
├── Header (gradient blue, "Seguridad del Sistema")
├── SummaryCards (total_attempts_24h, active_sessions, suspicious_alerts)
├── Tabs: Resumen | Intentos Fallidos | Sesiones | Auditoría Sensible | Actividad Sospechosa | Exportar
│
├── ResumenSeguridad — checklist grid con indicadores booleanos + métricas
├── IntentosFallidosTable — tabla paginada, filtros por username+fecha (patrón Auditoria.tsx)
├── SesionesTable — tabla paginada, columna IP/user-agent/última actividad, botón "Revocar" con modal confirmación
├── AuditoriaSensibleTable — tabla paginada, filtra auditoria por acciones: UPDATE rol, STATUS_CHANGE, DELETE (reusa useAuditoria con entidad filter)
├── ActividadSospechosa — cards por regla, expandible, color por severidad (rojo=brute-force, amarillo=fuera-horario, naranja=escalada)
└── ExportarLogs — selects de tipo, rango fecha, botón descarga CSV
```

## Interfaces (shared/types/index.ts additions)

```typescript
export interface LoginAttempt {
  id: number;
  usuario_id: number | null;
  username_intentado: string;
  ip_address: string | null;
  user_agent: string | null;
  exito: boolean;
  created_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token_jti: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  last_activity: string;
  revoked: boolean;
  revoked_at: string | null;
  usuario?: { nombres: string; username: string } | null;
}

export interface SeguridadResumen {
  https: boolean;
  jwt: boolean;
  cors: boolean;
  rls: boolean;
  rate_limit: boolean;
  login_tracking: boolean;
  total_attempts_24h: number;
  active_sessions: number;
  suspicious_alerts: number;
}

export interface SuspiciousActivity {
  id: number;
  tipo: 'brute_force' | 'fuera_horario' | 'escalada';
  severidad: 'alta' | 'media' | 'baja';
  descripcion: string;
  usuario_id: number | null;
  ip_address: string | null;
  created_at: string;
  detalle: Record<string, unknown> | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Typecheck | All new/modified files | `tsc --noEmit` — no hay test infraestructura instalada |
| Manual | Each endpoint | Verificar con curl/Postman: resumen, intentos, sesiones CRUD, export |
| Manual | Login flow | Verificar login exitoso crea session, login fallido registra intento |
| Manual | Session middleware | Revocar sesión → verificar que próximo request de esa sesión sea rechazado |

## Migration / Rollout

1. Backend: instalar `@fastify/rate-limit`, crear módulo `seguridad/`, modificar auth flow, agregar middleware
2. DB: ejecutar `007_seguridad.sql` (login_attempts, sessions, alter auditoria)
3. Frontend: crear página, hooks, ruta, nav item

Rollback: orden inverso. Cada paso es independientemente reversible.

## Open Questions

- [ ] Verificar versión de Node en deploy: `crypto.randomUUID()` requiere Node 19+. Si es inferior, usar `crypto.randomUUID()` de package `uuid` como fallback.
- [ ] Confirmar que `@fastify/rate-limit` es compatible con Fastify v5 (el proyecto usa ^5.8.5).
- [ ] La ruta debería ser `/admin/seguridad` (coherente con `/admin/rendimiento`) o `/seguridad`? Proposal dice `/seguridad`, pero el patrón existente usa `/admin/rendimiento`. Usar `/admin/seguridad`.
