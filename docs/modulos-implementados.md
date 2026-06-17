0# Módulos Implementados — ServicioLocalSTS

---

## Módulo: Login

### Ubicación
| Capa | Archivos |
|------|----------|
| Backend | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `auth.schema.ts` |
| Frontend | `src/app/pages/login/Login.tsx` |

### Backend — Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | No | Login con username + password. Verifica `usuario_activo`, compara con bcrypt, registra `usuario_ultimo_login`, genera JWT con `{user_id, rol, area_id}` |
| `POST` | `/api/auth/refresh` | Bearer token | Refresca JWT. Verifica que el usuario siga activo, re-obtiene `area_id` actualizado según rol |
| `GET` | `/api/auth/me` | JWT | Devuelve `{user_id, rol, area_id}` del token actual |
| `PATCH` | `/api/auth/password` | JWT | Cambio de contraseña propia. Valida contraseña actual con bcrypt antes de actualizar |

### Frontend — Componentes y Flujo

- **Login.tsx**: Formulario de login con username + password. Muestra skeleton de carga, alertas de error (credenciales inválidas, usuario desactivado).
- **Auth Context** (`src/lib/auth.ts`): Guarda `auth_token` y `auth_user` en `sessionStorage`. Provee `useAuth()` con `{user, login, logout, isLoading}`.
- **Interceptor Axios** (`src/api/client.ts`): Adjunta JWT automáticamente en cada request. Maneja refresh automático en 401 con cola de requests pendientes.
- **Rutas protegidas**: Layout principal verifica `auth_token` en sessionStorage; redirect a `/login` si no hay.

### Roles autenticados
- `sistema` — super-admin, acceso total
- `admin` — gestor, sin restricciones de área
- `encargado` — responsable de área, scope limitado a su área
- `colaborador` — técnico, scope limitado a sus asignaciones

### Schema validación (Zod)
```typescript
loginSchema = { username: string().min(1), password: string().min(1) }
```

---

## Módulo: Usuarios

### Ubicación
| Capa | Archivos |
|------|----------|
| Backend | `backend/src/modules/usuarios/usuarios.controller.ts` |
| Frontend | `src/app/pages/usuarios/Usuarios.tsx` |
| Queries | `src/api/queries/useUsuarios.ts` |

### Backend — Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/usuarios` | sistema, admin, encargado | Lista usuarios (hasta 50). No expone contraseñas |
| `POST` | `/api/usuarios` | sistema | Crea usuario. Auto-genera username desde nombre + apellido paterno. Hash bcrypt de password. Audita creación |
| `PUT` | `/api/usuarios/:id` | sistema | Actualiza datos. Re-genera username si cambios en nombre/apellido. Re-asigna áreas si se pasa `area_ids`. Audita |
| `PATCH` | `/api/usuarios/:id/estado` | sistema | Toggle `usuario_activo`. Solo cambia el flag — no desasigna áreas ni servicios |

### Frontend — Componentes

- **UsuariosPage**: Tabla con filtros por búsqueda y rol. Columnas: username, nombre completo, email, DNI, teléfono, rol (con badges de color), fecha de registro, estado (toggle), acciones.
- **Modal crear/editar**: Formulario con campos: username (bloqueado/auto-generado), password (solo en creación u opcional en edición), nombres *, apellido paterno *, apellido materno, email *, DNI, teléfono, rol (select bloqueado según restricciones).
- **Confirm toggle dialog**: Modal de confirmación antes de activar/desactivar.

### Reglas de negocio
- **Username**: auto-generado desde `{nombre}.{apellido_paterno}`, no editable.
- **Password creación**: fijo `"colaborador2026"`.
- **Roles bloqueados**: sistema y encargado no pueden cambiar de rol. Colaborador con áreas asignadas tampoco.
- **Roles permitidos en formulario**: `colaborador`, `encargado`, `admin`, `sistema` (solo sistema puede crear/editar).
- **Rol creación**: solo se puede crear `colaborador` o `admin` (no `sistema` ni `encargado`, que se asignan automáticamente).

### Schema validación (Zod)

**Crear**:
```typescript
{
  password: string().min(6).max(100),
  nombres: string().min(1).max(150),
  apellido_paterno: string().min(1).max(100),
  apellido_materno: string().max(100).optional(),
  apellidos: string().max(150).optional(),  // compatibilidad
  dni: string().max(20).optional(),
  telefono: string().max(20).optional(),
  email: string().email(),
  rol: enum("admin", "colaborador", "sistema"),
  area_ids: number[].optional(),
}
```

**Actualizar**:
```typescript
{
  // Todos los campos opcionales
  nombres, apellido_paterno, apellido_materno, apellidos,
  dni, telefono, email, username, password, area_ids,
  rol: enum("admin", "colaborador", "sistema", "encargado"),
}
```

