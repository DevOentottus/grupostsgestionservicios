# Design: Reporte Técnico PDF

## Technical Approach

Add `GET /api/servicios/:id/reporte-tecnico` handler in `servicios.controller.ts` (existing Fastify controller pattern). Query servicio + tareas + evidencias + comentarios, generate PDF with pdfkit (already in deps), return inline with `Content-Disposition: inline`. Frontend adds a "Reporte Técnico PDF" button in ServicioDetail that calls `window.open()` with Bearer token via query param.

Read-only — no new tables, no migrations.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| **PDF library** | pdfkit (dynamic import) | jspdf, pdfmake | Already in `package.json`, established pattern in `reportes.controller.ts:exportPDF()` |
| **Content-Disposition** | `inline` by default, `attachment` on `?download=true` | Always attachment | Spec requires both modes; `inline` is better UX for browser viewing |
| **Endpoint location** | Add route to `servicios.controller.ts` | New controller file | Follows existing pattern (all servicio-related routes in one file); no new import needed in `app.ts` |
| **Auth token in frontend** | `sessionStorage.getItem("auth_token")` appended as `?token=` query param | Header-based fetch + blob | `window.open()` can't set custom headers; token in query param is the simplest path for direct browser download |
| **Evidence images** | Fetch via `https?` fetch in pdfkit (pass URL) | Base64 embed, skip images | pdfkit `doc.image(url)` supports URLs; try/catch per image with placeholder on failure |

## Data Flow

```
ServicioDetail.tsx                          servicios.controller.ts
   │                                              │
   │ click "Reporte Técnico PDF"                  │
   │ window.open(/api/servicios/${id}/             │
   │   reporte-tecnico?token=${token})            │
   └─────────────────────────────────→            │
                                             requireRoles() — verifica JWT
                                                  │
                                             Query 1: supabase.from("servicios")
                                               .select("*, usuario_colaborador:usuarios!tecnico_principal_id(...)")
                                               .eq("servicio_id", id)
                                                  │
                                             Query 2: supabase.from("tareas")
                                               .select("*, usuario_completador:usuarios!tarea_completado_por(usuario_nombres)")
                                               .eq("servicio_id", id)
                                               .order("tarea_orden")
                                                  │
                                             Query 3: supabase.from("evidencias")
                                               .select("*")
                                               .eq("servicio_id", id)
                                               .neq("estado", "rechazado")
                                                  │
                                             Query 4: supabase.from("serviciocomentarios")
                                               .select("*, usuarios!serviciocomentarios_usuario_id_fkey(usuario_nombres)")
                                               .eq("servicio_id", id)
                                               .order("created_at")
                                                  │
                                             pdfkit genera PDF:
                                               • Header (logo, codigo, nombre, cliente, area, tecnico, fechas)
                                               • Tabla de tareas (nombre, estado, completado por, fecha/hora)
                                               • Por cada tarea con evidencias: miniaturas embebidas
                                               • Sección de comentarios
                                               • Footer con timestamp de generación
                                                  │
                                             reply.header("Content-Type", "application/pdf")
                                             reply.header("Content-Disposition", "inline")
                                             reply.send(pdfBuffer)
                                                  │
                                   ───────────────┘
                                   Browser renderiza PDF
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/modules/servicios/servicios.controller.ts` | Modify | Add route `GET /api/servicios/:id/reporte-tecnico` with report generation logic |
| `src/app/pages/servicios/ServicioDetail.tsx` | Modify | Add button "Reporte Técnico PDF" in action header, call `window.open()` with token |
| `backend/src/app.ts` | No change | No new module import needed — route lives in existing servicios controller |

## API Contract

**Request**: `GET /api/servicios/:id/reporte-tecnico?download=true`
- Auth: Bearer token (JWT) via `Authorization` header OR `?token=` query param
- Params: `download=true` → `Content-Disposition: attachment`; omit → `inline`

**Response**:
- `200`: `Content-Type: application/pdf`, body is raw PDF bytes
- `401`: No auth
- `404`: Servicio not found

**PDF Structure**:
```
Página 1:
  [Logo STS]    "Hoja de Reporte Técnico"
  Código: SRV20260617000000    Fecha: 17/06/2026
  Cliente: Juan Pérez           Área: Soporte Técnico
  Técnico: Carlos López         Estado: En Progreso

  Tareas:
  ┌─────────┬──────────┬──────────────┬──────────────────┐
  │ Nombre  │ Estado   │ Completado   │ Fecha/Hora       │
  ├─────────┼──────────┼──────────────┼──────────────────┤
  │ Revisar │Completado│ Carlos López │ 17/06/2026 14:30 │
  │ Reparar │ Pendiente│ —            │ —                │
  └─────────┴──────────┴──────────────┴──────────────────┘

  Evidencias:
  Tarea "Revisar":
  [img1] [img2]  ← imágenes embebidas o placeholder

  Comentarios:
  Carlos López: "Se encontró falla en fuente de poder"

  ─────────────────────────────────────────
  Generado: 17/06/2026 15:00
```

## Testing Strategy

No test framework exists in the project (see Engram `sdd/ServicioLocalSTS/testing-capabilities`). Manual testing:

| Scenario | Steps | Expected |
|----------|-------|----------|
| Valid PDF generation | Open browser → login → navigate to servicio detail → click "Reporte Técnico PDF" | PDF opens in new tab with all sections |
| Empty servicio | Test with servicio having 0 tareas, 0 evidencias, 0 comentarios | Valid PDF with header+footer, empty task table |
| Download mode | Append `?download=true` to URL | File download dialog with filename `reporte-tecnico-{codigo}.pdf` |
| Unreachable evidence | Delete an evidence image from storage | PDF renders "Imagen no disponible" placeholder, no crash |
| Unauthenticated | Access endpoint without token | 401 response |
| Nonexistent servicio | Access `/api/servicios/99999/reporte-tecnico` | 404 response |

## Open Questions

- [ ] Logo path — ¿dónde está el logo STS en el proyecto? Usar placeholder si no existe.
- [ ] Token en query param expuesto en URL/logs del servidor — ¿preferís un approach con fetch + blob download?
- [ ] Imágenes de evidencia vía URL — ¿todas las URLs de Supabase storage son públicas o requieren signed URLs?
