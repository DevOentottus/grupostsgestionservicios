# Especificación: Seguridad del Sistema

## Overview

Agregar sección "Seguridad del Sistema" con 6 tabs funcionales, accesible solo al rol `sistema` vía ruta `/admin/seguridad`. Se introducen dos tablas nuevas (`login_attempts`, `sessions`), una columna nueva (`auditoria.ip_address`), rate limiting con `@fastify/rate-limit`, y detección query-based de actividad sospechosa. El flujo de login existente se modifica para registrar intentos fallidos y manejar sesiones con jti.

---

## Functional Requirements

| ID | Nombre | Descripción | Prioridad |
|---|---|---|---|
| FR-001 | Acceso exclusivo sistema | Ruta `/admin/seguridad` solo accesible para rol `sistema`. Otros roles reciben 403 o redirección. | MUST |
| FR-002 | Resumen de seguridad | Checklist visual con 6 indicadores (HTTPS, JWT config, CORS, RLS, rate limiting, registro login fallidos). Estado por indicador: ✅ / ⚠️ / ❌. Última verificación con timestamp. | MUST |
| FR-003 | Tabla de intentos fallidos | Tabla paginada desde `login_attempts`: fecha, hora, username, IP, user-agent, ¿usuario existe? Filtros: fecha desde/hasta, username. Auto-refresh cada 30s. | MUST |
| FR-004 | Sesiones activas | Tabla paginada desde `sessions` (no revocadas, no expiradas): usuario, IP, user-agent, creada, última actividad, expira. Botón "Revocar" por fila con modal de confirmación. | MUST |
| FR-005 | Auditoría sensible | Tabla paginada desde `auditoria` filtrada por acciones críticas: cambios de rol, activar/desactivar usuario, eliminaciones, cambios de contraseña. Columnas: fecha, hora, usuario, acción, detalle, IP. Filtros por fecha y tipo de acción. | MUST |
| FR-006 | Actividad sospechosa | Tarjetas de alerta query-based con severidad: 🔴 Crítica / 🟡 Media / 🔵 Informativa. 4 reglas: fuerza bruta (>5 fallos/5min misma IP/username), fuera de horario (login 22:00-06:00), escalada de privilegios, múltiples IPs (>3 IPs distintas en 1h mismo usuario). | MUST |
| FR-007 | Exportación de logs | Botones Exportar CSV y Exportar PDF. Filtros pre-export: rango fechas, tipo (todos/login_attempts/sesiones/auditoria_sensible). PDF con mismo diseño visual que reportes existentes (header azul, badges, footer). | MUST |
| FR-008 | Registro de intentos fallidos | Login flow existente MUST registrar en `login_attempts` cada intento fallido: username, IP origen, user-agent, timestamp. | MUST |
| FR-009 | Creación de sesión en login | Login exitoso MUST generar jti vía `crypto.randomUUID()`, crear fila en `sessions`, devolver jti en payload del JWT. | MUST |
| FR-010 | Refresh actualiza actividad | `/auth/refresh` MUST actualizar `last_activity` en la sesión correspondiente al jti del token. | MUST |
| FR-011 | Verificación de sesión en cada request | Middleware global MUST verificar `sessions.revoked = false` para el jti del token en cada request autenticado. Caché short-TTL (≤30s) para mitigar overhead. | MUST |
| FR-012 | Rate limiting | `@fastify/rate-limit` MUST configurarse como plugin global con threshold configurable (default 100 req/min). Excluir `/auth/login` del rate-limit. | MUST |
| FR-013 | Limpieza automática (TTL) | Tablas `sessions` y `login_attempts` DEBEN tener limpieza programada: sesiones expiradas (>N días desde `expires_at`) y login_attempts viejos (>M días). N y M configurables vía constantes. | SHOULD |

---

## Non-Functional Requirements

| ID | Nombre | Especificación |
|---|---|---|
| NFR-001 | Paginación | Toda respuesta API de listado debe ser paginable con `page` y `limit` (default 20). Respuesta incluye `total`, `page`, `limit`, `totalPages`. |
| NFR-002 | Consistencia visual | Las tablas y filtros deben seguir el mismo patrón visual que `Auditoria.tsx` y `RendimientoSistema.tsx`: shadcn/ui Table, filter bar, paginación inferior. |
| NFR-003 | Sesión overhead | Middleware de verificación de sesión no debe agregar >5ms por request en promedio. Caché en memoria con TTL 30s, invalidación al revocar. |
| NFR-004 | Auto-refresh | Tab de intentos fallidos debe auto-refrescar cada 30s sin duplicar datos ni scroll reset. |
| NFR-005 | Export performance | Exportaciones CSV/PDF deben usar paginación query-side para evitar OOM con datasets grandes. |

---

## Spec por Tab

### Tab 1: Resumen de Seguridad (`seguridad-resumen`)

