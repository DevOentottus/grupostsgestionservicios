# Proposal: Reporte Tecnico Progreso

## Intent

Agregar una linea de tiempo de progreso tecnico en el detalle de servicio donde todos los roles puedan registrar avances, observaciones, cierres e incidencias con evidencia adjunta. Hoy no hay un canal unificado para seguimiento diario — la informacion queda dispersa en comentarios y tareas. Esto centraliza el registro de progreso en una sola linea temporal.

## Scope

### In Scope
- Nueva tabla `servicio_progreso` con fecha, hora, descripcion, tipo, evidencias (JSONB), visibilidad publica
- Backend CRUD: GET list (paginated desc), POST create, DELETE own entry
- Frontend: ProgresoTabContent con formulario + timeline vertical con avatar, timestamp, texto, miniaturas
- Tab "Progreso" en ServicioDetail.tsx (5to tab)
- Tipos compartidos y entrada en cliente API
- Migracion SQL en `backend/src/db/migrations/`

### Out of Scope
- Notificaciones en tiempo real (WebSockets)
- Edicion de entradas existantes (solo crear/borrar)
- Filtros por tipo de progreso
- Exportacion PDF o impresion

## Capabilities

### New Capabilities
- `reporte-tecnico-progreso`: Registro de progreso tecnico por servicio — linea temporal con texto, tipo, evidencias, autor, timestamp. CRUD basico sobre `servicio_progreso`.

### Modified Capabilities
- `frontend/servicio-detail`: Se agrega un 5to tab "Progreso" al layout de tabs existente

## Approach

1. Migration SQL: crear `servicio_progreso` con FK a servicios y usuarios, columna `progreso_evidencias` JSONB para array de `{ url, nombre, tipo }`
2. Backend: nuevo modulo `progreso/` siguiendo patron Fastify plugin + `requireRoles` + `auditLog`. GET lista con orden desc por fecha+hora. POST acepta descripcion + evidencias[]. DELETE verifica ownership (o admin bypass).
3. Frontend: copiar patron de CommentsTab (timeline list + form). Reutilizar upload logic de EvidenciasTab (base64 -> Supabase Storage -> URL). Timeline con avatar de UsuarioAvatar, nombre, diferencia de tiempo, texto, thumbnails.
4. Agregar "Progreso" a `TABS` array en `ServicioDetail.tsx`
5. Actualizar `database.types.ts` y `api/servicios.ts`

## Affected Areas

| Area | Archivo | Impacto |
|------|---------|---------|
| DB | `backend/src/db/migrations/xxxx_create_servicio_progreso.sql` | New |
| Backend | `backend/src/modules/progreso/progreso.controller.ts` | New |
| Backend | `backend/src/modules/progreso/index.ts` | New |
| Backend | `backend/src/app.ts` (register route) | Modified |
| Frontend | `src/app/pages/servicios/ServicioDetail.tsx` | Modified |
| Frontend | `src/app/pages/servicios/ProgresoTabContent.tsx` | New |
| Shared | `shared/types/database.types.ts` | Modified |
| Shared | `shared/api/servicios.ts` | Modified |

## Risks

| Riesgo | Probabilidad | Mitigacion |
|--------|-------------|------------|
| JSONB evidencias crece sin limite | Baja | Validar tamano total en POST (< 10MB) |
| DELETE sin control de ownership | Media | Verificar `usuario_id === user.user_id` excepto admin |
| Fecha/hora servidor vs cliente | Media | Usar `CURRENT_DATE`/`CURRENT_TIME` DB-side, no confiar en cliente |

## Rollback Plan

1. Ejecutar migration reversa: `DROP TABLE IF EXISTS servicio_progreso`
2. Remover registro de ruta en `app.ts`
3. Revertir `ServicioDetail.tsx` (sacar tab "Progreso")
4. Eliminar archivos nuevos (controller, componente, tipos)

## Dependencies

- Ninguna externa. Usa Supabase Storage existente (bucket `evidencia-files`) y esquema `servicios`/`usuarios` ya establecidos.

## Success Criteria

- [ ] POST `/api/servicios/:id/progreso` crea entrada y la retorna con ID
- [ ] GET `/api/servicios/:id/progreso` retorna entradas ordenadas desc por fecha+hora
- [ ] DELETE `/api/progreso/:id` elimina solo si es propio (o admin)
- [ ] Tab "Progreso" visible en ServicioDetail con formulario y timeline funcional
- [ ] Subida de evidencias desde el formulario -> Storage -> preview en timeline
- [ ] `tsc --noEmit` pasa sin errores nuevos