### Validaciones adicionales
- DNI único (verifica duplicados antes de guardar).
- Usuario desactivado no puede iniciar sesión (`usuario_activo = false`).

---

## Módulo: Servicios

### Ubicación
| Capa | Archivos |
|------|----------|
| Backend | `backend/src/modules/servicios/servicios.controller.ts` |
| Frontend | `src/app/pages/servicios/Servicios.tsx`, `ServicioDetail.tsx`, `NuevoServicio.tsx`, `components/CommentsTab.tsx` |
| Queries | `src/api/queries/useServicios.ts` |

### Backend — Endpoints

#### Servicios
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/servicios` | cualquier rol | Lista servicios. Filtro por estado. Colaborador solo ve sus asignados. Encargado solo ve su área |
| `GET` | `/api/servicios/:id` | cualquier rol | Detalle de servicio con colaborador asignado |
| `POST` | `/api/servicios` | cualquier rol | Crea servicio con código auto-generado `SRV{YYYYMMDDHHMMSS}`. Soporta datos completos de cliente, equipo, accesorios |
| `PUT` | `/api/servicios/:id` | cualquier rol | Actualiza título y descripción |
| `PATCH` | `/api/servicios/:id/estado` | admin, encargado | Cambia estado: `pendiente → en_progreso → completado`, `bloqueado` (requiere motivo), `cancelado`. Registra fechas de inicio/fin |
| `POST` | `/api/servicios/:id/iniciar` | cualquier rol | Inicia servicio (pasa de pendiente a en_progreso con fecha/hora) |

#### Tareas
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/servicios/:id/tareas` | cualquier rol | Lista tareas ordenadas |
| `POST` | `/api/servicios/:id/tareas` | cualquier rol | Crea tarea con orden auto-incremental |
| `PUT` | `/api/tareas/:id` | cualquier rol | Actualiza título de tarea |
| `PATCH` | `/api/servicios/:id/tareas/:tareaId` | cualquier rol | Edición inline de título |
| `DELETE` | `/api/tareas/:id` | cualquier rol | Elimina tarea y sus comentarios asociados |
| `PATCH` | `/api/tareas/:id/completar` | cualquier rol | Marca tarea como completada. Si es la última, cierra el servicio automáticamente |
| `PATCH` | `/api/tareas/:id/reabrir` | cualquier rol | Reabre tarea (vuelve a pendiente) |
| `PUT` | `/api/tareas/reordenar` | cualquier rol | Reordena tareas por lotes |

#### Cronómetro (tiempo_tracking)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/servicios/:id/tiempos` | cualquier rol | Resumen de tracking por tarea |
| `POST` | `/api/tareas/:id/tiempo/iniciar` | cualquier rol | Inicia cronómetro en tarea. Finaliza tracking activo previo |
| `GET` | `/api/tareas/:id/tiempo` | cualquier rol | Historial de tracking de una tarea |
| `PATCH` | `/api/tiempo/:id/pausar` | cualquier rol | Pausa tracking activo |
| `PATCH` | `/api/tiempo/:id/reanudar` | cualquier rol | Reanuda tracking pausado |
| `PATCH` | `/api/tiempo/:id/finalizar` | cualquier rol | Finaliza tracking. Calcula minutos y acumula en `tarea_tiempo_real` |

#### Evidencias
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/servicios/:id/evidencias` | cualquier rol | Lista evidencias del servicio |
| `POST` | `/api/evidencias/upload` | cualquier rol | Sube evidencia (photo/video) en base64 |
| `POST` | `/api/evidencias/:id/comentario` | cualquier rol | Agrega comentario a evidencia |
| `PATCH` | `/api/evidencias/:id/estado` | cualquier rol | Cambia estado de evidencia |
| `PATCH` | `/api/tareas/:id/evidencia-config` | cualquier rol | Configura si una tarea requiere evidencia |
| `GET` | `/api/public/servicios/:codigo/evidencias` | No | Evidencias públicas de un servicio por código |
| `POST` | `/api/public/evidencias/:id/comentario` | No | Comentario público a evidencia |

### Frontend — Componentes

- **Servicios.tsx**: Vista principal con tabla de servicios (código, título, cliente, estado, prioridad, área, colaborador, progreso, acciones). Filtros por estado y búsqueda.
- **NuevoServicio.tsx**: Formulario completo de creación con datos de cliente (nombres, DNI, apellidos, teléfono, email), equipo (descripción, serie, detalles), accesorio, reporte del cliente, diagnóstico, área, colaborador asignado, plantilla inicial.
- **ServicioDetail.tsx**: Vista detallada con tabs:
  - Información general del servicio
  - Lista de tareas con drag & drop (reordenar), check completar, inline edit
  - Comentarios
  - Evidencias (fotos/videos)
  - Tracking de tiempo
  - Encuesta de satisfacción
- **CommentsTab.tsx**: Lista de comentarios con formulario de nuevo comentario.

### Schema validación (Zod)

```typescript
servicioSchema = {
  titulo: string().min(1),
  descripcion, cliente_email, area_id, prioridad, tiempo_estimado,
  cliente_dni, cliente_apellido_paterno, cliente_apellido_materno,
  cliente_nombres, cliente_telefono, descripcion_equipo, serie_equipo,
  detalles_equipo, descripcion_accesorio, detalles_accesorio,
  cliente_reporte, diagnostico_inicial, id_plantilla_inicial, colaborador_id
}

