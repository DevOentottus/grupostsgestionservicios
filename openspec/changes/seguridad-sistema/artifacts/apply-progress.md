# Apply Progress: seguridad-sistema

> Estado: En progreso — T-02 completado

---

## T-02 — Configurar limpieza TTL programada ✅

### Creado: `backend/src/scripts/cleanup-seguridad.ts`
- Función exportada `cleanupSeguridad()` que elimina:
  - `login_attempts` con `created_at < now() - 90d` (TTL 90 días)
  - `sessions` con `expires_at < now() - 30d` (TTL 30 días)
- Soporte de ejecución directa (`node dist/scripts/cleanup-seguridad.js`) vía guard `isMain`
- Retorna `{ login_attempts: number, sessions: number }`

### Modificado: `backend/src/app.ts`
- Import de `cleanupSeguridad`
- `setInterval` cada 24h dentro de `buildApp()` que ejecuta el cleanup
- Hook `onClose` limpia el timer con `clearInterval` para graceful shutdown

### Modificado: `backend/src/modules/seguridad/seguridad.controller.ts`
- `POST /api/seguridad/cleanup` agregado, protegido con `requireRoles("sistema")`
- Ejecuta `cleanupSeguridad()` y retorna `{ data: { login_attempts, sessions } }`

---

## Files Changed

| File | Action |
|------|--------|
| `backend/src/scripts/cleanup-seguridad.ts` | Create |
| `backend/src/app.ts` | Modify |
| `backend/src/modules/seguridad/seguridad.controller.ts` | Modify |
| `openspec/changes/seguridad-sistema/tasks.md` | Modify (T-02 marcado ✅) |
