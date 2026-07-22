# Plan de Pruebas E2E — ServicioSTS

## TestSprite MCP — Casos de Uso

> **Proyecto**: ServicioLocalSTS (F:\STS\ServicioLocalSTS)  
> **Stack**: Vite + React + TypeScript + Tailwind CSS  
> **Backend**: Node.js + Express (remoto en Vercel)  
> **Base de datos**: PostgreSQL (Supabase)  
> **Herramienta**: TestSprite MCP v0.0.39  
> **Fecha**: Julio 2026

---

## Índice

1. [Objetivo](#objetivo)
2. [Flujo de datos del negocio](#flujo-de-datos-del-negocio)
3. [Casos de uso](#casos-de-uso)
   1. [CU-01: Registro y seguimiento de servicio técnico](#cu-01-registro-y-seguimiento-de-servicio-técnico)
   2. [CU-02: Ejecución de tareas con tracking de tiempo](#cu-02-ejecución-de-tareas-con-tracking-de-tiempo)
   3. [CU-03: Evidencias fotográficas por tarea](#cu-03-evidencias-fotográficas-por-tarea)
   4. [CU-04: Calificación del servicio por el cliente](#cu-04-calificación-del-servicio-por-el-cliente)
   5. [CU-05: Dashboard de rendimiento del colaborador](#cu-05-dashboard-de-rendimiento-del-colaborador)
   6. [CU-06: Reportes de productividad por área](#cu-06-reportes-de-productividad-por-área)
   7. [CU-07: Panel de administración y toma de decisiones](#cu-07-panel-de-administración-y-toma-de-decisiones)
   8. [CU-08: Visualización pública del progreso](#cu-08-visualización-pública-del-progreso)
4. [Métricas validadas en cada caso](#métricas-validadas-en-cada-caso)
5. [Escenarios de datos de prueba](#escenarios-de-datos-de-prueba)

---

## Objetivo

Validar que el flujo completo de datos desde que un **técnico/colaborador** ejecuta un servicio hasta que la **administración** toma decisiones basadas en métricas agregadas funciona correctamente. Cada caso de prueba cubre una transición del ciclo: **datos crudos → métricas operativas → indicadores de gestión**.

---

## Flujo de datos del negocio

```
CLIENTE                          COLABORADOR/TÉCNICO              ADMINISTRACIÓN
    │                                    │                              │
    ▼                                    ▼                              ▼
┌─────────────────┐           ┌─────────────────────┐        ┌─────────────────────┐
│ Llega con       │           │ Inicia servicio      │        │ Dashboard           │
│ equipo dañado   │──────────▶│ Tracking de tiempo   │────────▶│ KPIs del sistema    │
│ Solicita        │           │ Completa tareas      │        │ Eficiencia global   │
│ servicio        │           │ Sube evidencias      │        │ Tiempos promedio    │
└─────────────────┘           │ Finaliza servicio    │        │ NPS                 │
         │                    └─────────────────────┘        └─────────────────────┘
         ▼                             │                              │
┌─────────────────┐                    │                              │
│ Seguimiento     │                    │        ┌─────────────────────┐
│ público         │                    │        │ Reportes            │
│ vía código      │                    ├────────▶│ Eficiencia x área   │
│ + calificación  │                    │        │ Productividad       │
└─────────────────┘                    │        │ por colaborador     │
                                       │        └─────────────────────┘
                                       │                    │
                                       │        ┌─────────────────────┐
                                       │        │ Rendimiento         │
                                       └────────▶│ Sistema             │
                                                │ Calificaciones      │
                                                │ Tendencias          │
                                                └─────────────────────┘
                                                               │
                                                               ▼
                                                ┌─────────────────────────┐
                                                │ DECISIÓN:               │
                                                │ - Ajustar plantillas    │
                                                │ - Reasignar personal    │
                                                │ - Identificar fallas    │
                                                │   recurrentes           │
                                                │ - Mejorar tiempos       │
                                                │   estimados             │
                                                └─────────────────────────┘
```

---

## Casos de uso

---

### CU-01: Registro y seguimiento de servicio técnico

**Rol**: Administrador / Encargado  
**Datos que genera**: Servicio, cliente, asignación de técnico  
**Flujo**:

1. El admin inicia sesión con credenciales de administrador
2. Navega a "Nuevo Servicio"
3. Registra los datos del cliente: nombres, DNI, teléfono, dirección
4. Describe el equipo (marca, modelo, serie) y la falla reportada
5. Selecciona un tipo de servicio y falla común
6. Asigna el área responsable y el técnico principal
7. Selecciona una plantilla de tareas para el servicio
8. Confirma la creación → el sistema genera un código único
9. Se verifica que el servicio aparece en la lista de servicios con estado "pendiente"

**Validación**: El servicio se crea con código único, queda pendiente, y el técnico asignado lo ve en su bandeja.

**Datos generados para administración**:

| Dato | Tabla | Uso en decisión |
|------|-------|-----------------|
| servicio_id, codigo | servicios | Trazabilidad |
| Falla común | fallas_comunes | Identificar fallas recurrentes |
| Técnico asignado | serviciocolaboradores | Carga de trabajo |
| Tiempo estimado | servicios.tiempo_estimado | Base para eficiencia |

---

### CU-02: Ejecución de tareas con tracking de tiempo

**Rol**: Colaborador / Técnico  
**Datos que genera**: Tiempos reales por tarea, progreso del servicio  
**Flujo**:

1. El colaborador inicia sesión
2. Ve sus servicios asignados en "Mi Área" o "Mi Desempeño"
3. Abre un servicio en progreso
4. Inicia el tracking de tiempo en la primera tarea
5. Trabaja durante un período (por ejemplo, 5 minutos)
6. Pausa o completa la tarea → se registra `tarea_tiempo_real`
7. Repite para tareas subsiguientes
8. Completa todas las tareas → el servicio pasa a "completado"

**Validación**:

- `tiempo_tracking` registra inicio, pausa y fin correctamente
- `tareas.tarea_tiempo_real` se actualiza
- El servicio cambia a estado "completado"
- Se calcula: `eficiencia = tiempo_estimado / tiempo_real * 100`

**Datos generados para administración**:

| Dato | Tabla | Uso en decisión |
|------|-------|-----------------|
| tarea_tiempo_real | tareas | Eficiencia vs estimado |
| Tracking por tarea | tiempo_tracking | Productividad real |
| Fecha/hora fin | servicios | Ciclo de vida del servicio |
| Eficiencia calculada | (frontend) | Ranking de colaboradores |

---

### CU-03: Evidencias fotográficas por tarea

**Rol**: Colaborador / Técnico  
**Datos que genera**: Evidencia visual del trabajo, validación del cliente  
**Flujo**:

1. El colaborador abre un servicio con tareas que requieren evidencia
2. Al completar una tarea, el sistema solicita capturar foto o video
3. El colaborador toma una foto del trabajo realizado (antes/después)
4. Agrega un comentario descriptivo
5. La evidencia queda en estado "pendiente"
6. El cliente (vía enlace público) ve la evidencia y la aprueba o rechaza

**Validación**:

- `evidencias` registra archivo con tipo, URL y estado
- El cliente puede ver evidencias marcadas como `mostrar_cliente = true`
- Comentarios del cliente y colaborador se asocian correctamente

**Datos generados para administración**:

| Dato | Tabla | Uso en decisión |
|------|-------|-----------------|
| Evidencias aprobadas/rechazadas | evidencias | Calidad del servicio |
| Comentarios del cliente | comentariosevidencias | Satisfacción |
| Ratio evidencia/tarea | (frontend) | Cobertura de documentación |

---

### CU-04: Calificación del servicio por el cliente

**Rol**: Cliente  
**Datos que genera**: Calificación (1-5), comentarios, sugerencias  
**Flujo**:

1. El cliente accede al enlace público del servicio (SeguimientoCliente)
2. Ve los detalles del servicio: estado, tareas completadas, evidencias
3. El cliente califica el servicio del 1 al 5
4. Opcionalmente agrega un comentario y sugerencia
5. La calificación se guarda en `calificaciones`

**Validación**:

- `calificaciones.calificacion_puntaje` entre 1 y 5 (CHECK constraint)
- La calificación se refleja en el Dashboard (promedio, NPS)
- Los reportes de RendimientoSistema muestran la nueva calificación

**Datos generados para administración**:

| Dato | Tabla | Uso en decisión |
|------|-------|-----------------|
| Puntaje | calificaciones | NPS, satisfacción promedio |
| Comentario/sugerencia | calificaciones | Mejora continua |
| Fecha | calificaciones | Tendencia temporal |

**Impacto en decisiones**:

```
NPS = (Promotores - Detractores) / Total * 100

Si NPS < 30 → Revisar procesos de servicio
Si calificación < 3 repetidamente → Reasignar técnico o capacitación
```

---

### CU-05: Dashboard de rendimiento del colaborador

**Rol**: Colaborador  
**Datos que consume**: Sus propias métricas de desempeño  
**Flujo**:

1. El colaborador abre "Mi Desempeño" (ruta: `/midesempeno`)
2. Ve:
   - **Servicios completados** (conteo)
   - **Eficiencia promedio**: `sum(tiempo_estimado) / sum(tiempo_real) * 100`
   - **Calificación promedio**: promedio de calificaciones recibidas
   - **Tareas completadas**: total de tareas terminadas
   - **Tiempo total tracking**: suma de tracking de sus servicios
   - **Productividad**: tareas/día
3. Puede filtrar por período (hoy, semana, mes)

**Validación**:

- Los números reflejan exactamente los datos generados en CU-01 a CU-04
- La eficiencia se calcula como porcentaje
- No ve datos de otros colaboradores

**Datos generados para administración**:

| Métrica | Fórmula | Decisión |
|---------|---------|----------|
| Eficiencia | tiempo_estimado / tiempo_real | Identificar sobrecostos |
| Calificación promedio | AVG(puntaje) | Calidad percibida |
| Productividad | tareas / días trabajados | Asignación de carga |

---

### CU-06: Reportes de productividad por área

**Rol**: Administrador / Encargado  
**Datos que consume**: Métricas agregadas por área y colaborador  
**Flujo**:

1. El administrador abre "Reportes" (ruta: `/reportes`)
2. Selecciona vista **por colaborador**:
   - Muestra tarjeta resumen por cada técnico
   - Columnas: Nombre, Tareas completadas, Tiempo Prom., Eficiencia, Rendimiento, Productividad
3. Cambia a vista **por área**:
   - Muestra tarjeta resumen por área
   - Columnas: Área, Servicios, Tareas, Tiempo Prom., Eficiencia
4. Puede filtrar por fecha (rango de fechas)

**Validación**:

- Las métricas calculadas concuerdan con los datos base
- El filtro de fechas afecta correctamente los agregados
- La eficiencia del área es coherente con la suma de eficiencias individuales

**Métricas clave para decisión**:

```
Rendimiento = (tareas_completadas / tareas_totales) * 100
Productividad = tareas_completadas / días
Eficiencia = tiempo_estimado / tiempo_real * 100
```

---

### CU-07: Panel de administración y toma de decisiones

**Rol**: Administrador  
**Datos que consume**: KPIs globales y del sistema  
**Flujo**:

1. El administrador abre el Dashboard (ruta: `/dashboard`)
2. En **IndicadoresTab** ve:
   - **Servicios completados hoy** → decisión: ¿vamos al día?
   - **Tiempo promedio por servicio** → decisión: ¿los estimados son realistas?
   - **Tasa de cumplimiento**: servicios completados / total del día
   - **Eficiencia general**: promedio de eficiencias del período
   - **Servicios por técnico**: balance de carga
3. En **KPIs del Sistema** ve:
   - **NPS**: Net Promoter Score
   - **Satisfacción promedio**: 1-5
   - **Tasa de retorno**: servicios recurrentes
4. En **RankingTab** ve colaboradores ordenados por eficiencia
5. Abre **RendimientoSistema** (ruta: `/rendimiento-sistema`)
   - SummaryCards: Servicios totales, Tasa completados, Promedio x servicio, Eficiencia global
   - CalificacionesTab: distribución de puntajes 1-5
   - ColaboradoresTab: ranking completo
   - SistemaTab: tiempos por tipo de servicio, fallas comunes frecuentes

**Decisiones que habilita**:

| Indicador | Umbral | Acción |
|-----------|--------|--------|
| NPS < 30 | Crítico | Revisar proceso de atención |
| Eficiencia < 70% | Alerta | Capacitar o reasignar |
| Tasa cumplimiento < 80% | Revisión | Ajustar asignaciones |
| Falla común repetida | Investigar | Actualizar procedimiento |
| Colaborador con eficiencia > 120% | Revisar | ¿Estimado incorrecto? |

---

### CU-08: Visualización pública del progreso

**Rol**: Cliente (sin autenticación)  
**Datos que consume**: Estado del servicio, progreso, evidencias  
**Flujo**:

1. El cliente accede a `/seguimiento/{codigo}` sin login
2. Ve:
   - Estado actual del servicio
   - Tareas completadas / total
   - Barra de progreso
   - Tiempo transcurrido vs estimado
   - Evidencias (las marcadas como visibles)
3. Puede escribir comentarios visibles al técnico

**Validación**:

- Acceso público sin autenticación
- Solo datos del servicio específico (no otros)
- Progreso se actualiza en tiempo real

---

## Métricas validadas en cada caso

| # | Métrica | Fórmula | Dónde aparece | Decisión que habilita |
|---|---------|---------|---------------|----------------------|
| 1 | **Eficiencia** | tiempo_estimado / tiempo_real × 100 | MiDesempeno, Reportes, Dashboard, Ranking | ¿El técnico rinde dentro de lo esperado? |
| 2 | **NPS** | (Promotores - Detractores) / Total × 100 | Dashboard KPI, RendimientoSistema | ¿Clientes recomendarían el servicio? |
| 3 | **Satisfacción** | AVG(calificacion_puntaje) | Dashboard, RendimientoSistema, MiArea | ¿Calidad general del servicio? |
| 4 | **Tasa cumplimiento** | Completados / Total × 100 | Dashboard, RendimientoSistema | ¿Cumplimos con la demanda? |
| 5 | **Productividad** | tareas_completadas / días | Reportes, MiDesempeno | ¿Carga de trabajo adecuada? |
| 6 | **Tiempo promedio** | AVG(tiempo_real) | Dashboard, Reportes, Áreas | ¿Estimados son precisos? |
| 7 | **Rendimiento** | tareas_completadas / tareas_totales × 100 | Reportes (columna) | ¿Avance real del trabajo? |
| 8 | **Cobertura tracking** | tareas con tracking / tareas totales × 100 | ServicioDetail | ¿Se registró tiempo en todas las tareas? |
| 9 | **Ciclo de vida** | fecha_fin - fecha_inicio | ServicioDetail, Dashboard | ¿Cuánto toma un servicio promedio? |
| 10 | **Variación eficiencia** | eficiencia_actual - eficiencia_periodo_anterior | Dashboard RankingTab | ¿El equipo mejora o empeora? |

---

## Escenarios de datos de prueba

Para que los tests E2E tengan datos significativos, se requieren:

### Escenario A: Servicio rápido exitoso
- **Tipo**: Instalación de software
- **Tiempo estimado**: 30 min
- **Técnico**: Eficiente (experiencia en el tipo)
- **Tareas**: 3 tareas sencillas
- **Evidencias**: 1 foto "después"
- **Calificación esperada**: 5

### Escenario B: Servicio complejo con retraso
- **Tipo**: Reparación de hardware
- **Tiempo estimado**: 60 min
- **Técnico**: En entrenamiento
- **Tareas**: 5 tareas (diagnóstico, reparación, prueba)
- **Tracking**: Tiempo real supera estimado
- **Evidencias**: 3 fotos (antes/durante/después)
- **Calificación esperada**: 4

### Escenario C: Servicio con evidencia rechazada
- **Tipo**: Mantenimiento preventivo
- **Tiempo estimado**: 45 min
- **Evidencias**: Foto de baja calidad → cliente rechaza
- **Calificación esperada**: 3

### Escenario D: Servicio sin calificación
- **Tipo**: Consultoría
- **Tiempo estimado**: 20 min
- **Cliente**: No califica
- **Validación**: Dashboard muestra "sin calificación" en los reportes

### Escenario E: Múltiples servicios, múltiples técnicos
- **5 servicios** distribuidos entre **3 técnicos** de **2 áreas**
- Sirve para probar agregación en Reportes, Dashboard y RendimientoSistema

---

> **Nota**: Este plan está diseñado para ejecutarse con TestSprite MCP.  
> La ejecución requiere que el servidor local esté corriendo en modo producción  
> (`npm run build && npm run preview` o `npm run dev`).
>
> Archivo de resultados: `F:\STS\test-sprite-resultados.md`
