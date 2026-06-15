# Apply Progress: Ayuda-contextual-por-rol

> Estado: Todos los batches completados ✅

---

## Batch 1 — Foundation ✅

### T-001: Crear help-types.ts ✅
- `Rol` union type: `'sistema' | 'admin' | 'encargado' | 'colaborador'`
- Interfaces: `HelpStep`, `HelpSection`, `HelpContent`, `HelpRegistry`

### T-002: Crear HelpButton.tsx ✅
- Button ghost + HelpCircle icon + Tooltip "Ayuda contextual" + aria-label

### T-003: Crear RolBadge.tsx ✅
- Badge shadcn/ui con colores por rol y labels en español
- sistema=purple, admin=blue, encargado=orange, colaborador=green

### T-004: Crear HelpDrawer.tsx (skeleton) ✅
- Sheet side="right", w-[420px], header amarillo, RolBadge, ScrollArea
- Props: open, onOpenChange

### T-005: Modificar Layout.tsx ✅
- HelpButton entre Settings y UserAvatar en topbar
- HelpDrawer al final del Layout
- Estado local isHelpOpen

---

## Batch 2 — Content ✅

### T-006 → T-012: help-content.ts ✅
- 1170 líneas, 12 rutas, contenido para todos los roles
- Estructura del registry con helper functions:
  - `normalizePath()` — convierte IDs numéricos a /:id
  - `pageExistsInRegistry()` — verifica si una ruta existe
  - `getHelpContent()` — resuelve contenido por ruta+rol

### T-013: index.ts barrel ✅
- Exporta: HelpButton, HelpDrawer, RolBadge, helpRegistry, tipos

---

## Batch 3 — Screenshots ✅

### T-014: public/help/ ✅
- 12 placeholders SVG + README.md con instrucciones

---

## Batch 4 — Integration ✅

### T-015: Fallback + TOC + screenshot handling ✅
- Dos niveles de fallback (sin rol / sin ruta)
- TOC con scrollIntoView
- onError silencioso para screenshots

### T-016: Typecheck ✅
- `npx tsc --noEmit` — 0 errores

### T-017: Build ✅
- `npm run build` — exitoso

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/help/help-types.ts` | Create |
| `src/app/help/HelpButton.tsx` | Create |
| `src/app/help/RolBadge.tsx` | Create |
| `src/app/help/HelpDrawer.tsx` | Create + modify |
| `src/app/help/help-content.ts` | Create |
| `src/app/help/index.ts` | Create |
| `src/app/layout/Layout.tsx` | Modify |
| `public/help/` | Create (12 placeholders) |
