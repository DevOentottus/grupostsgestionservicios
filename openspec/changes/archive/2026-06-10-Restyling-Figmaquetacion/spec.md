# Spec: Restyling-Figmaquetacion

## Overview

Restyle ServicioLocalSTS frontend to match Figmaquetación design — blue-900 sidebar (#1e3a5f), yellow-400 accents, white topbar, oklch shadcn/ui theme. All existing API-driven functionality MUST be preserved without behavioral regression. This is a pure visual migration with no backend changes.

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-sidebar` | `#1e3a5f` (blue-900) | Sidebar background |
| `--color-accent` | `#facc15` (yellow-400) | Accent highlights, active states |
| `--color-topbar` | `#ffffff` | Topbar background |
| `--color-bg` | `#f8fafc` (slate-50) | Page background |
| `--sidebar-width` | `280px` | Desktop sidebar width |
| `--radius` | `0.75rem` | Default border radius |

### Route Mapping

| Figma Route | STS Route | Mapping Required |
|---|---|---|
| `/servicios` | `/servicios` | Same (Spanish) |
| `/colaboradores` | `/usuarios` | Yes (admin only) |
| `/areas` | `/areas` | Same |
| `/comunicaciones` | N/A | New tabbed page (replaces `/anuncios` + `/solicitudes`) |
| `/reportes` | `/reportes` | Same |
| `/auditoria` | `/auditoria` | Same |

### Role Mapping

| Figma Display | DB Value | Notes |
|---|---|---|
| Administrador | `admin` | Spanish → DB |
| Encargado | `encargado` | Same |
| Colaborador | `colaborador` | Same |
| Sistema | `sistema` | Keep — full access bypass |

---

## RF-FOUNDATION: Foundation Setup

**Priority**: High

### Description

Install all required Radix UI dependencies, copy shadcn/ui components from Figma source, port theme.css with oklch to Tailwind v4 `@theme inline` mapping, and verify the design system works end-to-end before any page changes.

### Requirements

The foundation layer MUST be fully additive — zero changes to existing pages, routes, or API calls. All existing functionality SHALL continue working during and after foundation install.

### Scenarios

#### Scenario: Dependency Installation Completes
- GIVEN the project's package.json
- WHEN `npm install` is run after adding all @radix-ui/* deps, tailwind-merge, tw-animate-css, clsx
- THEN all new dependencies resolve and the project builds without errors
- AND clsx is verified already present in package.json (v2.1.1)

#### Scenario: shadcn/ui Components Are Copyable
- GIVEN the Figma project's `src/app/components/ui/` directory with ~48 shadcn components (button, card, dialog, dropdown-menu, input, badge, separator, tabs, select, checkbox, switch, avatar, scroll-area, sheet, tooltip, popover, etc.)
- WHEN copied to `ServicioLocalSTS/src/app/components/ui/`
- THEN every component compiles without TypeScript errors
- AND components use `cn()` utility from `@/lib/utils` for class merging

#### Scenario: Theme.css Port Rendering
- GIVEN the Figma theme.css with oklch color tokens
- WHEN merged into `src/index.css` via `@import "./styles/theme.css"` and `@theme inline` block defines semantic color mappings
- THEN all CSS variables resolve correctly in the browser
- AND `bg-sidebar` resolves to `#1e3a5f` (blue-900)
- AND `text-accent` resolves to `#facc15` (yellow-400)

#### Scenario: cn() Utility Function Works
- GIVEN the `@/lib/utils.ts` file with `cn()` using clsx + tailwind-merge
- WHEN called with conflicting Tailwind classes (e.g., `cn("px-4", "px-6")`)
- THEN tailwind-merge resolves the conflict, keeping the last conflicting class (`px-6`)

#### Scenario: Button Component Renders
- GIVEN the shadcn Button component imported and rendered
- WHEN rendered with `variant="default"`
- THEN it displays with the primary color matching the theme's accent
- AND `variant="outline"` renders with a border and transparent background

---

## RF-LAYOUT: Layout Replacement

**Priority**: High

### Description

Rewrite `Layout.tsx` to match Figma's visual design: blue-900 sidebar (#1e3a5f), yellow-400 accent for active nav items, white topbar above content area, notification dropdown (Bell icon), user avatar with initials. Keep STS's existing navigation structure (Principal/Gestión/Pantallas sections), real auth from `@/lib/auth`, the `RolBadge` for role display, and the `sistema` role full-access bypass.

### Requirements

The layout SHALL use `useAuth()` for user data and authentication state. It MUST NOT introduce any mock data. All existing routes MUST render correctly inside the new layout structure — no route URL changes. Mobile responsive SHALL include a hamburger menu, sidebar overlay, and slide-in animation at viewports below 768px.

### Scenarios

#### Scenario: Sidebar Renders with Navigation Sections
- GIVEN an authenticated user with role "admin"
- WHEN the layout renders
- THEN the sidebar shows `#1e3a5f` (blue-900) background
- AND navigation sections "Principal", "Gestión", "Pantallas" are rendered with correct labels
- AND all nav items for admin role are displayed (Dashboard, Servicios, Solicitudes, Plantillas, Áreas, Usuarios, Reportes, Auditoría, Anuncios)
- AND Gestión section shows Mi Área, Distribución, Desempeño

#### Scenario: Active Navigation Item Has Yellow Accent
- GIVEN the user is on `/dashboard`
- WHEN the sidebar renders
- THEN the Dashboard nav item background is yellow-400 (`#facc15`)
- AND the icon and text are white or high-contrast against the yellow background

#### Scenario: Topbar Displays User Info
- GIVEN an authenticated user
- WHEN the layout renders
- THEN a white topbar appears above the content area
- AND the topbar contains a Bell icon (notification bell)
- AND clicking the Bell icon opens a notification dropdown with mock notifications
- AND the topbar contains the user's avatar with initials (e.g., "JG" for "Juan García")
- AND clicking the avatar shows a dropdown with user name, role badge, and logout option

#### Scenario: Sidebar is Mobile Responsive
- GIVEN a viewport width of 375px (mobile)
- WHEN the layout renders
- THEN the sidebar is hidden off-screen by default
- AND a hamburger menu icon is visible in the topbar
- AND clicking the hamburger slides the sidebar in with an animation overlay
- AND clicking the overlay or a nav item closes the sidebar

#### Scenario: Sistema Role Has Full Access
- GIVEN an authenticated user with role "sistema"
- WHEN the layout renders
- THEN all nav items are visible regardless of role restrictions
- AND the RolBadge displays "sistema" with red styling

#### Scenario: All Existing Routes Work
- GIVEN the new layout renders
- WHEN navigating to each route: /dashboard, /servicios, /servicios/:id, /areas, /areas/:id/servicios, /plantillas, /reportes, /solicitudes, /anuncios, /usuarios, /auditoria, /manager/*
- THEN each page renders inside the layout's `<Outlet />` correctly
- AND the active nav item updates to match the current route

---

## RF-LOGIN: Login Page Replacement

**Priority**: High

### Description

Replace the current centered-card login with Figma's two-panel design. Left panel SHALL display a gradient background, brand logo, and system stats/info. Right panel SHALL contain the login form with real API authentication via `useAuth()` from `@/lib/auth`. Show demo credentials hint as in the Figma original.

### Requirements

All existing auth logic MUST be preserved — the login form calls `useAuth().login(username, password)` which posts to the backend. No mock authentication. The page SHALL redirect to `/dashboard` on success.

### Scenarios

#### Scenario: Two-Panel Layout Renders
- GIVEN the user navigates to `/login`
- WHEN the page loads
- THEN a two-panel layout is displayed
- AND the left panel (50% width) shows a gradient background (blue-900 to slate-800), the ServicioLocalSTS brand logo, and system stats (e.g., "X servicios completados", "Y técnicos activos")
- AND the right panel (50% width) shows the login form centered with proper spacing

#### Scenario: Login Form Authenticates via API
- GIVEN the login form on the right panel
- WHEN the user enters valid credentials and submits
- THEN `useAuth().login()` is called with the provided credentials
- AND on success the user is redirected to `/dashboard`
- AND on failure an error message appears on the form
- AND the form button shows a loading state during the request

#### Scenario: Demo Credentials Hint Visible
- GIVEN the login page
- WHEN the form renders
- THEN a subtle hint below the form displays demo credentials (e.g., "Demo: admin / admin123")
- AND the hint is visually distinct but unobtrusive

#### Scenario: Already Authenticated Redirect
- GIVEN the user is already authenticated (token in sessionStorage)
- WHEN the user navigates to `/login`
- THEN they are immediately redirected to `/dashboard`
- AND the login page does not flash momentarily

---

## RF-USUARIOS: Usuarios / Collaborators Page

**Priority**: High

### Description

Replace the current basic table with Figma's styled table including search bar, filter controls, and modal-based CRUD. Area assignment for encargado role SHALL use checkboxes. Keep real API calls via TanStack Query (`useUsuarios`, `useCrearUsuario`, `useToggleUsuario`). Pagination SHALL be server-driven. Map role names correctly: Figma displays "Administrador" → DB value `admin`.

### Requirements

All role names in the display SHALL use Spanish labels ("Administrador", "Encargado", "Colaborador") while the values sent to the API remain in English (`admin`, `encargado`, `colaborador`). The `sistema` role SHALL be preserved and displayed as "Sistema".

### Scenarios

#### Scenario: User Table Displays with Search and Filter
- GIVEN the admin navigates to `/usuarios`
- WHEN the page loads
- THEN a styled table displays users with columns: Usuario, Nombres, Email, Rol, Estado, Acciones
- AND a search input filters users by name or email as the user types
- AND a role filter dropdown filters by Administrador/Encargado/Colaborador/Sistema

#### Scenario: Create User Modal
- GIVEN the usuario page
- WHEN the user clicks "Nuevo Usuario"
- THEN a modal dialog opens with fields for username, password, nombres, email, and rol selector
- AND the rol selector shows Spanish labels: "Administrador", "Encargado", "Colaborador"
- AND on submit, the API receives role values as `admin`, `encargado`, `colaborador`
- AND the modal closes and the table refreshes on success

#### Scenario: Edit User with Area Assignment
- GIVEN the usuario page
- WHEN editing a user with role "encargado"
- THEN an area assignment section with checkboxes appears in the edit form
- AND the user can be assigned to one or more areas
- AND the changes persist via API call

#### Scenario: Toggle User Active Status
- GIVEN a user in the table
- WHEN clicking "Desactivar" for an active user
- THEN a confirmation dialog appears
- AND on confirm, the user is deactivated via API
- AND the row updates to show "Inactivo" badge
- AND the button changes to "Activar"

#### Scenario: Role Display Maps Correctly
- GIVEN a user with DB role "admin"
- WHEN the table renders
- THEN the role column displays "Administrador" (Spanish)

---

## RF-SERVICIOS: Servicios Page

**Priority**: High

### Description

Replace the current list layout with Figma's card grid layout. Status filter buttons SHALL show: Todos, Pendiente, En Progreso, Completado, Bloqueado. Service creation moves to a 3-step wizard modal. Task reordering within ServiceDetail SHALL use @dnd-kit (already installed) instead of react-dnd. Keep TanStack Query for all API data. Map status display names.

### Requirements

Status display names SHALL use Spanish labels while API values remain as DB values (`pendiente`, `en_progreso`, `completado`, `cancelado`, `bloqueado`). The card grid SHALL be responsive (1 column on mobile, 2 on tablet, 3+ on desktop).

### Scenarios

#### Scenario: Card Grid Displays Services
- GIVEN the servicios page
- WHEN loaded
- THEN services display in a responsive card grid
- AND each card shows: service code, title, client name, status badge, priority indicator, and area name
- AND clicking a card navigates to `/servicios/:id`

#### Scenario: Status Filter Buttons
- GIVEN the servicios page
- WHEN the user clicks "En Progreso" in the filter bar
- THEN only services with status `en_progreso` are displayed
- AND the active filter button has the accent (yellow-400) background
- AND filter options match statuses: Todos, Pendiente, En Progreso, Completado, Bloqueado

#### Scenario: 3-Step Wizard for Service Creation
- GIVEN the servicios page
- WHEN the user clicks "+ Nuevo Servicio"
- THEN a 3-step wizard modal opens
- AND Step 1 collects: título, descripción, cliente_nombre, cliente_email
- AND Step 2 collects: área (dropdown), plantilla (dropdown with task preview)
- AND Step 3 shows a summary and confirmation before submitting
- AND on submit, the service is created via API and any selected template is applied
- AND the modal closes and the grid refreshes

#### Scenario: Status Display Mapping
- GIVEN a service with DB status "pendiente"
- WHEN displayed in the card grid
- THEN the status badge shows "Pendiente" (Spanish, capitalized)
- AND `en_progreso` shows "En Progreso", `completado` shows "Completado", `bloqueado` shows "Bloqueado"

---

## RF-AREAS: Areas Page

**Priority**: Medium

### Description

Replace the current table with expandable rows to a master-detail layout. Left panel SHALL display the area list. Right panel SHALL show detail information including stats (colaborador count, active services) and colaborador management. Keep real API data from `useAreas`, `useCrearArea`, `useEditarArea`, `useEliminarArea`.

### Requirements

The master-detail layout SHALL be responsive: on mobile, the detail panel replaces the list view with a back button. All CRUD operations MUST use existing TanStack Query mutations.

### Scenarios

#### Scenario: Master-Detail Layout
- GIVEN the areas page
- WHEN it loads
- THEN a split layout displays with the area list on the left (40% width)
- AND clicking an area shows its details on the right panel (60% width)
- AND the right panel shows: area name, encargado name, colaborador count, active services count, assigned collaborators list

#### Scenario: Create and Edit Area
- GIVEN the areas page
- WHEN clicking "Nueva Área"
- THEN a form appears (modal or inline in right panel) with nombre and encargado fields
- AND encargado dropdown shows users with roles admin and encargado
- AND on submit, the API is called and the list refreshes
- AND editing uses the same form pre-populated with existing values

#### Scenario: Colaborador Management
- GIVEN an area selected in the master panel
- WHEN viewing the detail panel
- THEN existing colaboradores are listed with a "Remover" button
- AND an "Agregar Colaborador" dropdown shows available users (role colaborador, not already assigned)
- AND assigning/removing updates the list without page reload

#### Scenario: Delete Area Confirmation
- GIVEN an area
- WHEN clicking "Eliminar"
- THEN a confirmation dialog appears
- AND on confirm, the area is deleted via API
- AND the list refreshes, removing the deleted area

---

## RF-COMUNICACIONES: Communications Page (Unified)

**Priority**: Medium

### Description

Create a unified Communications page with tabs: **Anuncios**, **Solicitudes**, **Instrucciones**. The Anuncios tab SHALL replace the current standalone `/anuncios` page. Solicitudes tab SHALL reuse the existing solicitudes functionality. Instrucciones tab SHALL be a placeholder for future use. Each tab SHALL have its own creation modal or form. Map to existing STS API endpoints (`useAnuncios`, `useSolicitudes`).

### Requirements

The route `/comunicaciones` SHALL be added. The existing `/anuncios` route SHALL redirect to `/comunicaciones?tab=anuncios` or remain functional as a redirect. The existing `/solicitudes` route SHALL redirect similarly. All API calls MUST use existing TanStack Query hooks.

### Scenarios

#### Scenario: Tab Navigation
- GIVEN the communications page
- WHEN it loads
- THEN three tabs are displayed: Anuncios, Solicitudes, Instrucciones
- AND the Anuncios tab is active by default
- AND switching tabs preserves the content state (e.g., search/filter values)

#### Scenario: Anuncios Tab Shows Announcements
- GIVEN the Anuncios tab
- WHEN it loads
- THEN announcements display as styled cards with priority icons and expiration dates
- AND admin users see "Nuevo Anuncio" button and edit/delete actions
- AND non-admin users only see active announcements

#### Scenario: Solicitudes Tab Shows Internal Requests
- GIVEN the Solicitudes tab
- WHEN it loads
- THEN internal requests display in a list view with type icon, status badge, and priority
- AND a "Nueva Solicitud" button opens a creation form modal
- AND the user sees their own requests by default; admins can see all

#### Scenario: Legacy Route Redirect
- GIVEN a bookmarked URL `/anuncios`
- WHEN the user navigates to it
- THEN they are redirected to `/comunicaciones?tab=anuncios` or the equivalent tab state
- AND the correct tab is active

---

## RF-DASHBOARD: Dashboard Visual Update

**Priority**: Medium

### Description

Apply Figma's visual styling to the dashboard: gradient welcome banner at the top, KPI cards with icons and trend indicators, styled chart containers. Keep the existing 5-tab structure (Alertas/Indicadores/Gráficos/Ranking/Comparativo), existing TanStack Query data fetching via `useDashboard`, and existing chart components using recharts (already installed).

### Requirements

This is a visual-only update. No new data queries, no new backend calls. All existing filter functionality (date range, area filter, period comparison) MUST continue working.

### Scenarios

#### Scenario: Welcome Banner Displays
- GIVEN the dashboard page
- WHEN it loads
- THEN a gradient welcome banner at the top shows "Bienvenido, {user.nombres}" with a subtitle
- AND the banner has a blue-900 to blue-700 gradient background with decorative elements

#### Scenario: KPI Cards with Icons
- GIVEN the dashboard
- WHEN the Indicadores tab renders
- THEN KPI cards display with colored icon containers, metric value, and label
- AND each card has a subtle border and shadow consistent with the shadcn/ui theme
- AND KPI groups (Productividad, Eficiencia, Satisfacción) are visually separated

#### Scenario: Alert Cards Styled
- GIVEN the Alertas tab
- WHEN delayed or blocked services are displayed
- THEN alert cards show with severity-colored left borders (red for blocked, orange for delayed)
- AND each card shows the service code, description, time elapsed, and priority badge

#### Scenario: Existing Filters Work
- GIVEN the dashboard page
- WHEN the user changes the date range filter
- THEN `useDashboard` is called with the updated filters
- AND the data refreshes without page reload
- AND the period comparison toggle still works

---

## RF-AUDITORIA: Auditoría Visual Update

**Priority**: Medium

### Description

Apply Figma's visual styling: styled filter bar with gradient, stat cards showing total events and unique users, timeline-style event list with action badges. Keep existing API-driven pagination, filters, and data fetching via `useAuditoria`.

### Requirements

Visual-only update. All existing filter controls (entidad select, date inputs) and pagination MUST continue working identically.

### Scenarios

#### Scenario: Filter Bar Styled
- GIVEN the auditoría page
- WHEN it loads
- THEN the filter bar has a white card with subtle shadow, matching shadcn/ui style
- AND filter controls (entidad, desde, hasta) are aligned in a row with the "Limpiar filtros" button

#### Scenario: Event List Shows Timeline Style
- GIVEN audit events loaded
- WHEN displayed
- THEN events show in a timeline-like list with action badges colored by type (CREATE=green, DELETE=red, UPDATE=blue, LOGIN=purple)
- AND each event row shows timestamp, user name, entity, and detail preview

#### Scenario: Pagination Works
- GIVEN a large set of audit records
- WHEN the user navigates to page 2
- THEN `useAuditoria` is called with `page: 2`
- AND the table updates to show the next 20 records
- AND pagination controls show current page and total pages

---

## RF-REPORTES: Reportes Visual Update

**Priority**: Low

### Description

Apply Figma's chart styling and layout to the Reportes page. Keep existing tabs (Por Colaborador / Por Área), existing API data fetching via `useReporteColaborador` and `useReporteArea`, and existing export functionality (XLSX/PDF).

### Requirements

Visual-only update. No new data sources. Export buttons MUST remain functional.

### Scenarios

#### Scenario: Summary Cards Styled
- GIVEN the Reportes page with data loaded
- WHEN summary cards display
- THEN each card has the shadcn/ui card pattern with colored top accent or icon
- AND card metrics are clearly readable with labels below

#### Scenario: Data Table with Figma Style
- GIVEN report data loaded
- WHEN the data table renders
- THEN the table has styled header with the page's accent color
- AND rows have hover states and alternating or subtle stripe backgrounds
- AND the export buttons are styled as outlined buttons with icons

---

## RF-DETALLE: ServiceDetail Visual Update

**Priority**: Low

### Description

Apply Figma's visual styling to the Service Detail page: tabbed layout (Tareas/Flujo/Comentarios — kanban tab stays as-is or gets visual polish), styled progress section, type badges on task notes. Keep all existing API calls, mutations, and functionality.

### Requirements

Visual-only update. All task CRUD operations, Kanban drag-and-drop, time tracking, and comment functionality MUST remain unchanged.

### Scenarios

#### Scenario: Tabbed Layout Styled
- GIVEN the service detail page
- WHEN it loads
- THEN tabs (Tareas, Flujo, Comentarios) have the shadcn/ui tab styling
- AND the active tab has a bottom border in accent color
- AND the blocked banner (if present) has a red alert card with icon

#### Scenario: Task Notes with Type Badges
- GIVEN a task with type metadata
- WHEN displayed in the Tareas tab
- THEN each task row has a type badge (e.g., "Técnica", "Administrativa") with appropriate color
- AND the checkbox, title, and action buttons maintain their existing behavior

#### Scenario: Progress Section Styled
- GIVEN the service detail page
- WHEN the header section renders
- THEN the progress bar uses the accent color gradient
- AND the completion counter shows "X de Y tareas completadas"
- AND the status buttons are styled as shadcn/ui button variants

---

## RF-MONITOR: Monitor Page (New)

**Priority**: Low

### Description

Add a new Monitor page inspired by Figma's fullscreen display concepts. Support multiple display modes: TV view (service rotation), waiting room view (queue status), work room view (active tasks). Include a live clock and automatic service rotation/timer. Merge with the existing `display/*` pages concept.

### Requirements

The monitor SHALL be accessible from the sidebar under "Pantallas" section (existing pattern). Existing display routes (`/display/tv`, `/display/waiting-room`, `/display/work-room`) SHALL remain functional. The new Monitor page MAY add enhanced visual styling to the existing display components.

### Scenarios

#### Scenario: TV Display Shows Service Rotation
- GIVEN the TV display mode
- WHEN active
- THEN services cycle automatically every 15 seconds with a smooth transition
- AND each service card shows code, title, status progress bar, assigned technicians, and elapsed time
- AND a live clock is displayed in the corner

#### Scenario: Waiting Room Display
- GIVEN the waiting room display mode
- WHEN active
- THEN current pending services are shown in queue order
- AND estimated wait times are displayed per service
- AND the display auto-refreshes every 30 seconds

#### Scenario: Work Room Display
- GIVEN the work room display mode
- WHEN active
- THEN in-progress services are shown with task breakdown
- AND each technician's active tasks are grouped
- AND completed tasks show completion timestamps

---

## RF-CLIENTE: ClientView Enhancement

**Priority**: Low

### Description

Enhance the existing `ServicioPublicoPage` with Figma's ClientView design. Add star rating component (already partially exists), feedback form, and service progress visualization. Keep the existing public route (`/public/servicio/:codigo`) and API calls.

### Requirements

The ClientView SHALL be publicly accessible without authentication. The feedback form SHALL allow the client to submit a rating (1–5 stars) and optional comment, which gets stored via existing API endpoints.

### Scenarios

#### Scenario: Service Progress Visualization
- GIVEN a client accesses `/public/servicio/ABC123`
- WHEN the page loads
- THEN a styled progress visualization shows the service status with a timeline
- AND each stage (Recibido, En Progreso, Completado) is shown with checkmarks for completed stages

#### Scenario: Star Rating and Feedback
- GIVEN a completed service
- WHEN the client scrolls to the feedback section
- THEN a 1–5 star rating component is displayed (using the existing StarRating component)
- AND a comment textarea is shown for optional feedback
- AND on submit, the rating and comment are sent via the existing encuesta API
- AND a success toast confirms submission

#### Scenario: Already Rated State
- GIVEN a service that has already received feedback
- WHEN the client views the page
- THEN the feedback section shows "Ya has calificado este servicio" with the given rating
- AND the form is disabled/pre-filled

---

## Specs Summary

| ID | Title | Type | Priority | Scenarios |
|----|-------|------|----------|-----------|
| RF-FOUNDATION | Foundation Setup | Setup | High | 5 |
| RF-LAYOUT | Layout Replacement | Rewrite | High | 5 |
| RF-LOGIN | Login Page Replacement | Rewrite | High | 4 |
| RF-USUARIOS | Usuarios/Collaborators Page | Rewrite | High | 5 |
| RF-SERVICIOS | Servicios Page | Rewrite | High | 4 |
| RF-AREAS | Areas Page | Rewrite | Medium | 4 |
| RF-COMUNICACIONES | Communications Page | New | Medium | 4 |
| RF-DASHBOARD | Dashboard Visual Update | Visual | Medium | 4 |
| RF-AUDITORIA | Auditoría Visual Update | Visual | Medium | 3 |
| RF-REPORTES | Reportes Visual Update | Visual | Low | 2 |
| RF-DETALLE | ServiceDetail Visual Update | Visual | Low | 3 |
| RF-MONITOR | Monitor Page | New | Low | 3 |
| RF-CLIENTE | ClientView Enhancement | Enhance | Low | 3 |
| **Total** | | | | **49** |

### Coverage
- **Happy paths**: Covered — every spec has at least one happy-path scenario
- **Edge cases**: Covered — mobile responsive (RF-LAYOUT), role mapping (RF-USUARIOS), already-authenticated redirect (RF-LOGIN), already-rated state (RF-CLIENTE), legacy route redirect (RF-COMUNICACIONES)
- **Error states**: Covered in RF-LOGIN (API error display), RF-USUARIOS (delete confirmation), RF-DASHBOARD (error/reload state)
