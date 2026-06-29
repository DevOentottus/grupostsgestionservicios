# Tasks: MiArea Mejoras

## Phase 1: Infrastructure

- [x] 1.1 Create `backend/src/migrations/007-notificaciones.sql` — `CREATE TABLE notificaciones` con PK, FK a usuarios, columnas (titulo, mensaje, tipo, referencia_id, leida, created_at) + índice compuesto (usuario_id, leida, created_at DESC) — *aplicado via supabase_apply_migration*
- [x] 1.2 Create `backend/src/modules/notificaciones/notificaciones.controller.ts` — scaffold del controller con FastifyInstance, import de dependencias (supabase, requireRoles, NotFoundError, ValidationError, z)

## Phase 2: Core Implementation

- [x] 2.1 Implement `GET /api/notificaciones` — listar paginado (page→offset conversion), filtrado por `usuario_id = request.user.user_id`, ORDER BY created_at DESC, devolver `{ data: Notificacion[] }`
- [x] 2.2 Implement `GET /api/notificaciones/no-leidas` — COUNT WHERE usuario_id = user AND leida = false, devolver `{ data: number }`
- [x] 2.3 Implement `PATCH /api/notificaciones/:id/leer` — UPDATE leida=TRUE, verificar que notificación pertenezca al user autenticado (404 si no), devolver `{ data: Notificacion }`
- [x] 2.4 Implement `PATCH /api/notificaciones/leer-todas` — UPDATE todas las no-leídas del user, devolver `{ data: { updated: number } }`
- [x] 2.5 Implement `POST /api/notificaciones/enviar` — Insert notificación con validación Zod (usuario_id, titulo, mensaje requeridos; tipo, referencia_id opcionales), devolver `{ data: Notificacion }` con 201
- [x] 2.6 Register controller in `backend/src/app.ts` — importar `notificacionesController` y agregar `await app.register(notificacionesController)` siguiendo el patrón existente
- [x] 2.7 Add notification trigger in `backend/src/modules/evidencias/evidencias.controller.ts` — en POST /upload, después del auditLog: consultar `servicios.area_id` → `areas.area_encargado_id` + `areacolaboradores.colaborador_id`, combinar IDs, excluir `submitted_by`, INSERT notificación por usuario con título "Nueva evidencia" y tipo "evidencia"
- [x] 2.8 Add "Ver detalle" arrow in `src/app/pages/miarea/MiArea.tsx` — agregar `ArrowRight` al import de lucide-react, insertar bloque `Ver detalle <ArrowRight />` al pie de cada card (después del bloque de progreso, antes del cierre del div), replicando el patrón de Servicios.tsx L302-307

## Phase 3: Verification

- [x] 3.1 Apply `007-notificaciones.sql` migration via Supabase apply_migration tool (or SQL Editor si no hay acceso directo) — *aplicado exitosamente*
- [ ] 3.2 Manual: verificar que cards en MiArea muestran "Ver detalle →" y el click navega a `/servicios/:id`
- [ ] 3.3 Manual: `GET /api/notificaciones` devuelve lista paginada y `GET /api/notificaciones/no-leidas` devuelve count
- [ ] 3.4 Manual: `POST /api/notificaciones/enviar` crea notificación, `PATCH leer-todas` actualiza count, `PATCH /:id/leer` marca individual
- [ ] 3.5 Manual: subir evidencia y verificar que encargado + colaboradores del área reciben notificación (excluyendo al subidor)
- [ ] 3.6 Manual: confirmar que no hay 404s a `/api/notificaciones/*` en consola de red
