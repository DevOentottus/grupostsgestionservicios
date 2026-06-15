# Proposal: Ayuda-contextual-por-rol

## Intent

Usuarios de ServicioLocalSTS no tienen guía embebida — dependen de admin para preguntas básicas. Cada página requiere conocimiento distinto según rol (sistema/admin/encargado/colaborador). Esto frena autonomía del equipo y sobrecarga a admins. Un drawer de ayuda contextual elimina esa dependencia.

## Scope

### In Scope
- Botón ghost con HelpCircle en topbar (junto a Settings)
- Sheet drawer lateral (side="right") con contenido de ayuda
- Contenido inline TypeScript mapeado por ruta × rol (~13 páginas)
- Badge de rol actual en header del drawer
- ScrollArea para contenido largo
- Fallback genérico para rutas sin contenido específico
- Screenshots del sistema en `/public/help/`

### Out of Scope
- Editor de ayuda en runtime (contenido estático inline)
- Tracking de uso / analytics
- Búsqueda full-text sobre ayuda
- Tour guiado interactivo (onboarding)
- Internacionalización (solo español)

## Capabilities

### New Capabilities
- `help-contextual`: Sistema de ayuda embebida con contenido por ruta + rol, accesible desde drawer lateral en cualquier página autenticada.

### Modified Capabilities
- None — funcionalidad nueva, sin cambios a specs existentes.

## Approach

1. **Data layer**: Objeto tipado `Record<string, Record<Role, HelpSection[]>>` en `src/app/help/help-content.ts`
2. **UI layer**: HelpButton (ghost + HelpCircle) → HelpDrawer (Sheet + ScrollArea) en `src/app/help/`
3. **Resolver**: Hook `use-help-context` que lee ruta actual (`useLocation`) y rol (`userContext`), resuelve contenido
4. **Integration**: Insertar HelpButton en Layout.tsx topbar, junto a Settings
5. **Assets**: Screenshots reales del sistema → `/public/help/`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/help/help-content.ts` | New | Mapa ruta→rol→secciones de contenido |
| `src/app/help/HelpButton.tsx` | New | Botón ghost con HelpCircle, abre Sheet |
| `src/app/help/HelpDrawer.tsx` | New | Sheet side="right" con ScrollArea, badge rol |
| `src/app/help/use-help-context.ts` | New | Resuelve contenido según ruta + rol |
| `src/app/layout/Layout.tsx` | Modified | +HelpButton en topbar |
| `public/help/*.png` | New | Screenshots del sistema |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contenido se desactualiza | Med | Inline TS → easy PR para actualizar |
| Sheet se superpone con sidebar | Low | Sidebar izq, Sheet der — imposible |
| Rendering lento con mucho contenido | Low | Content es módulo estático, sin fetching |

## Rollback Plan

Revert Layout.tsx (sacar HelpButton), eliminar `src/app/help/`. Sin cambios en rutas, store, backend, DB.

## Dependencies

- Sheet shadcn/ui (ya instalado)
- Lucide HelpCircle (ya disponible)
- `useLocation` de react-router-dom (ya disponible)

## Success Criteria

- [ ] Botón visible en toda página autenticada
- [ ] Drawer abre/cierra correctamente
- [ ] Contenido cambia por ruta activa
- [ ] Contenido se filtra por rol del usuario
- [ ] Badge muestra rol correcto
- [ ] Fallback genérico en rutas sin contenido
- [ ] Layout responsive en mobile
- [ ] `npm run typecheck` — 0 errores
