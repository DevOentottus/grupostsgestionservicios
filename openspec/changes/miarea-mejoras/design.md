# Design: MiArea Mejoras

## Technical Approach

Dos features independientes: (1) cambio JSX puro en `MiArea.tsx` para agregar flecha "Ver detalle" a cada card de servicio, copiando el patrón exacto de `Servicios.tsx`; (2) backend completo de notificaciones que resuelve los 404s del frontend — tabla nueva, controller con 5 endpoints, y trigger en evidencias.controller.ts que crea notificaciones al subir evidencia.

No hay cambios en frontend más allá del arrow. El frontend de notificaciones (hooks React Query, Layout, API client) ya existe y está esperando que el backend responda.

## Architecture Decisions

### Decision: Paths de endpoints NOTA: el frontend ya está definido

**Choice**: Usar los paths que el frontend espera, NO los nombres "corregidos".
**Evidence**: El frontend en `src/api/client.ts` ya llama a:
- `PATCH /api/notificaciones/{id}/leer` (no `leida`)
- `PATCH /api/notificaciones/leer-todas` (no `leidas`)
- `GET /api/notificaciones/no-leidas`
- `GET /api/notificaciones` con params `page` y `limit`
- `POST /api/notificaciones/enviar`
**Rationale**: Cambiar los paths del backend para que sean "más correctos" rompería el frontend sin beneficio. El backend debe servilletar al cliente existente.

### Decision: Paginación — page → offset

**Choice**: El frontend envía `page` y `limit`. El backend convierte `page` a `offset = (page - 1) * limit`. Si no se envía `page`, default 1. Si no se envía `limit`, default 20.
**Alternatives considered**: Usar solo offset/limit (rompe frontend). Usar cursor-based (overkill para el volumen actual).
**Rationale**: El frontend ya usa `page`/`limit`. La conversión es trivial y evita cambiar hooks existentes.

### Decision: Trigger de notificación en backend (evidencias.controller.ts), no solo frontend

**Choice**: Agregar la creación de notificaciones en `POST /api/evidencias/upload` del backend, ADEMÁS de la llamada existente en frontend `useEvidencias.ts` para aprobación/rechazo.
**Rationale**: La llamada frontend en `useCambiarEstadoEvidencia` notifica al técnico cuando su evidencia es aprobada o rechazada — eso sigue existiendo y ahora funcionará. Pero la notificación "nueva evidencia subida" al encargado/área debe ocurrir server-side para no depender de que el frontend del subidor haga la llamada (podría tener la ventana cerrada, perder conexión, etc).
**Risk**: Duplicación mínima — los casos son distintos: el trigger backend es "subida de evidencia → avisar al área", el trigger frontend es "cambio de estado → avisar al técnico".

### Decision: requireRoles() sin filtro de roles para notificaciones

**Choice**: Todos los endpoints de notificaciones usan `requireRoles()` (sin args = cualquier rol autenticado: admin, encargado, colaborador).
**Rationale**: Cualquier usuario logueado puede tener notificaciones. El filtro por usuario_id se hace con `request.user.user_id`, no por rol.

### Decision: Enviar como endpoint separado (no admin-only)

**Choice**: `POST /api/notificaciones/enviar` usa `requireRoles()` (cualquier autenticado). Se usa internamente desde el frontend para notificar cambios de estado.
**Rationale**: El frontend ya lo llama desde `useCambiarEstadoEvidencia` con datos del técnico. No necesita restricción de rol extra — la data que se envía es controlada por el frontend y el usuario autenticado no puede enviar notificaciones a otro usuario que no sea relevante para su operación.

## Data Flow

### Feature 1: Ver detalle arrow

```
Usuario ve card en MiArea.tsx
  → Card tiene onClick → navigate(`/servicios/${s.id}`)
  → Card ahora muestra "Ver detalle →" al pie (mismo estilo que Servicios.tsx)
  → Click en card o en el texto navega a la misma ruta
```

### Feature 2: Notificación por subida de evidencia

```
POST /api/evidencias/upload (autenticado)
  │
  ├─ 1. Validar y subir archivo
  ├─ 2. Insertar registro en evidencias
  ├─ 3. [NUEVO] Obtener servicio_id del body
  │          │
  │          ├─ SELECT area_id FROM servicios WHERE servicio_id = ?
  │          ├─ SELECT area_encargado_id FROM areas WHERE area_id = ?
  │          ├─ SELECT colaborador_id FROM areacolaboradores WHERE area_id = ?
  │          │
  │          └─ Union de IDs: [area_encargado_id] + [colaborador_id...]
  │             Filtrar: excluir submitted_by
  │             Para cada usuario_id: INSERT INTO notificaciones (...)
  │
  └─ 4. Devolver evidencia creada
```

### Feature 2: Consulta de notificaciones

