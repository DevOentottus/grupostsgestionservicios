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

## Next: Batch 3 — High Impact Pages (T-009 to T-013)

- T-009: Login page (two-panel)
- T-010: Usuarios page
- T-011: Servicios card grid
- T-012: Areas master-detail
- T-013: Comunicaciones unified page
