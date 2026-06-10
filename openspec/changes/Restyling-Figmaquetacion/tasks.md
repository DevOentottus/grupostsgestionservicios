# Tasks: Restyling-Figmaquetacion

> Generated from: Specs (`spec.md`) + Design (`design.md`)
> Total: 21 tasks | 3 Large / 11 Medium / 7 Small

---

## Batch 1 — Foundation (T-001 to T-005)

> Sequential within batch. Batch 1 is prerequisite for all subsequent batches.

---

### T-001: Install npm dependencies

| Field | Value |
|---|---|
| **Description** | Install 26 `@radix-ui/*` packages + `tailwind-merge` + `tw-animate-css`. Add to `package.json` dependencies and run `npm install`. |
| **Files** | `package.json` (edit) |
| **Effort** | Small |
| **Dependencies** | None |
| **Acceptance Criteria** | `npm ls` shows all packages resolved. `npm run build` succeeds. Existing deps (`clsx`, `class-variance-authority`, `lucide-react`, `@dnd-kit/*`) unchanged. |

**Packages**:
```
@radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio
@radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible
@radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu
@radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar
@radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress
@radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select
@radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot
@radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toggle-group
@radix-ui/react-toggle @radix-ui/react-tooltip tailwind-merge tw-animate-css
```

---

### T-002: Create cn() utility

| Field | Value |
|---|---|
| **Description** | Create `src/lib/utils.ts` with `cn()` using `clsx` + `tailwind-merge`. Same pattern as Figma's `utils.ts`. |
| **Files** | `src/lib/utils.ts` (create) |
| **Effort** | Small |
| **Dependencies** | T-001 |
| **Acceptance Criteria** | `cn("px-4", "px-6")` → `"px-6"`. `cn("text-red-500", "text-blue-500")` → `"text-blue-500"`. Importable as `@/lib/utils`. |

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### T-003: Copy all 48 shadcn/ui components from Figma to STS

| Field | Value |
|---|---|
| **Description** | Copy all `.tsx` files from `Figmaquetación/src/app/components/ui/` to `STS/src/app/components/ui/`. Update imports: `"./utils"` → `"@/lib/utils"`. Keep all components — Figma pages use ~15 directly plus transitive deps. |
| **Files** | `src/app/components/ui/*.tsx` (48 files, create) |
| **Effort** | Medium |
| **Dependencies** | T-002 |
| **Acceptance Criteria** | All 48 components compile. `npm run typecheck` passes. Key components (Button, Card, Dialog, Input, Badge, Tabs, Select, DropdownMenu, Sheet, Tooltip, Popover, Avatar) importable and renderable. |

**Full list**: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip, use-mobile, utils

---

### T-004: Create/port theme.css with STS brand colors

| Field | Value |
|---|---|
| **Description** | Create `src/styles/theme.css` from Figma's theme.css. Customize: `--sidebar`→`#1e3a5f` (blue-900), `--sidebar-foreground`→white, `--accent`→`#facc15` (yellow-400). Keep oklch values for rest. Keep `@theme inline` block + `@layer base`. Add `@import 'tw-animate-css'`. |
| **Files** | `src/styles/theme.css` (create) |
| **Effort** | Small |
| **Dependencies** | T-001 |
| **Acceptance Criteria** | `bg-sidebar`→`#1e3a5f`. `text-accent`→`#facc15`. `@theme inline` maps all `--color-*` to `var(--*)`. `animate-in`/`animate-out` classes work via `tw-animate-css`. Build succeeds. |

---

### T-005: Update index.css with imports

| Field | Value |
|---|---|
| **Description** | Modify `src/index.css`: add `@import "./styles/theme.css"` after `@import "tailwindcss"`. |
| **Files** | `src/index.css` (edit) |
| **Effort** | Small |
| **Dependencies** | T-004 |
| **Acceptance Criteria** | Dev server renders blue-900 sidebar colors. CSS vars resolve. No flash of unstyled content. `npm run build` succeeds. |

---

## Batch 2 — Layout (T-006 to T-008)

> Batch 1 → T-006 → T-007 → T-008

---

### T-006: Create NotificationsDropdown component

| Field | Value |
|---|---|
| **Description** | Create `src/app/layout/NotificationsDropdown.tsx`. Bell icon button → Popover with notification items (icon, message, timestamp). Mark-as-read + "Ver todas" link. Uses `useAuth()`. |
| **Files** | `src/app/layout/NotificationsDropdown.tsx` (create) |
| **Effort** | Small |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | Bell icon renders. Click opens popover with 3-5 notifications. Different types (info/warning/success). "Ver todas" link. Closes on click outside. |

