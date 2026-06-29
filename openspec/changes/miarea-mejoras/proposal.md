# Proposal: MiArea Mejoras

## Intent

MiArea cards carecen de indicador visual de navegación, y el sistema de notificaciones lleva meses con frontend completo pero backend ausente — las llamadas a `notificacionesApi.enviar()` fallan silenciosamente con 404. Esto afecta UX de encargados y colaboradores que no reciben alertas cuando se sube evidencia a servicios de su área.

## Scope

### In Scope
- **Ver detalle arrow**: agregar `ArrowRight` + texto "Ver detalle" al pie de cada card de servicio en MiArea (mismo patrón que Servicios.tsx)
- **Tabla notificaciones**: migración SQL `CREATE TABLE notificaciones`
- **Controller notificaciones**: CRUD backend (listar, marcar leída, marcar todas, no-leídas, enviar)
- **Trigger evidencia→notificación**: al subir evidencia (`POST /api/evidencias/upload`), crear notificación a usuarios del área (encargado + colaboradores, excluyendo al que subió)
- **Registro en app.ts**: montar el nuevo módulo

### Out of Scope
- Notificaciones push (existe módulo `push/` separado, no se toca)
- Notificaciones por email/SMS
- Edición/eliminación de notificaciones
- Preferencias de notificación por usuario

## Capabilities

### New Capabilities
- `notificaciones`: sistema de notificaciones interno (backend) — listar, marcar leídas, crear al subir evidencia

### Modified Capabilities
- None — no existing specs change behavior at spec level

## Approach

**Feature 1 (arrow)**: Cambio puramente JSX en `MiArea.tsx`. Agregar `ArrowRight` al import de lucide-react, insertar `<span>Ver detalle <ArrowRight/></span>` dentro del div del card, después del bloque de progreso. Misma estructura que Servicios.tsx L302-307.

**Feature 2 (notificaciones backend)**:
1. Migración `007-notificaciones.sql`: `CREATE TABLE notificaciones (notificacion_id SERIAL PK, usuario_id INT FK→usuarios, titulo TEXT, mensaje TEXT, tipo TEXT, referencia_id INT, leida BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())`
2. `notificaciones.controller.ts`: endpoints `GET /api/notificaciones`, `GET /api/notificaciones/no-leidas`, `PATCH /api/notificaciones/:id/leer`, `PATCH /api/notificaciones/leer-todas`, `POST /api/notificaciones/enviar`
3. En `evidencias.controller.ts` POST /upload: después de insertar evidencia, consultar `servicios.area_id` → `areas.area_encargado_id` + `areacolaboradores.colaborador_id` → insertar notificación por usuario (excluyendo `submitted_by`)
4. Registrar en `app.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/miarea/MiArea.tsx` | Modified | Agregar ArrowRight + "Ver detalle" a cards |
| `backend/src/modules/notificaciones/` | New | Controller + migración |
| `backend/src/modules/evidencias/evidencias.controller.ts` | Modified | Trigger notificación en upload |
| `backend/src/app.ts` | Modified | Registrar notificacionesController |
| `schema` (Supabase) | New | Tabla `notificaciones` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nombre de columnas FK inconsistentes entre tablas | Medium | Verificar con `SELECT column_name FROM information_schema.columns` antes de escribir queries |
| Trigger de notificación aumenta latencia de upload | Low | Las inserciones son ligeras y asíncronas dentro del mismo request; si escala, mover a job queue |

## Rollback Plan

- **Feature 1**: revertir cambios en `MiArea.tsx` (git checkout)
- **Feature 2**: comentar registro en `app.ts` y eliminar migración `007-notificaciones.sql`. La tabla se puede dropear con `DROP TABLE IF EXISTS notificaciones`. Los cambios en `evidencias.controller.ts` se revierten por git.

## Dependencies

- Acceso a SQL Editor de Supabase (o `supabase` CLI) para aplicar migración
- Conocimiento de los FK reales en producción: `servicios.area_id` y `areas.area_encargado_id`

## Success Criteria

- [ ] Cards de MiArea muestran "Ver detalle →" y el click navega a `/servicios/:id`
- [ ] `GET /api/notificaciones` devuelve lista paginada
- [ ] `POST /api/notificaciones/enviar` crea notificación y es visible en frontend
- [ ] Al subir evidencia, los usuarios del área (excepto el que subió) reciben notificación
- [ ] Marcar leída persiste correctamente
- [ ] Los 404s previos en `notificacionesApi.enviar()` desaparecen
