# Reportes — Specification

## Purpose
Collaborator and area reports with Excel/PDF export. Covers RF-44, RF-45, RF-46.

## Requirements

### RF-44: Collaborator Reports
The system MUST generate per-collaborator reports showing: services worked on, total time logged, tasks completed, efficiency (tasks/time). Filterable by date range.

#### Scenario: Generate collaborator report
- GIVEN usuario/5 has worked on 10 services with 40h logged
- WHEN GET `/api/reportes/colaborador/5?desde=2026-01-01&hasta=2026-06-01`
- THEN the response includes { services_count, total_hours, tasks_completed, efficiency_ratio }

### RF-45: Area Reports
The system MUST generate per-area reports with productivity metrics and trends over time.

#### Scenario: Area productivity report
- GIVEN area/3 has completed 20 services this month
- WHEN GET `/api/reportes/area/3?periodo=mensual`
- THEN the response includes { completed_count, avg_completion_time, trend_data[] }

### RF-46: Export to Excel/PDF
The system MUST support exporting reports in XLSX and PDF formats via query parameter `?formato=xlsx|pdf`.

#### Scenario: Export collaborator report to Excel
- GIVEN a collaborator with service history
- WHEN GET `/api/reportes/colaborador/5/exportar?formato=xlsx&desde=2026-01-01&hasta=2026-06-01`
- THEN the response is a downloadable XLSX file with Content-Disposition header

#### Scenario: Invalid format rejected
- WHEN GET with `?formato=csv`
- THEN the system returns 400 with supported formats listed

#### Scenario: Empty report exports
- GIVEN a new collaborator with no services
- WHEN exporting their report
- THEN the system returns a valid file with header row and "No data" message

## Dependencies
- RF-11: Productivity indicators must exist
- RF-25: Areas must exist
- RF-04: Users must have identifiers