tareaSchema = { titulo: string().min(1), descripcion: string().optional() }
```

---

## Módulo: Seguimiento de progreso — Cliente

### Ubicación
| Capa | Archivos |
|------|----------|
| Backend | `backend/src/modules/seguimiento/seguimiento.controller.ts` |
| Backend | `backend/src/modules/display/display.controller.ts` |
| Frontend | `src/app/pages/seguimiento/SeguimientoCliente.tsx` |
| Frontend | `src/app/pages/servicios/ServicioPublico.tsx` |
| Frontend | `src/app/pages/display/DisplayTV.tsx` |
| Frontend | `src/app/pages/display/DisplayWaitingRoom.tsx` |

### Rutas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/seguimiento-cliente` | `SeguimientoClientePage` | Portal público: formulario para ingresar código + DNI |
| `/public/servicio/:codigo` | `ServicioPublicoPage` | Vista pública de seguimiento de un servicio |
| `/display/tv` | `DisplayTVPage` | Pantalla TV pública con servicios en progreso |
| (ruta anidada en display) | `DisplayWaitingRoomPage` | Sala de espera: estado de un servicio específico |

### Backend — Endpoints Públicos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/public/servicios/:codigo` | No | Obtiene estado completo de un servicio por código. Incluye: datos del servicio, tareas con progreso %, tiempo transcurrido, encuesta existente, nombre del área |
| `GET` | `/api/public/servicios/:codigo/evidencias` | No | Evidencias públicas del servicio (fotos visibles al cliente) |
| `POST` | `/api/public/evidencias/:id/comentario` | No | El cliente puede comentar en una evidencia |
| `GET` | `/api/public/display/tv` | No | Servicios en progreso para TV corporativa |

### Backend — Encuestas (calificaciones)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/servicios/:id/encuesta` | JWT | Crea encuesta de satisfacción (1-5 estrellas + comentario + sugerencia) |
| `GET` | `/api/servicios/:id/encuesta` | JWT | Obtiene encuesta existente |

### Flujo Cliente

1. **Portal público** (`/seguimiento-cliente`):
   - Formulario minimalista con campo "Código de servicio" y "DNI"
   - Al enviar, redirige a `/public/servicio/:codigo?dni=:dni`

2. **Vista pública de servicio** (`/public/servicio/:codigo`):
   - Header con código, estado (badge colorido: azul=en_progreso, verde=completado, rojo=bloqueado, etc.), y barra de progreso
   - Datos del servicio: nombre, descripción, área responsable
   - Lista de tareas con checkmarks (completadas en verde)
   - Tiempo transcurrido estimado
   - Sección de evidencias visibles (fotos)
   - Encuesta de satisfacción (1-5 estrellas + comentario opcional)
   - Botón "Volver al inicio"

3. **Sala de espera** (`DisplayWaitingRoom`):
   - Input para código + DNI
   - Muestra estado del servicio con barra de progreso
   - Tiempo transcurrido vs tiempo estimado
   - Auto-refresh cada 30 segundos

4. **Display TV** (`/display/tv`):
   - Pantalla corporativa con servicios en progreso
   - Muestra código, título, técnico asignado, tiempo transcurrido, progreso
   - Sin autenticación

### Dashboard (interno)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/dashboard` | JWT | Dashboard completo con KPIs, alertas, indicadores, gráficos, rankings, comparación de periodos |

El dashboard incluye:
- **Alertas**: servicios bloqueados, con demora, sin actividad
- **Indicadores**: productividad (servicios/tareas completadas), eficiencia (tiempo promedio, % a tiempo, retrasos), satisfacción (promedio calificación, % evaluados)
- **Gráficos**: distribución por estado (pastel), servicios por área (barras), satisfacción por área, tendencia KPIs
- **Ranking**: colaboradores destacados por tareas completadas
- **Comparativo**: comparación entre periodos (día, semana, mes, trimestre) con variación porcentual
- **KPIs del sistema**: registros completos, servicios con tareas, dentro de tiempo, consultados, evaluados, con feedback
