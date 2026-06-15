# Especificación: Ayuda-contextual-por-rol

## Capability: `help-contextual`

Sistema de ayuda contextual embebido. Drawer lateral (Sheet shadcn/ui) accesible desde la topbar, con contenido de ayuda diferenciado por ruta actual + rol del usuario.

---

## Functional Requirements

| ID | Nombre | Descripción | Prioridad |
|---|---|---|---|
| FR-001 | Botón en topbar | Botón ghost con icono HelpCircle en topbar junto a Settings. Tooltip "Ayuda contextual". Visible solo en páginas autenticadas. | MUST |
| FR-002 | Sheet lateral | Sheet shadcn/ui side="right" w-[400px]. Header amarillo + título "Ayuda" + badge rol + botón cerrar. Body con ScrollArea. Cierra con backdrop click, Escape, o botón X. | MUST |
| FR-003 | Contenido por ruta | Resuelve contenido según `useLocation().pathname`. Mapa tipado ruta→secciones en `help-content.ts`. Cada sección: título, descripción, pasos opcionales, screenshots opcionales. | MUST |
| FR-004 | Contenido por rol | Mapa `ruta → { [rol]: Seccion[] }`. Cada ruta puede tener contenido distinto por rol (sistema, admin, encargado, colaborador). Roles sin contenido para esa ruta ven fallback de ese rol. | MUST |
| FR-005 | Badge de rol | Badge inline en header del Sheet: "Rol: {nombre}". Colores: sistema=purple, admin=blue, encargado=orange, colaborador=green. | MUST |
| FR-006 | Screenshots | Secciones pueden incluir imágenes PNG desde `/public/help/`. max-w-full, rounded-lg border, alt text descriptivo, caption opcional. Error silencioso si la imagen no existe. | SHOULD |
| FR-007 | Fallback genérico | Rutas sin contenido mapeado muestran mensaje genérico "Bienvenido a ServicioLocalSTS" con enlaces rápidos. Nunca sheet vacío ni error. | MUST |
| FR-008 | TOC navegación | Índice al inicio del sheet con links a cada sección. Scroll suave `scrollIntoView({ behavior: 'smooth' })`. | SHOULD |
| FR-009 | Sin fetching | Todo el contenido es inline TypeScript. Cero llamadas de red al abrir el Sheet. | MUST |
| FR-010 | Compatibilidad sidebar | Sheet abre a la derecha. Sidebar existente (si existe) está a la izquierda. Sin superposición visual ni de estado. | MUST |

---

## Non-Functional Requirements

| ID | Nombre | Especificación |
|---|---|---|
| NFR-001 | Rendimiento | Contenido 100% estático. Sin fetching. Sheet no provoca re-renders del contenido de página. Renderizado lazy (no monta hasta apertura). |
| NFR-002 | Accesibilidad | Sheet con role="dialog" aria-modal="true". Foco se mueve al sheet al abrir, se restaura al cerrar. Escape y backdrop cierran. Botón cerrar con aria-label="Cerrar ayuda". Tab navigation contenida dentro del sheet. |
| NFR-003 | Mantenibilidad | Contenido tipado: `Record<string, Partial<Record<Rol, Seccion[]>>>`. Añadir ruta = agregar entrada al mapa. Un solo archivo `help-content.ts`. Screenshots nombrados por ruta-contexto. |

---

## Content Specification

| Ruta | sistema | admin | encargado | colaborador |
|---|---|---|---|---|
| /dashboard | — | KPIs, accesos rápidos, filtros | — | — |
| /mi-area | — | — | Tareas equipo, aprobaciones | Mis tareas, reportar horas |
| /servicios | Config servicios | Gestión, categorías | Supervisión asignados | Ver servicios activos |
| /servicios/:id | — | Editar, asignar recursos | Seguimiento, estado | Detalle, comentar |
| /servicios/nuevo | — | Campos, workflow | Crear desde plantilla | Solicitar servicio |
| /usuarios | Roles, CRUD, permisos | — | — | — |
| /plantillas | — | Crear/editar plantillas | Usar/solicitar plantillas | Ver disponibles |
| /reportes | — | Tipos, exportar, programar | Reportes equipo | — |
| /auditoria | — | Log cambios, filtros | — | — |
| /manager/clientes | Config módulo | Gestión clientes, historial | — | — |
| /manager/desempeno | Config métricas | Evaluaciones, métricas | Evaluar colaboradores | — |
| /comunicaciones | — | Anuncios, notificaciones | Comunicarse con equipo | Bandeja entrada |
| /areas | Config áreas | CRUD, asignar encargados | — | — |

