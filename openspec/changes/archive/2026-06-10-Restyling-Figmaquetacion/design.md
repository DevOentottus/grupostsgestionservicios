# Design: Restyling-Figmaquetacion

## Technical Approach

Three-phase rollout: (1) Foundation — install deps, port 48 shadcn/ui components and theme.css; (2) Layout — rewrite Layout.tsx with blue-900 sidebar, white topbar, notification dropdown; (3) Pages — restyle all 13 pages. Zero new backend work. Each phase is a separate PR for clean rollback.

## Architecture Decisions

### Decision: shadcn/ui — copy all 48 components

| Option | Tradeoff |
|--------|----------|
| Copy all 48 | ~200KB, but zero guessing which are needed; Figma pages use ~15 directly plus indirect deps |
| Subset only | Risk of missing transitive deps (e.g., form.tsx imports button, label, sonner) |

**Choice**: Copy all 48. The Figma project's `components/ui/` is a standard shadcn/v0 output — each file is self-contained, imports only from `utils.ts` and `@radix-ui/*`. File size is negligible.

### Decision: Tailwind v4.1.6 (keep STS version)

| Option | Tradeoff |
|--------|----------|
| Bump to 4.1.12 | Breaking risk from TS/CSS behavior changes in minor |
| Keep 4.1.6 | Safe. `@theme inline`, `@layer base`, `tw-animate-css` all work identically |

**Choice**: Keep STS Tailwind v4.1.6. The `@theme inline` block and CSS custom properties in theme.css have no API diff across 4.1.6 → 4.1.12. Only `tw-animate-css` is new.

### Decision: Keep STS react-router-dom classic `<Routes>` API

| Option | Tradeoff |
|--------|----------|
| Switch to `createBrowserRouter` | Would break all existing route structure, require Layout rewrite, break auth guards |
| Keep classic API | No migration risk. Map Figma routes inside existing `<Route>` tree |

**Choice**: Keep classic `<Routes>`. Add new routes (monitor, comunicaciones) inside the existing protected `<Route path="/">` block.

### Decision: Adapt Figma pages to TanStack Query — never use mockData.ts

**Choice**: Every Figma page that imports from `data/mockData.ts` will be rewritten to use the corresponding `@/api/queries/use*.ts` hook. The mockData.ts types serve as reference only.

## CSS/Theming Strategy

```
src/index.css         ← @import "tailwindcss" (keep)
src/styles/theme.css  ← NEW: oklch CSS vars + @theme inline block
src/styles/tailwind.css ← NEW: @import 'tw-animate-css' (included via theme.css)
```

- `theme.css` is a direct copy from Figma, with STS brand text ("ServicioLocal STS" instead of "TechService").
- `@theme inline` maps every `--color-*` var → `var(--*)` CSS custom property.
- `@layer base` provides `border-border`, `bg-background`, `text-foreground` defaults.
- `tw-animate-css` import enables `animate-in`/`animate-out` classes used by shadcn/ui.
- **No preflight conflicts**: Tailwind v4's preflight is mild; shadcn/ui components rely on CSS vars only.

## File Changes