Indicadores consultados via `GET /api/seguridad/resumen`. El backend evalúa cada indicador contra la configuración actual del sistema:

| Indicador | Fuente | Criterio ✅ |
|---|---|---|
| HTTPS | `config.https` o detección de SSL | Habilitado en producción |
| JWT Config | Variables de entorno JWT | Secret definido, algoritmo RS256 o HS256 |
| CORS | `config.cors` | Orígenes definidos, no `*` en producción |
| RLS | Consulta a Supabase `pg_tables` | RLS habilitado en tablas principales |
| Rate Limiting | Plugin registrado en Fastify | Plugin activo con threshold > 0 |
| Registro Login Fallidos | Tabla `login_attempts` existe | Tabla existe con columnas esperadas |

### Tab 2: Intentos de Login Fallidos (`seguridad-login-attempts`)

Endpoint: `GET /api/seguridad/intentos?page=&limit=&desde=&hasta=&username=`

Columnas: `id`, `username`, `ip_address`, `user_agent`, `created_at`, `usuario_existe` (boolean derivado de lookup en tabla `usuarios`).

Auto-refresh: hook `useSeguridad` con `refetchInterval: 30000`.

### Tab 3: Sesiones Activas (`seguridad-sesiones`)

Endpoint: `GET /api/seguridad/sesiones?page=&limit=`

Columnas: `id`, `usuario` (join con `usuarios`), `ip_address`, `user_agent`, `created_at`, `last_activity`, `expires_at`.

Revocación: `DELETE /api/seguridad/sesiones/:id` → set `revoked = true`, `revoked_at = now()`, invalidar caché.

Modal confirmación: "¿Está seguro que desea revocar esta sesión? El usuario será desconectado."

### Tab 4: Auditoría de Accesos Sensibles (`seguridad-auditoria-sensible`)

Endpoint: `GET /api/seguridad/auditoria-sensible?page=&limit=&desde=&hasta=&accion=`

Filtro WHERE: `accion IN ('cambio_rol', 'usuario_activar', 'usuario_desactivar', 'usuario_eliminar', 'cambio_password')`.

Columnas: `fecha`, `hora`, `usuario` (join `usuarios`), `accion`, `detalle`, `ip_address`.

### Tab 5: Actividad Sospechosa (`seguridad-actividad-sospechosa`)

Endpoint: `GET /api/seguridad/sospechosa`

4 reglas query-based evaluadas en cada request (sin persistencia, sin ML):

| Regla | Consulta | Severidad |
|---|---|---|
| Fuerza bruta | `COUNT(*) FROM login_attempts WHERE (ip_address = :ip OR username = :username) AND created_at > NOW() - INTERVAL '5 minutes'` HAVING count > 5 | 🔴 Crítica |
| Fuera de horario | Login exitoso (de `auditoria` o `sessions`) con `created_at` BETWEEN '22:00' AND '06:00' | 🟡 Media |
| Escalada privilegios | `auditoria` WHERE `accion = 'cambio_rol'` y el nuevo rol es superior al anterior (colaborador→admin, etc.) | 🔴 Crítica |
| Múltiples IPs | `SELECT COUNT(DISTINCT ip_address) FROM sessions WHERE user_id = :uid AND created_at > NOW() - INTERVAL '1 hour'` HAVING count > 3 | 🟡 Media |

Cada alerta incluye: `timestamp`, `descripcion` (texto legible), `severidad` (critica/media/informativa), `datos` (objeto JSON con valores relevantes).

### Tab 6: Exportación de Logs (`seguridad-exportacion-logs`)

Endpoint: `GET /api/seguridad/exportar?formato=csv|pdf&desde=&hasta=&tipo=todos|login_attempts|sesiones|auditoria_sensible`

CSV: `Content-Type: text/csv`, filename `seguridad_{tipo}_{fecha}.csv`, header row con nombres de columna, paginación query-side (streaming si el volumen lo justifica).

PDF: Mismo diseño que reportes existentes: header azul (blue-900) con título, tabla con bordes, badges de estado coloreados, footer con fecha de exportación.

---

## Data Requirements

### Tabla: `login_attempts`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | `serial` PRIMARY KEY | Auto-increment |
| `username` | `varchar(100)` | NOT NULL |
| `ip_address` | `varchar(45)` | NOT NULL (soporta IPv6) |
| `user_agent` | `text` | NULLABLE |
| `usuario_existe` | `boolean` | NOT NULL DEFAULT false |
| `created_at` | `timestamptz` | NOT NULL DEFAULT NOW() |

Índice: `(ip_address, created_at)`, `(username, created_at)`, `(created_at)` para TTL cleanup.