Para cada celda con "—": el rol ve el fallback genérico de esa ruta (mensaje base + enlaces).

---

## UI Requirements

| Elemento | Especificación |
|---|---|
| Sheet | shadcn/ui Sheet, side="right", w-[400px] (desktop), w-full (mobile < 640px) |
| Header | bg-yellow-50, border-b border-yellow-200, p-4, título "Ayuda" text-lg font-semibold |
| Badge | Inline en header, colores por rol, formato "Rol: {nombre}" |
| Cerrar | Button ghost top-right, icono X, aria-label="Cerrar ayuda" |
| Body | ScrollArea, p-6, espacio entre secciones |
| Secciones | mb-6, título text-base font-semibold, descripción text-sm text-muted-foreground |
| Pasos | Lista numerada (ol > li) con espacio entre items |
| Screenshots | img max-w-full rounded-lg border, caption text-xs text-center text-muted-foreground |
| TOC | Al inicio del body, links estilizados, mb-6, border-b pb-4 |
| Backdrop | bg-black/50 |

---

## Scenarios / User Stories

### Rol: Colaborador
**Scenario**: CO-01 — Consultar ayuda en MiArea
- GIVEN un colaborador autenticado en /mi-area
- WHEN hace click en el botón de ayuda de la topbar
- THEN el Sheet se abre mostrando "Mis tareas pendientes" y "Cómo reportar horas"
- AND ve un screenshot del panel de tareas

### Rol: Encargado
**Scenario**: EN-01 — Supervisar servicios
- GIVEN un encargado autenticado en /servicios
- WHEN abre la ayuda contextual
- THEN el contenido muestra secciones específicas para encargado: "Supervisar servicios asignados" y "Actualizar estados"
- AND el badge dice "Rol: Encargado" con color naranja

### Rol: Admin
**Scenario**: AD-01 — Explorar reportes
- GIVEN un admin autenticado en /reportes
- WHEN abre la ayuda
- THEN ve una tabla de tipos de reporte con descripciones y pasos para exportar

### Rol: Sistema
**Scenario**: SI-01 — Gestionar usuarios
- GIVEN un usuario sistema autenticado en /usuarios
- WHEN abre la ayuda
- THEN ve una guía completa de roles, permisos y CRUD de usuarios con screenshot del panel

### Fallback genérico
**Scenario**: FB-01 — Ruta sin contenido específico
- GIVEN un colaborador autenticado en /configuracion (ruta sin mapeo)
- WHEN abre la ayuda
- THEN ve el mensaje "Bienvenido a ServicioLocalSTS" con enlaces a secciones principales

---

## Acceptance Criteria

| FR | Criterio |
|---|---|
| FR-001 | Botón visible en toda página autenticada. No visible en /login. Click abre Sheet. Tooltip presente. |
| FR-002 | Sheet anima desde derecha. Header con título + badge + X. ScrollArea funcional. Cierra con backdrop, Escape, botón X. |
| FR-003 | /servicios muestra contenido de servicios. /dashboard muestra contenido de dashboard. Ruta sin mapeo → fallback. |
| FR-004 | Admin en /servicios ve contenido admin. Colaborador en /servicios ve contenido colaborador. Rol sin contenido → fallback. |
| FR-005 | Badge muestra "Rol: Administrador" (o el rol actual). Color coincide con el rol. |
| FR-006 | Screenshots se renderizan con alt text. Imagen faltante no rompe el sheet (fallback silencioso). |
| FR-007 | Ruta sin contenido mapeado muestra fallback. Sheet nunca está vacío ni muestra error. |
| FR-008 | TOC con links. Click navega suavemente a la sección. |
| FR-009 | Cero llamadas fetch al abrir el sheet. DevTools Network tab no muestra requests nuevas. |
| FR-010 | Sidebar y Sheet coexisten sin superposición. Ambos operan independientemente. |

---

## Archivos a crear/modificar

- **Nuevo**: `src/app/help/help-types.ts` — interfaces y tipos
- **Nuevo**: `src/app/help/HelpButton.tsx` — botón en topbar
- **Nuevo**: `src/app/help/RolBadge.tsx` — badge de rol con colores
- **Nuevo**: `src/app/help/HelpDrawer.tsx` — Sheet wrapper + lógica de resolución
- **Nuevo**: `src/app/help/help-content.ts` — mapa de contenido (1170 líneas, 12 rutas, todos los roles)
- **Nuevo**: `src/app/help/index.ts` — barrel exports
- **Nuevo**: `public/help/*.png` — screenshots (12 placeholders)
- **Modificado**: `src/app/layout/Layout.tsx` — integrar HelpButton y HelpDrawer
