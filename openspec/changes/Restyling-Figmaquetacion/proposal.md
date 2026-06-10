# Proposal: Restyling-Figmaquetacion

## Intent

Restyle the entire ServicioLocalSTS frontend to match the Figmaquetación visual design: blue-900 sidebar, white topbar, yellow-400 accents, oklch shadcn/ui theme. Preserve all existing API-driven functionality — this is a pure visual migration.

## Scope

### In Scope
- **Phase 1 — Foundation**: Install @radix-ui/* deps, tailwind-merge, tw-animate-css, lucide-react. Port 48 shadcn/ui components and theme.css with oklch → @theme inline mapping.
- **Phase 2 — Layout**: Rewrite Layout.tsx (blue-900 sidebar, yellow accents, white topbar, notification dropdown, user avatar). Keep auth, TanStack Query hooks, nav items.
- **Phase 3 — Pages**: Full migration for Login, Collaborators, Services, Areas, Communications (5 pages). Visual-only updates for Dashboard, ServiceDetail, Monitor, Supervision, Reports, Audit, ClientView, Business (8 pages).
- **Phase 4 — Polish**: Responsive tweaks, dark mode tuning, edge cases.

### Out of Scope
- MUI removal (already unused, not imported)
- react-dnd migration (keep @dnd-kit)
- Backend changes or new API endpoints
- New features or route creation beyond visual parity

## Capabilities

### New Capabilities
- `restyling-foundation`: shadcn/ui component library + theme.css port
- `restyling-layout`: Blue-900 sidebar layout with topbar, notifications, user menu
- `restyling-pages`: Visual restyle of all 13 pages matching Figmaquetación

### Modified Capabilities
None — pure visual restyle. No spec-level behavior changes.

## Approach

Three-phase rollout. Foundation first (deps, components, theme) — zero runtime risk. Layout second — single-file swap proves the shell works with real auth. Pages last, grouped by migration intensity. One PR per phase for clean rollback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ui/` | New | ~48 shadcn/ui components |
| `src/layouts/Layout.tsx` | Modified | Blue-900 sidebar, white topbar |
| `src/styles/theme.css` | Modified | oklch variables + @theme inline |
| `src/pages/*.tsx` | Modified | All 13 pages restyled |
| `package.json` | Modified | Add radix deps, tailwind-merge, etc. |

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| MUI | Skip | Unused, not imported anywhere |
| DnD | @dnd-kit (keep) | Already installed, no react-dnd needed |
| Role mapping | Admin→admin, Encargado→encargado, etc. | Translate Spanish display → DB values |
| Route mapping | servicios→/services, colaboradores→/collaborators | Figma routes Spanish, STS English |
| Data source | TanStack Query (keep) | Adapt mock-UI pages to real API calls |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Role mismatch on redirect | Medium | Lookup table; test all 4 roles |
| Route mismatch in sidebar nav | Medium | Map Figma path → STS route in NavLink |
| Mock data coupling in page components | High | Per-page audit; replace mockData.ts with query hooks |
| Effort underestimation | High | Phase 1 is pure copy; isolate custom work in Layout |

## Rollback Plan

One PR per phase. Phase 2 fails? Revert Layout PR — old Layout.tsx untouched. Single page breaks? Revert that page's PR. Phase 1 is fully additive (new deps + components) with zero risk.

## Success Criteria

- [ ] Visual match: blue-900 sidebar, white topbar, yellow-400 accents, shadcn/ui theme
- [ ] No regressions: login, CRUD, search, pagination, filters all work identically
- [ ] Zero build errors
- [ ] All 4 roles render correct sidebar nav items
- [ ] Notification dropdown + user avatar dropdown function in topbar
