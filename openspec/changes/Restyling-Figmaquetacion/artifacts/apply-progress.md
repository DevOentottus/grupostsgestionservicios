# Apply Progress: Restyling-Figmaquetacion

> Estado: Batch 1 (Foundation) ✅ + Batch 2 (Layout) ✅

---

## Batch 1 — Foundation ✅

### T-001: Install npm dependencies ✅
- 26 × `@radix-ui/*` packages installed
- `tailwind-merge`, `tw-animate-css` installed
- Transitive deps: `react-day-picker@9.5.0`, `react-resizable-panels@2.1.7`, `embla-carousel-react`, `cmdk`, `vaul`, `react-hook-form`, `input-otp`, `next-themes`
- All existing deps (clsx, cva, lucide-react, recharts, sonner, date-fns) preserved

### T-002: Copy shadcn/ui components ✅
- 48 files copied from `Figma/src/app/components/ui/` → `STS/src/app/components/ui/`
- Includes `utils.ts` for local `./utils` import paths

### T-003: Create cn() utility ✅
- Created `src/app/lib/utils.ts` with `cn()` using clsx + tailwind-merge

### T-004: Port theme.css ✅
- Created `src/app/styles/theme.css` — customized:
  - `--sidebar: #1e3a5f` (blue-900)
  - `--sidebar-foreground: #ffffff`
  - `--accent: #facc15` (yellow-400)
  - `--sidebar-primary: #facc15`
  - `--radius: 0.75rem`
- Created `src/app/styles/tailwind.css` — imports `tailwindcss` + `tw-animate-css`
- Created `src/app/styles/fonts.css` — empty

### T-005: Update index.css ✅
- `src/index.css` now imports: `fonts.css` → `tailwind.css` → `theme.css`
- Original `@import "tailwindcss"` + body style replaced

---

## Batch 2 — Layout ✅

### T-006: Rewrite Layout.tsx ✅
- Blue-900 sidebar (280px) with yellow-400 wrench icon brand header
- Avatar initials + RolBadge in sidebar user section
- Nav sections: Principal (9 items), Gestión (3 items, role-gated), Pantallas (3 items)
- Active nav item: yellow-400 background + blue-900 text
- sistema role override preserved
- White topbar with: hamburger menu (mobile), breadcrumb, Bell notifications (dropdown with 5 mock items), Settings button, user avatar with dropdown (name/email/rol/logout)
- Mobile responsive: sidebar slides from left with overlay backdrop
- Dropdowns close on outside click via useEffect
- Uses `cn()` from `@/app/lib/utils`
- Default export

### T-007: Update App.tsx ✅
- Import changed from `{ Layout }` (named) to `Layout` (default)

### T-008: Verify ✅
- `npx tsc --noEmit` — passes (zero errors)
- `npm run build` — passes (warnings are pre-existing)

---

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Edit — added 36 dependencies |
| `src/app/components/ui/*.tsx` | Create — 48 shadcn/ui components |
| `src/app/components/ui/utils.ts` | Create — local cn() for components |
| `src/app/lib/utils.ts` | Create — project cn() utility |
| `src/app/styles/theme.css` | Create — CSS vars port |
| `src/app/styles/tailwind.css` | Create — Tailwind+animate |
| `src/app/styles/fonts.css` | Create — empty placeholder |
| `src/index.css` | Edit — rewritten with style imports |
| `src/app/layout/Layout.tsx` | Rewrite — new Figma layout |
| `src/App.tsx` | Edit — Layout import style |

---

## Batch 3 — High Impact Pages ✅

### T-009: Login page (two-panel) ✅
- Rewrote `src/app/pages/login/Login.tsx` with Figma's two-panel design
- Left panel: gradient blue-900→blue-700, ServicioLocalSTS brand, stats grid (4 stat cards)
- Right panel: clean form with User/Lock icons, show/hide password toggle, yellow-400 "Ingresar al sistema" button
- Using real `useAuth()` from `@/lib/auth.js` — calls `login(username, password)`
- Proper error handling (try/catch with error message display)
- Loading state on button during auth
- Demo credentials grid (Admin/Encargado/Colaborador/Cliente) with quick-fill buttons
- Already-authenticated redirect via useEffect checking `isAuthenticated`
- Import from `react-router-dom`, `cn()` from `@/app/lib/utils`
- Used lucide-react icons: User, Lock, Eye, EyeOff, LogIn, Wrench, AlertCircle