---

### T-007: Rewrite Layout.tsx with Figma visual

| Field | Value |
|---|---|
| **Description** | Full rewrite of `src/app/layout/Layout.tsx`. **Sidebar**: blue-900, 280px, brand logo, nav sections (Principal/Gestión/Pantallas), yellow-400 active accent. **Topbar**: white, Bell icon → NotificationsDropdown, user avatar (shadcn Avatar with initials) → dropdown with name/role/logout. **Mobile**: hamburger menu, sidebar overlay slide-in <768px. Preserve: `useAuth()`, `sistema` role bypass, all nav items, role guards. |
| **Files** | `src/app/layout/Layout.tsx` (rewrite) |
| **Effort** | Large |
| **Dependencies** | T-003, T-006 |
| **Acceptance Criteria** | All 5 RF-LAYOUT scenarios pass: sidebar blue-900 with sections, yellow accent on active, topbar with bell+avatar, mobile responsive with hamburger overlay, `sistema` sees all items. All nav links + role guards preserved. Build succeeds. |

---

### T-008: Verify all routes render inside new layout

| Field | Value |
|---|---|
| **Description** | Manual verification: navigate every route in App.tsx. Confirm `<Outlet />` positioning, auth guards, and layout structure for each page. No code changes unless an issue is found. |
| **Files** | None (verification only) |
| **Effort** | Small |
| **Dependencies** | T-007 |
| **Acceptance Criteria** | `/dashboard`, `/servicios`, `/servicios/:id`, `/areas`, `/areas/:id/servicios`, `/plantillas`, `/reportes`, `/solicitudes`, `/anuncios`, `/usuarios`, `/auditoria`, `/manager/*` all render inside layout. `/login`, `/display/*`, `/public/servicio/*` render outside layout. |

---

## Batch 3 — High Impact Pages (T-009 to T-013)

> Parallel after T-003. All need real API hooks, not mock data.

---

### T-009: Login page replacement (two-panel Figma design)

| Field | Value |
|---|---|
| **Description** | Replace login with Figma's two-panel layout. Left: gradient blue-900→slate-800, brand, system stats. Right: form with show/hide password, yellow-400 button, demo hint, error state. Keep `useAuth().login()`, loading, error handling. |
| **Source** | `Figma/src/app/pages/Login.tsx` → Adapt mock login to real `useAuth()` |
| **Files** | `src/app/pages/login/Login.tsx` (rewrite) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 4 RF-LOGIN scenarios pass. Two-panel renders. Real auth call. Error display. Loading state. Demo hint visible. Already-authenticated redirect. |

---

### T-010: Usuarios/Collaborators page full replacement

| Field | Value |
|---|---|
| **Description** | Replace usuarios table with Figma's styled version. Search bar, role filter, modal CRUD (shadcn Dialog), role map (Administrador→admin), area checkboxes for encargado, toggle active with AlertDialog confirmation, server pagination. |
| **Source** | `Figma/src/app/pages/Collaborators.tsx` → Replace mockData with `useUsuarios`, `useCrearUsuario`, `useToggleUsuario` |
| **Files** | `src/app/pages/usuarios/Usuarios.tsx` (rewrite) |
| **Effort** | Large |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 5 RF-USUARIOS scenarios pass. Search+filter works. Create/edit modal. Area checkboxes for encargado. Toggle active with confirmation. Role display: `admin`→"Administrador", `encargado`→"Encargado", `colaborador`→"Colaborador". All via real hooks. |

---

### T-011: Servicios card grid + 3-step wizard + @dnd-kit

| Field | Value |
|---|---|
| **Description** | Rewrite to Figma card grid layout. Responsive grid (1/2/3 cols). Status filter buttons (Todos/Pendiente/En Progreso/Completado/Bloqueado). 3-step wizard modal (Step1: info, Step2: area+template, Step3: summary). Keep @dnd-kit for task reordering (NOT react-dnd). Status mapping. |
| **Source** | `Figma/src/app/pages/Services.tsx` → Replace mockData with `useServicios`, `useCrearServicio`, `useAreas`, `usePlantillas` |
| **Files** | `src/app/pages/servicios/Servicios.tsx` (rewrite) |
| **Effort** | Large |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 4 RF-SERVICIOS scenarios pass. Card grid responsive. Status filter buttons with yellow accent. 3-step wizard creates service via API. Status mapping: `pendiente`→"Pendiente", `en_progreso`→"En Progreso", `completado`→"Completado", `bloqueado`→"Bloqueado". |

---

### T-012: Areas master-detail replacement

