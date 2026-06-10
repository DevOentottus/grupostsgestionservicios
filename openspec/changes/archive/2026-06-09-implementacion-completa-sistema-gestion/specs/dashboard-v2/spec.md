# Dashboard v2 — Specification

## Purpose
Multi-tab dashboard with charts, alerts, KPIs, period comparison, and clickable drill-down. Covers RF-07 to RF-24.

## Requirements

### RF-07: Dashboard Sections with Alerts and Priorities
The dashboard SHALL have 7+ sections accessible via tabs or scroll navigation: Resumen, KPIs, Alertas, Servicios Activos, Gráficos, Ranking, Comparativo.

#### Scenario: Navigate between dashboard tabs
- GIVEN the dashboard page
- WHEN user clicks "Alertas" tab
- THEN the view switches to alerts without page reload
- AND the URL updates to `/dashboard?tab=alertas`

### RF-08: Blocked Services Count
The dashboard MUST show blocked services count with visual emphasis (red badge).

#### Scenario: Blocked count displayed
- GIVEN 3 services with estado=bloqueado
- WHEN dashboard loads
- THEN `alertas.bloqueados` = 3, shown in the alerts section

### RF-09: Delayed Services with Time Alerts
Services exceeding estimated completion time SHALL appear in an alerts section with delay duration.

### RF-10: Stale Services Detection
Services with no activity > 48 hours SHALL be flagged as "stale" in the alerts section.

#### Scenario: Stale service flagged
- GIVEN a service with no time tracking entries in 72 hours
- WHEN dashboard loads
- THEN it appears in `alertas.estancados` array with `horas_sin_actividad`

### RF-11: Productivity Indicators by Period
GET `/api/dashboard?indicador=productividad&periodo=mensual` SHALL return tasks-completed and time-logged grouped by collaborator.

### RF-12: Efficiency Indicators
GET `/api/dashboard?indicador=eficiencia` SHALL return avg completion time vs estimated time per area/service.

### RF-13: Satisfaction Indicators
GET `/api/dashboard?indicador=satisfaccion` SHALL return NPS-like distribution, avg rating, and response rate.

### RF-14: Pie Chart — Service Status Distribution
The dashboard SHALL include a pie chart showing % of services by estado (pendiente, en_progreso, completado, bloqueado).

### RF-15: Bar Chart — Services by Area
The dashboard SHALL include a bar chart showing service counts grouped by area.

#### Scenario: Charts render with recharts
- GIVEN data from GET `/api/dashboard/graficos`
- WHEN the dashboard renders
- THEN a pie chart (status distribution) and a bar chart (by area) are rendered using recharts

### RF-16: Collaborator Ranking
GET `/api/dashboard/ranking` SHALL return collaborators ordered by tasks completed / time worked within a period.

#### Scenario: Ranking returns top collaborators
- GIVEN 10 active collaborators
- WHEN GET `/api/dashboard/ranking?periodo=mensual&limit=5`
- THEN top 5 collaborators by `tasks_completadas` are returned

### RF-17: Active Services View
A table view SHALL list all services in `en_progreso` with: codigo, cliente, area, progress %, time elapsed, responsible techs.

### RF-18: Inactivity Detection
Services where `updated_at` > 24h ago SHALL be flagged. Separately, collaborators with no time tracking > 2h SHALL appear in an "inactive" section.

### RF-19: Satisfaction by Area
GET `/api/dashboard/satisfaccion-areas` SHALL return avg rating grouped by area.

### RF-21: Real-Time Data Updates (Polling)
The dashboard SHALL poll `/api/dashboard` at configurable intervals (default 30s). Polling SHALL pause when the browser tab is hidden (Page Visibility API).

### RF-22: Clickable Detail Access
Each service card/row on the dashboard SHALL link to `/servicios/:id` for full detail.

### RF-23: Dynamic Filters
The dashboard SHALL support query parameters: `?desde=&hasta=&area_id=&estado=` on all KPI/chart endpoints.

### RF-24: Period Comparison
GET `/api/dashboard/comparativo?periodo_actual=2026-06&periodo_anterior=2026-05` SHALL return side-by-side KPIs for both periods with % change.

#### Scenario: Compare two months
- GIVEN 50 servicios in June, 40 in May
- WHEN GET `/api/dashboard/comparativo` with both periods
- THEN response includes `{ actual: { count: 50 }, anterior: { count: 40 }, cambio_pct: 25 }`

## Dependencies
- RF-03: Role-based data access
- RF-25: Areas must exist for charts
- recharts library (already installed)
