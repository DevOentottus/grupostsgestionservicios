# Design: Ayuda-contextual-por-rol

## Architecture
- Component diagram: HelpButton → HelpDrawer → help-content registry → helpers resolve content
- Data flow: useLocation() pathname → normalizePath() → helpRegistry lookup → filter by rol → render in Sheet
- All content is inline TypeScript, zero network calls

## Component Tree
```
Layout.tsx
  → Topbar: [☰] [Breadcrumb] [⚙️ Settings] [? HelpButton] [Avatar]
  → HelpButton: ghost variant, HelpCircle icon, tooltip "Ayuda contextual"
  → HelpDrawer: Sheet side="right" w-[420px]
    → SheetOverlay bg-black/50
    → SheetContent
      → SheetHeader: bg-yellow-50, título "Ayuda", RolBadge, botón X
      → ScrollArea h-[calc(100vh-80px)] p-6
        → TOC (índice con scrollIntoView si ≥ 2 secciones)
        → HelpSection[] (cada una con título, descripción, pasos numerados, imagen opcional)
        → FallbackContent si no hay contenido para ruta+rol
```

## Data Model
```typescript
interface HelpStep { number: number; description: string; image?: string; note?: string; }
interface HelpSection { id: string; title: string; steps: HelpStep[]; }
interface HelpContent { title: string; sections: HelpSection[]; }
type HelpRegistry = Record<string, Partial<Record<Rol, HelpContent>>>;
```

## File Structure
6 new files in src/app/help/: index.ts, help-types.ts, help-content.ts, HelpButton.tsx, HelpDrawer.tsx, RolBadge.tsx
1 modified: src/app/layout/Layout.tsx
12 screenshots placeholder in public/help/*.png

## Integration
- HelpButton entre Settings y UserAvatar en topbar
- HelpDrawer al final del Layout, estado open/close local
- Sin cambios en auth, routing, backend, DB, ni store

## Non-Goals
- No editor WYSIWYG, no analytics, no tour interactivo, no i18n

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content storage | Inline TS module | Zero network, easy to maintain, no backend changes |
| Route normalization | Regex replace /\\d+ → /:id | Handles dynamic routes like /servicios/42 |
| Fallback behavior | Two-tier: no-role-fallback + no-page-fallback | Clear UX distinction |
| Screenshot handling | onError → display:none | Graceful degradation without error states |
| Sheet width | 420px desktop, full mobile | Consistent with shadcn patterns |