| Field | Value |
|---|---|
| **Description** | Rewrite to Figma master-detail layout. Left panel (40%): area list. Right panel (60%): detail with stats, colaborador list, add/remove. Modal for create/edit. Mobile: detail replaces list with back button. |
| **Source** | `Figma/src/app/pages/Areas.tsx` → Replace mockData with `useAreas`, `useCrearArea`, `useEditarArea`, `useEliminarArea`, `useAsignarColaborador`, `useRemoverColaborador` |
| **Files** | `src/app/pages/areas/Areas.tsx` (rewrite) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 4 RF-AREAS scenarios pass. Split layout renders. Detail panel shows stats. Colaborador add/remove works. Create/edit modal. Delete with confirmation. Mobile responsive. |

---

### T-013: Comunicaciones unified page (new)

| Field | Value |
|---|---|
| **Description** | New page at `/comunicaciones`. Three tabs (Anuncios/Solicitudes/Instrucciones). Anuncios: styled cards with priority icons, admin CRUD. Solicitudes: list with type icons, creation form. Legacy routes (`/anuncios`, `/solicitudes`) redirect or coexist. Keep `useAnuncios`, `useSolicitudes`. Add route in App.tsx + nav item in Layout. |
| **Source** | `Figma/src/app/pages/Communications.tsx` → Replace mockData with `useAnuncios`, `useSolicitudes` |
| **Files** | `src/app/pages/comunicaciones/Comunicaciones.tsx` (create), `src/App.tsx` (edit), `src/app/layout/Layout.tsx` (edit - nav) |
| **Effort** | Medium |
| **Dependencies** | T-003, T-007 |
| **Acceptance Criteria** | All 4 RF-COMUNICACIONES scenarios pass. Three tabs render. Anuncios CRUD works. Solicitudes list + creation works. Legacy routes handled. All via real hooks. |

---

## Batch 4 — Visual Updates (T-014 to T-019)

> Parallel after T-003. Visual-only — preserve all data fetching, filters, tabs, and functionality.

---

### T-014: Dashboard visual update

| Field | Value |
|---|---|
| **Description** | Apply Figma styling: gradient welcome banner (blue-900→blue-700), KPI cards with colored icon containers + trend indicators, styled alert cards with severity left border. **Preserve**: 5-tab structure, `useDashboard`, DateRangeFilter, AreaFilter, PeriodComparisonToggle, recharts charts. |
| **Source** | `Figma/src/app/pages/Dashboard.tsx` → Visual patterns only, keep STS hooks |
| **Files** | `src/app/pages/seguimiento/Dashboard.tsx` (edit) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 4 RF-DASHBOARD scenarios pass. Banner with gradient + user name. KPI cards with icons. Alert cards with severity borders. All filters/tabs/charts unchanged. |

---

### T-015: Auditoría visual update

| Field | Value |
|---|---|
| **Description** | Apply Figma styling: styled filter bar (white card+shadow), timeline-style events with action badges (CREATE=green, DELETE=red, UPDATE=blue, LOGIN=purple), stat cards. Preserve `useAuditoria` with pagination/entity/date filters. |
| **Source** | `Figma/src/app/pages/Audit.tsx` → Visual patterns only, keep STS hooks |
| **Files** | `src/app/pages/auditoria/Auditoria.tsx` (edit) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 3 RF-AUDITORIA scenarios pass. Filter bar styled. Timeline events with colored badges. Pagination works. Stat cards shown. |

---

### T-016: Reportes visual update

| Field | Value |
|---|---|
| **Description** | Apply Figma styling: styled chart cards, summary cards with colored accent, data tables with alternating stripes + hover. Preserve tabs (Colaborador/Área), `useReporteColaborador`, `useReporteArea`, `useExportarReporte`, export buttons. |
| **Source** | `Figma/src/app/pages/Reports.tsx` → Visual patterns only, keep STS hooks |
| **Files** | `src/app/pages/reportes/Reportes.tsx` (edit) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | Both RF-REPORTES scenarios pass. Summary cards styled. Data table with hover+stripes. Export buttons functional. |

---

### T-017: ServiceDetail visual update

| Field | Value |
|---|---|
| **Description** | Apply Figma styling: tabbed layout with shadcn Tabs + accent bottom border, task type badges (Técnica/Administrativa), progress bar with accent gradient, blocked banner as red alert card. Preserve all tabs (Tareas/Kanban/Flujo/Comentarios), task CRUD, time tracking, comments. |
| **Source** | `Figma/src/app/pages/ServiceDetail.tsx` → Visual patterns only, keep STS implementation |
| **Files** | `src/app/pages/servicios/ServicioDetail.tsx` (edit) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 3 RF-DETALLE scenarios pass. Tabs styled. Type badges render. Progress bar gradient. All existing operations unchanged. |