| File | Action |
|------|--------|
| `src/styles/theme.css` | Create (port from Figma) |
| `src/lib/cn.ts` | Create (clsx + tailwind-merge) |
| `src/components/ui/*.tsx` | Create (48 shadcn components) |
| `src/app/layout/Layout.tsx` | Rewrite (blue-900 sidebar) |
| `src/app/layout/Notifications.tsx` | New component |
| `src/index.css` | Modify (add @import for theme.css) |
| `src/pages/login/Login.tsx` | Full replacement |
| `src/pages/seguimiento/Dashboard.tsx` | Visual update, keep tabs |
| `src/pages/usuarios/Usuarios.tsx` | Full replacement |
| `src/pages/areas/Areas.tsx` | Master-detail replacement |
| `src/pages/servicios/Servicios.tsx` | Visual rework + card grid |
| `src/pages/servicios/ServicioDetail.tsx` | Visual update |
| `src/pages/comunicaciones/Comunicaciones.tsx` | New combined page |
| `src/pages/auditoria/Auditoria.tsx` | Visual update |
| `src/pages/reportes/Reportes.tsx` | Visual update |
| `src/pages/monitor/Monitor.tsx` | New page |
| `src/pages/servicios/ServicioPublico.tsx` | Visual enhancement |
| `src/App.tsx` | Add routes for monitor, comunicaciones |
| `package.json` | Add @radix-ui/* deps, tailwind-merge, tw-animate-css |

## Route Mapping

| Figma Route | STS Route | Status |
|-------------|-----------|--------|
| `/login` | `/login` | Keep |
| `/` | `/` | Keep |
| `/dashboard` | `/dashboard` | Keep |
| `/collaborators` | `/usuarios` | Keep |
| `/areas` | `/areas` | Keep |
| `/services` | `/servicios` | Keep |
| `/services/:id` | `/servicios/:id` | Keep |
| `/monitor` | `/monitor` | New |
| `/communications` | `/comunicaciones` | New (combined with solicitudes) |
| `/supervision` | — | Not ported (STS has manager/*) |
| `/reports` | `/reportes` | Keep |
| `/audit` | `/auditoria` | Keep |
| `/client` | `/public/servicio/:codigo` | Keep |

## Role Mapping Layer

Figma uses Spanish role names; STS uses DB values. A `roleDisplayMap` constant handles translation:

```
{ Administrador: "admin", Encargado: "encargado", Colaborador: "colaborador", Cliente: "cliente" }
```

Reversed for display: `{ admin: "Administrador", encargado: "Encargado", ... }`.

## Page Migration Plan

### Login.tsx (full replacement)
- **Source**: `Figma/pages/Login.tsx`
- **Target**: `src/app/pages/login/Login.tsx`
- **Changes**: Replace entire render with Figma's gradient blue-900 background, white card, yellow-400 accents, demo credentials panel. Keep STS `useAuth().login()` instead of Figma's mock login. Keep error handling via try/catch.
- **Deps**: lucide-react (already in STS)

### Dashboard.tsx (visual update)
- **Source**: `Figma/pages/Dashboard.tsx`
- **Target**: `src/app/pages/seguimiento/Dashboard.tsx`
- **Changes**: Replace card styling with Figma's rounded-2xl, shadow-sm, border-gray-100 pattern. Keep existing TanStack query hooks (`useDashboard`), tab navigation, and DateRangeFilter/AreaFilter components. The Figma banner gradient (blue-900 → blue-700) replaces the current simpler header.
- **Deps**: recharts (already in STS)

### Collaborators.tsx → Usuarios (full replacement)
- **Source**: `Figma/pages/Collaborators.tsx`
- **Target**: `src/app/pages/usuarios/Usuarios.tsx`
- **Changes**: Rebuild table + modal using Figma's exact markup and styling. Replace `useState` + mock data with `useUsuarios`, `useCrearUsuario`, `useToggleUsuario` hooks. Map STS `Usuario` type fields to display columns. Keep password management feature.

### Areas.tsx (master-detail replacement)
- **Source**: `Figma/pages/Areas.tsx`
- **Target**: `src/app/pages/areas/Areas.tsx`
- **Changes**: Implement Figma's left-panel area list + right-panel detail view. Keep existing `useAreas`, `useCrearArea`, `useEditarArea`, `useEliminarArea` hooks. Add collaborator assignment panel using `useAsignarColaborador`/`useRemoverColaborador`.

### Services.tsx (visual rework)
- **Source**: `Figma/pages/Services.tsx`
- **Target**: `src/app/pages/servicios/Servicios.tsx`
- **Changes**: Replace card/progress-bar styling with Figma's design. Replace react-dnd (not used in STS) with @dnd-kit for task reordering — already installed. Keep TanStack Query hooks, filter by estado/area, pagination, and wizard form for creation with plantilla integration.

### ServiceDetail.tsx (visual update)
- **Source**: `Figma/pages/ServiceDetail.tsx`
- **Target**: `src/app/pages/servicios/ServicioDetail.tsx`
- **Changes**: Apply Figma's status badges, progress bars, comment thread styling. Keep existing tabs (tareas, kanban, flujo, comentarios), KanbanBoard, ProcessFlow, CommentsTab components.

### Communications.tsx (new combined page)
- **Source**: `Figma/pages/Communications.tsx`
- **Target**: `src/app/pages/comunicaciones/Comunicaciones.tsx` (NEW)
- **Changes**: Create new page at `/comunicaciones` combining announcements + internal requests using TanStack Query (`useAnuncios`, `useSolicitudes`). Figma provides the full tabbed UI (anuncios / solicitudes tabs) and modal forms. Add route to App.tsx.

### Audit.tsx (visual update)
- **Source**: `Figma/pages/Audit.tsx`
- **Target**: `src/app/pages/auditoria/Auditoria.tsx`
- **Changes**: Apply Figma's filter bar styling, badge colors, table pattern. Keep existing `useAuditoria` hook with pagination, entity filter, date range.

### Reports.tsx (visual update)
- **Source**: `Figma/pages/Reports.tsx`
- **Target**: `src/app/pages/reportes/Reportes.tsx`
- **Changes**: Apply Figma's chart card styling, selector design. Keep existing `useReporteColaborador`, `useReporteArea`, `useExportarReporte` hooks. Keep tab navigation between colaborador/area.

### Monitor.tsx (new page)
- **Source**: `Figma/pages/Monitor.tsx`
- **Target**: `src/app/pages/monitor/Monitor.tsx` (NEW)
- **Changes**: Create new page at `/monitor` using TanStack Query (`useServicios`). Fullscreen mode for TV display. Three modes: general, waiting room, work room. Add route to App.tsx.

### ClientView.tsx → ServicioPublico (enhance)
- **Source**: `Figma/pages/ClientView.tsx`
- **Target**: `src/app/pages/servicios/ServicioPublico.tsx`
- **Changes**: Apply Figma's review/rating UI (star rating, feedback forms, service status tracking). Keep existing `useServicioPublico` query. New features: satisfaction survey, progress visualization, printable report.

### Supervision / Business
- **Not ported from Figma**. STS has equivalents: `manager/*` routes for supervision, `/plantillas` for business/templates. Their visual updates are handled by the global theme + Layout change.

## Dependency Installation

```bash
# Core deps for shadcn/ui
npm install tailwind-merge tw-animate-css

# @radix-ui primitives (26 packages — all needed for 48 components)
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toggle-group @radix-ui/react-toggle @radix-ui/react-tooltip

# Already in STS (no install needed)
# class-variance-authority, clsx, lucide-react, recharts, sonner, @dnd-kit/*
```

No changes to `vite.config.ts` — `@tailwindcss/vite` plugin already configured.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock data coupling | High | Per-page audit before coding; replace each `import from mockData` with hook call |
| Role enum mismatch | Medium | Role map constant (`rolDisplay: Record<string,string>`) tested with all 4 roles |
| CSS specificity with new theme | Low | shadcn/ui uses CSS vars, not hardcoded colors; existing BEM-style classes coexist |
| Layout breaks on mobile | Medium | Figma includes responsive patterns (overlay, mobile sidebar toggle); test at 375/768/1024 |
| Figma exports are in Spanish (role names, status labels) | Low | Keep Spanish labels as display text; map to English DB values at API boundary |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Visual | Each page matches Figma mockup | Side-by-side comparison in dev; no automated visual testing |
| Functional | No regressions in CRUD, search, pagination | Manual E2E per page after restyle |
| Build | Zero TypeScript/build errors | `npm run build` + `npm run typecheck` after each phase |

## Open Questions

- [ ] Should `/monitor` be a protected route (admin/encargado) or public? Figma shows it requires auth.
- [ ] Monitor fullscreen mode: should it use Fullscreen API or just a CSS class?
- [ ] The `/comunicaciones` page merges announcements + requests — does it replace or coexist with existing `/solicitudes` and `/anuncios` routes?
- [ ] Figma's Collaborators page has area secondary assignment — does STS backend support `area_secundaria` field?
