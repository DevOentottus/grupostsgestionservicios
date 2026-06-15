# Task Breakdown: Ayuda-contextual-por-rol

## Dependency Graph

```
T-001 (types) ──────────┬─→ T-003 (RolBadge) ──→ T-004 (HelpDrawer) ──→ T-005 (Layout)
                         │                                                ↑
T-002 (HelpButton) ──────┴────────────────────────────────────────────────┘

T-001 (types) ──────────┬─→ T-006 (content Dashboard) ──┬─→ T-007 (MiArea)
                         │                               ├─→ T-008 (Servicios)
                         │                               ├─→ T-009 (Usuarios/Areas)
                         │                               ├─→ T-010 (Plantillas/Reportes)
                         │                               ├─→ T-011 (Comunicaciones/Auditoria/Rendimiento)
                         │                               └─→ T-012 (Manager/Clientes/Desempeno)
                         │
                         └─→ T-013 (index.ts barrel) ←── T-002, T-003, T-004, T-006

T-004 ──→ T-015 (fallback genérico) ←── T-006
T-013, T-005, T-015 ──→ T-016 (typecheck) ──→ T-017 (build)

T-014 (screenshots) → independiente, sin dependencias
```

## Batch 1 — Fundación (5 tareas)

### T-001: Crear help-types.ts con interfaces y tipos ✅
- Tipos: `Rol` union, `HelpStep`, `HelpSection`, `HelpContent`, `HelpRegistry`
- Files: `src/app/help/help-types.ts` (crear)

### T-002: Crear HelpButton.tsx (botón ghost con icono HelpCircle) ✅
- Componente presentacional con tooltip y aria-label
- Files: `src/app/help/HelpButton.tsx` (crear)

### T-003: Crear RolBadge.tsx (badge de rol con colores) ✅
- Colores: sistema=purple, admin=blue, encargado=orange, colaborador=green
- Files: `src/app/help/RolBadge.tsx` (crear)

### T-004: Crear HelpDrawer.tsx (Sheet skeleton) ✅
- Sheet shadcn/ui, side="right", w-[420px], header amarillo, RolBadge, ScrollArea
- Files: `src/app/help/HelpDrawer.tsx` (crear)

### T-005: Modificar Layout.tsx para integrar HelpButton ✅
- HelpButton + HelpDrawer integrados en la topbar
- Files: `src/app/layout/Layout.tsx` (modificar)

## Batch 2 — Contenido (8 tareas)

### T-006: Crear help-content.ts con contenido para Dashboard (admin) ✅
- Registry skeleton con entrada /dashboard → admin (3 secciones)
- Files: `src/app/help/help-content.ts` (crear)

### T-007: Agregar contenido para MiArea (colaborador, encargado) ✅
- 4 secciones total para ambos roles
- Files: `src/app/help/help-content.ts` (modificar)

### T-008: Agregar contenido para Servicios + NuevoServicio + ServicioDetail ✅
- 3 rutas, todos los roles, ~12 secciones
- Files: `src/app/help/help-content.ts` (modificar)

### T-009: Agregar contenido para Usuarios (sistema), Areas (admin, sistema) ✅
- 2 rutas, contenido específico por rol
- Files: `src/app/help/help-content.ts` (modificar)

### T-010: Agregar contenido para Plantillas, Reportes ✅
- 2 rutas, contenido para admin/encargado/colaborador/sistema
- Files: `src/app/help/help-content.ts` (modificar)

### T-011: Agregar contenido para Comunicaciones, Auditoria, Admin/Rendimiento ✅
- 3 rutas, contenido por rol
- Files: `src/app/help/help-content.ts` (modificar)

### T-012: Agregar contenido para Manager/Clientes, Manager/Desempeno ✅
- 2 rutas, contenido para admin/sistema/encargado
- Files: `src/app/help/help-content.ts` (modificar)

### T-013: Crear index.ts con exports públicos ✅
- Barrel file con todos los componentes y tipos
- Files: `src/app/help/index.ts` (crear)

## Batch 3 — Screenshots (1 tarea)

### T-014: Crear carpeta public/help/ y screenshots placeholder ✅
- Carpeta + 12 placeholders + README con instrucciones
- Files: `public/help/` (carpeta), `public/help/*.png` (placeholders)

## Batch 4 — Integración y polish (3 tareas)

### T-015: Agregar fallback genérico para rutas sin mapeo ✅
- Dos niveles: ruta sin rol → "No hay ayuda para tu rol", ruta sin mapeo → "Bienvenido" + enlaces
- TOC con scrollIntoView cuando hay ≥2 secciones
- onError silencioso para screenshots
- Files: `src/app/help/HelpDrawer.tsx` (modificar)

### T-016: Verificar que todos los imports y tipos funcionan ✅
- `npx tsc --noEmit` → 0 errores

### T-017: Verificar que el build de producción compila ✅
- `npm run build` → exitoso

## Resumen de archivos

| Archivo | Acción | Creado por |
|---|---|---|
| `src/app/help/help-types.ts` | Crear | T-001 |
| `src/app/help/HelpButton.tsx` | Crear | T-002 |
| `src/app/help/RolBadge.tsx` | Crear | T-003 |
| `src/app/help/HelpDrawer.tsx` | Crear + modificar | T-004, T-015 |
| `src/app/help/help-content.ts` | Crear + modificar ×6 | T-006 → T-012 |
| `src/app/help/index.ts` | Crear | T-013 |
| `src/app/layout/Layout.tsx` | Modificar | T-005 |
| `public/help/*.png` | Crear (placeholders) | T-014 |

**Total: 17/17 tareas completadas ✅**