---

### T-018: Monitor new page

| Field | Value |
|---|---|
| **Description** | New page at `/monitor`. Three modes: TV (service rotation 15s), Waiting Room (queue + ETA, auto-refresh 30s), Work Room (active tasks grouped by technician). Fullscreen toggle (Fullscreen API). Live clock. Protected for admin/encargado. Add route + Pentalias nav item. Preserve existing `/display/*` routes. |
| **Source** | `Figma/src/app/pages/Monitor.tsx` → Replace mockData with `useServicios` |
| **Files** | `src/app/pages/monitor/Monitor.tsx` (create), `src/App.tsx` (edit), `src/app/layout/Layout.tsx` (edit - nav) |
| **Effort** | Medium |
| **Dependencies** | T-003, T-007 |
| **Acceptance Criteria** | All 3 RF-MONITOR scenarios pass. TV rotation works. Waiting room shows queue. Work room shows task breakdown. Fullscreen toggle. Live clock. Route protected. |

---

### T-019: ClientView enhancement (ServicioPublico)

| Field | Value |
|---|---|
| **Description** | Enhance `ServicioPublico.tsx` with Figma's ClientView design. Progress visualization (timeline with stages). Star rating (1-5). Feedback form (comment + submit). Already-rated state display. Public route without auth. |
| **Source** | `Figma/src/app/pages/ClientView.tsx` → Replace mockData with `useServicioPublico` |
| **Files** | `src/app/pages/servicios/ServicioPublico.tsx` (edit) |
| **Effort** | Medium |
| **Dependencies** | T-003 |
| **Acceptance Criteria** | All 3 RF-CLIENTE scenarios pass. Progress timeline with checkmarks. Star rating submits via API. Already-rated state shown. Public route works. |

---

## Batch 5 — Polish (T-020 to T-021)

---

### T-020: Final visual alignment pass

| Field | Value |
|---|---|
| **Description** | Side-by-side visual comparison of each page vs Figma mockups. Check: spacing, font sizes, border-radius, color values (blue-900, yellow-400, white), shadcn component consistency. Fix visual drift. |
| **Files** | Any page files with minor CSS adjustments |
| **Effort** | Medium |
| **Dependencies** | T-009 through T-019 |
| **Acceptance Criteria** | All pages visually consistent with design tokens. No hardcoded colors outside theme.css. Uniform spacing. Consistent shadcn component usage. |

---

### T-021: Remove unused dependencies + build verification

| Field | Value |
|---|---|
| **Description** | Check for unused deps (e.g., react-dnd not in STS but check). Run `npm run build` + `npm run typecheck`. Fix any TS errors, missing imports, or build warnings. Clean dead code. |
| **Files** | `package.json` (if removing deps), any page files with TS errors |
| **Effort** | Small |
| **Dependencies** | T-020 |
| **Acceptance Criteria** | `npm run build` exits 0. `npm run typecheck` exits 0. No unused deps. No build warnings. |

---

## Dependency Graph

```
T-001 ──┬── T-002 ── T-003 ──┬── T-006 ── T-007 ──┬── T-008
        │                    │                     ├── T-013
        │                    │                     └── T-018
        │                    ├── T-009
        │                    ├── T-010
        │                    ├── T-011
        │                    ├── T-012
        │                    ├── T-014
        │                    ├── T-015
        │                    ├── T-016
        │                    ├── T-017
        │                    └── T-019
        │
        └── T-004 ── T-005
```

**Parallel work after T-003**: T-009, T-010, T-011, T-012, T-014, T-015, T-016, T-017, T-019 can all run in parallel. T-006→T-007→T-008 is a chain. T-013 and T-018 join after T-007.

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| **Mock data in Figma pages** | Every Figma page uses `mockData.ts`. Each port MUST replace with STS TanStack Query hooks. |
| **Role enum mismatch** | Spanish labels ↔ English DB values: use `rolDisplay: Record<string, string>` map tested with all 4 roles. |
| **CSS specificity conflicts** | shadcn/ui uses CSS vars, not hardcoded colors. Existing BEM classes coexist. Test after each batch. |
| **Layout break on mobile** | Figma includes responsive patterns (overlay sidebar). Test at 375/768/1024px breakpoints. |
| **react-dnd vs @dnd-kit** | STS already has @dnd-kit. Figma Services page uses react-dnd — STS stays with @dnd-kit. No migration needed. |