### Tabla: `sessions`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | `serial` PRIMARY KEY | Auto-increment |
| `jti` | `uuid` | UNIQUE NOT NULL |
| `user_id` | `integer` | NOT NULL, FK → `usuarios.id` ON DELETE CASCADE |
| `ip_address` | `varchar(45)` | NULLABLE |
| `user_agent` | `text` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL DEFAULT NOW() |
| `last_activity` | `timestamptz` | NOT NULL DEFAULT NOW() |
| `expires_at` | `timestamptz` | NOT NULL |
| `revoked` | `boolean` | NOT NULL DEFAULT false |
| `revoked_at` | `timestamptz` | NULLABLE |

Índices: `(jti)`, `(user_id, revoked)`, `(expires_at)` para TTL, `(revoked)`.

### Modificación: `auditoria`

| Columna | Cambio |
|---|---|
| `ip_address` | ADD COLUMN `varchar(45)` NULLABLE DEFAULT NULL |

---

## Escenarios Clave

### Resumen de Seguridad

- **GIVEN** un usuario con rol `sistema` en `/admin/seguridad`
- **WHEN** carga el tab Resumen
- **THEN** se muestran 6 indicadores con estado ✅/⚠️/❌ y timestamp de última verificación

- **GIVEN** el servidor no tiene HTTPS habilitado
- **WHEN** el backend evalúa el indicador HTTPS
- **THEN** el estado es ❌ "No configurado"

### Registro de Intento Fallido

- **GIVEN** un usuario ingresa credenciales inválidas en `/auth/login`
- **WHEN** el backend rechaza la autenticación
- **THEN** se inserta una fila en `login_attempts` con username, IP, user-agent, `usuario_existe = false`
- **AND** la tabla `seguridad-login-attempts` muestra el intento en <30s

- **GIVEN** un usuario existente ingresa contraseña incorrecta
- **WHEN** el backend rechaza el login por contraseña inválida
- **THEN** `login_attempts.usuario_existe = true`

### Creación y Verificación de Sesión

- **GIVEN** un login exitoso
- **WHEN** el backend genera el JWT
- **THEN** el payload incluye `jti` (UUID v4)
- **AND** se inserta una fila en `sessions` con `revoked = false`
- **AND** cada request autenticado verifica que `sessions.revoked = false` para ese jti

### Revocación de Sesión

- **GIVEN** una sesión activa en la tabla
- **WHEN** el usuario sistema hace clic en "Revocar" y confirma el modal
- **THEN** `sessions.revoked = true`, `revoked_at = NOW()`
- **AND** el próximo request del usuario revocado recibe 401
- **AND** la tabla de sesiones activas ya no muestra esa sesión

### Detección de Fuerza Bruta

- **GIVEN** 6 intentos fallidos de login desde la misma IP en 3 minutos
- **WHEN** se consulta `GET /api/seguridad/sospechosa`
- **THEN** aparece una alerta 🔴 Crítica con descripción "Posible ataque de fuerza bruta desde {IP}: 6 intentos fallidos en 3 minutos"

### Exportación CSV

- **GIVEN** el tab Exportación con filtros aplicados (desde: 2026-06-01, tipo: login_attempts)
- **WHEN** el usuario hace clic en "Exportar CSV"
- **THEN** se descarga un archivo `seguridad_login_attempts_2026-07-01.csv`
- **AND** el archivo tiene header row y datos paginados

### Acceso No Autorizado

- **GIVEN** un usuario con rol `admin` autenticado
- **WHEN** navega a `/admin/seguridad`
- **THEN** recibe 403 o redirección a `/dashboard`
- **AND** el nav item "Seguridad" no es visible en el sidebar

---

## Acceptance Criteria

| FR | Criterio |
|---|---|
| FR-001 | Rol `sistema` ve nav item y ruta. Roles `admin`, `encargado`, `colaborador` no ven nav item ni acceden. |
| FR-002 | 6 indicadores renderizados. Cada uno con su estado. Timestamp visible y actualizado. |
| FR-003 | Tabla paginada con filtros. Auto-refresh cada 30s. Datos corresponden a `login_attempts`. |
| FR-004 | Solo sesiones activas (no revocadas, no expiradas). Botón Revocar con confirmación. Sesión revocada no aparece más. |
| FR-005 | Solo acciones sensibles. Filtros funcionan. Columna IP muestra datos cuando disponible. |
| FR-006 | 4 reglas implementadas. Severidades correctas. Datos relevantes visibles en cada alerta. |
| FR-007 | CSV descarga archivo válido. PDF tiene header azul y mismo diseño que reportes. |
| FR-008 | Cada intento fallido queda registrado en <1s. IP y user-agent capturados. |
| FR-009 | Login exitoso crea sesión con jti UUID v4. |
| FR-010 | Refresh actualiza `last_activity`. Sesión sin refrescar por >N tiempo expira naturalmente. |
| FR-011 | Request con token de sesión revocada → 401. Request con token válido → pasa. Caché no retorna stale >30s. |
| FR-012 | >100 req/min desde misma IP → 429. `/auth/login` no afectado. |
| FR-013 | Registros anteriores al TTL configurado son eliminados automáticamente. |
