# Displays — Specification

## Purpose
Public-facing and team-facing display modes for TVs, waiting rooms, and work rooms. Covers RF-36, RF-37, RF-38.

## Requirements

### RF-36: TV/Monitor Display — Active Services in Real Time
The system MUST provide a public endpoint (`/api/public/display/tv`) returning active services (en_progreso) with progress info. The frontend SHALL auto-refresh every 30 seconds.

#### Scenario: TV display shows active services
- GIVEN 8 services en_progreso, 5 pendiente, 3 completados
- WHEN GET `/api/public/display/tv`
- THEN only the 8 en_progreso services are returned, each with task completion %

#### Scenario: TV mode auto-refresh
- GIVEN the TV display page is open
- WHEN 30 seconds pass
- THEN the page polls GET `/api/public/display/tv` automatically (no user interaction needed)

### RF-37: Waiting Room Mode — Client-Facing with ETA
The system MUST provide a waiting room display showing current service position and estimated completion time (ETA) based on task progress and historical averages.

#### Scenario: Waiting room shows position and ETA
- GIVEN a service with 60% task completion and 4h historical avg for remaining tasks
- WHEN GET `/api/public/display/sala-espera/:codigo`
- THEN response includes { codigo, cliente, progress_pct, eta_min, position_in_queue }

#### Scenario: Invalid service code
- WHEN GET with a non-existent code
- THEN 404 is returned (no information disclosure)

### RF-38: Work Room Mode — Team-Facing with Alerts
The system MUST provide a work room dashboard showing all team services, blocked items highlighted, delayed services in red, and inactive tasks flagged.

#### Scenario: Work room shows alerts
- GIVEN a service blocked >30min and another delayed past ETA
- WHEN GET `/api/display/trabajo`
- THEN the blocked service is marked with `alerta: "bloqueado"` and the delayed with `alerta: "retrasado"`

#### Scenario: Full-screen kiosk mode
- GIVEN the work room display is configured as full-screen
- WHEN the page loads
- THEN it enters full-screen API mode (user gesture required on first interaction)

## Dependencies
- RF-08: Blocked detection
- RF-09: Delayed detection
- RF-10: Stale detection
- RF-17: Active services view