```
Frontend useNotificaciones(page=1, limit=20)
  → GET /api/notificaciones?page=1&limit=20
  → Backend: SELECT * FROM notificaciones WHERE usuario_id=$user
    ORDER BY created_at DESC LIMIT 20 OFFSET 0
  → Responde: { data: Notificacion[] }

Frontend useNotificacionesNoLeidas (refetch cada 15s)
  → GET /api/notificaciones/no-leidas
  → Backend: SELECT COUNT(*) FROM notificaciones
    WHERE usuario_id=$user AND leida=false
  → Responde: { data: 3 }

Layout muestra badge con count no-leidas
  → Usuario click → dropdown con últimas N
  → Click en notificación → PATCH /api/notificaciones/:id/leer
  → Click "Marcar todas" → PATCH /api/notificaciones/leer-todas
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/miarea/MiArea.tsx` | Modify | Agregar `ArrowRight` a import de lucide-react, insertar bloque "Ver detalle" después de progress bar en cada card |
| `backend/src/migrations/007-notificaciones.sql` | Create | `CREATE TABLE notificaciones` con columnas, PK, FK, e índice compuesto |
| `backend/src/modules/notificaciones/notificaciones.controller.ts` | Create | Controller con 5 endpoints: listar, no-leidas, marcar leer, marcar todas, enviar |
| `backend/src/modules/evidencias/evidencias.controller.ts` | Modify | Agregar notificación trigger en POST /upload (después de insert, antes de return) |
| `backend/src/app.ts` | Modify | Importar y registrar notificacionesController |

## Interfaces / Contracts

### Tabla: notificaciones

```sql
CREATE TABLE notificaciones (
  notificacion_id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT,
  referencia_id INTEGER,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario_leida_fecha
  ON notificaciones(usuario_id, leida, created_at DESC);
```

### Endpoint Specifications

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| GET | `/api/notificaciones` | requireRoles() | Query: `page` (int, default 1), `limit` (int, default 20) | `{ data: Notificacion[] }` | Filtrado por `usuario_id = request.user.user_id`. Orden DESC por created_at |
| GET | `/api/notificaciones/no-leidas` | requireRoles() | — | `{ data: number }` | COUNT donde usuario_id = user y leida = false |
| PATCH | `/api/notificaciones/:id/leer` | requireRoles() | `{}` (body puede ser vacío) | `{ data: Notificacion }` | Verifica que la notificación pertenezca al user |
| PATCH | `/api/notificaciones/leer-todas` | requireRoles() | `{}` | `{ data: { updated: number } }` | UPDATE todas las no-leídas del user |
| POST | `/api/notificaciones/enviar` | requireRoles() | `{ usuario_id, titulo, mensaje, tipo?, referencia_id? }` | `{ data: Notificacion }` | Crea notificación para usuario específico |

### TypeScript Shape (ya existe en frontend)

```typescript
interface Notificacion {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string | null;
  referencia_id: number | null;
  leida: boolean;
  created_at: string;
}
```

### Notificación Response (backend)

```json
{
  "id": 1,
  "usuario_id": 42,
  "titulo": "Nueva evidencia",
  "mensaje": "Se ha cargado una nueva evidencia en Instalación de router",
  "tipo": "evidencia",
  "referencia_id": 15,
  "leida": false,
  "created_at": "2026-06-29T14:30:00.000Z"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Feature 1 — Arrow | Abrir MiArea, verificar que cada card muestra "Ver detalle →", click navega a /servicios/:id |
| Manual | Feature 2 — Listar | Loguearse, GET /api/notificaciones devuelve lista paginada |
| Manual | Feature 2 — Enviar | POST /api/notificaciones/enviar crea notificación, GET /no-leidas refleja el cambio |
| Manual | Feature 2 — Marcar leída | PATCH /:id/leer cambia leida=true, badge count baja |
| Manual | Feature 2 — Trigger evidencia | Subir evidencia, verificar que encargado+colaboradores del área reciben notificación (excepto el que subió) |
| Manual | Feature 2 — 404s resueltos | Monitorear consola de red, no debe haber 404s a /api/notificaciones/* |

Nota: el proyecto no tiene test runner configurado (solo typecheck via tsc --noEmit). La verificación será manual/postman.

## Migration / Rollout

1. Aplicar `007-notificaciones.sql` en SQL Editor de Supabase (DDL únicamente — CREATE TABLE + INDEX)
2. Desplegar backend con nuevo controller + modificación evidencias + registro en app.ts
3. Desplegar frontend con cambio en MiArea.tsx
4. Verificar que badge de notificaciones en Layout muestre count correcto
5. Verificar que dropdown de notificaciones cargue datos

**Rollback**: revertir cambios en MiArea.tsx (git checkout), comentar registro en app.ts, eliminar archivo notificaciones.controller.ts, revertir cambios en evidencias.controller.ts, dropear tabla con `DROP TABLE IF EXISTS notificaciones`.

## Open Questions

- [ ] Confirmar que `servicios.area_id` es la columna correcta (vs `servicios.servicio_area_id` u otra variante). Verificar con `SELECT column_name FROM information_schema.columns WHERE table_name='servicios' AND column_name LIKE '%area%'`.
- [ ] Confirmar que `areas.area_encargado_id` es la columna correcta para el encargado del área.
- [ ] Confirmar que `areacolaboradores.colaborador_id` apunta a `usuarios.usuario_id` (no a una tabla colaboradores separada).