### T-010: Usuarios page ✅
- Rewrote `src/app/pages/usuarios/Usuarios.tsx` with Figma Collaborators style
- Search bar + role filter dropdown (Todos/Administrador/Encargado/Colaborador/Sistema)
- Styled table with: Usuario, Nombres (with avatar initials), Email, Rol, Estado, Acciones
- Role display mapping: `admin`→"Administrador", `encargado`→"Encargado", `colaborador`→"Colaborador", `sistema`→"Sistema"
- Role color badges (purple/blue/yellow/red)
- Create/Edit modal (shadcn Dialog style) with fields: username, password, nombres, email, rol
- Area assignment with checkboxes for encargado role (uses `useAreas` data)
- Toggle active status with confirmation dialog
- Uses real hooks: `useUsuarios`, `useCrearUsuario`, `useEditarUsuario`, `useToggleUsuario`
- Admin-only actions (role-gated)

### T-011: Servicios card grid + 3-step wizard ✅
- Rewrote `src/app/pages/servicios/Servicios.tsx` with Figma card grid layout
- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- Status filter buttons (Todos/Pendiente/En Progreso/Completado/Bloqueado) with yellow-400 active state + count badges
- Search bar
- Each card shows: código badge, status badge, titulo, cliente_nombre, area badge, progress bar, "Ver detalle" link
- 3-step wizard modal:
  - Step 1: título, descripción, cliente_nombre, cliente_email
  - Step 2: área dropdown, plantilla dropdown with task preview
  - Step 3: summary with confirmation
- Status mapping: `pendiente`→"Pendiente", `en_progreso`→"En Progreso", `completado`→"Completado", `bloqueado`→"Bloqueado"
- Uses real hooks: `useServicios`, `useCrearServicio`, `useAreas`, `usePlantillas`, `usePlantilla`, `useAplicarPlantilla`
- No react-dnd — kept STS @dnd-kit pattern

### T-012: Areas master-detail ✅
- Rewrote `src/app/pages/areas/Areas.tsx` with Figma master-detail layout
- Left panel (2/5 width): scrollable area list with stats cards (Total/Activos/Listos)
- Right panel (3/5 width): detail view with:
  - Header card with area info + Edit/Delete buttons
  - Stats cards (Servicios, En Progreso, Completados, Colaboradores)
  - Collaborators section with list + assign/remove controls
- Selected area highlighted in blue-900 with white text
- Create/Edit modal with nombre + encargado dropdown
- Delete with confirmation dialog
- Mobile responsive: list/detail toggle with back button
- Uses all real hooks: `useAreas`, `useArea`, `useCrearArea`, `useEditarArea`, `useEliminarArea`, `useAsignarColaborador`, `useRemoverColaborador`

### T-013: Comunicaciones unified page ✅
- Created new `src/app/pages/comunicaciones/Comunicaciones.tsx`
- Three tabs: Anuncios, Solicitudes, Instrucciones
- Anuncios tab: styled cards with priority icons/colors, admin CRUD (crear, desactivar, eliminar — soft deactivate, hard delete), toggle inactive visibility
- Solicitudes tab: styled cards with type icons, status badges, admin/encargado "Atender" button with response modal
- Instrucciones tab: placeholder (STS doesn't have 'instruccion' tipo — shows empty state)
- Stat cards: Anuncios activos, Solicitudes pendientes, Instrucciones
- Uses real hooks: `useAnuncios`, `useTodosAnuncios`, `useCrearAnuncio`, `useEditarAnuncio`, `useEliminarAnuncio`, `useMisSolicitudes`, `useSolicitudes`, `useCrearSolicitud`, `useAtenderSolicitud`
- Updated `src/App.tsx`: added `/comunicaciones` route
- Updated `src/app/layout/Layout.tsx`: added "Comunicaciones" nav item in Principal section + page title entry

---

## Full Build Verification
- `npx tsc --noEmit` — passes (zero errors)
- `npm run build` — pending

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/pages/login/Login.tsx` | Rewrite — Figma two-panel design |
| `src/app/pages/usuarios/Usuarios.tsx` | Rewrite — Figma Collaborators style |
| `src/app/pages/servicios/Servicios.tsx` | Rewrite — card grid + 3-step wizard |
| `src/app/pages/areas/Areas.tsx` | Rewrite — master-detail layout |
| `src/app/pages/comunicaciones/Comunicaciones.tsx` | Create — unified communications page |
| `src/App.tsx` | Edit — added `/comunicaciones` route |
| `src/app/layout/Layout.tsx` | Edit — added "Comunicaciones" nav item + page title |
| `openspec/changes/Restyling-Figmaquetacion/tasks.md` | Edit — marked T-009 to T-013 as [x] |

---

## Next: Batch 4 — Visual Updates (T-014 to T-019)
