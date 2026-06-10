# Supabase Setup Guide — ServicioLocalSTS

> Este documento describe cómo configurar Supabase como base de datos PostgreSQL para el proyecto ServicioLocalSTS. Extraído directamente del código fuente (controladores, servicios, y schema Drizzle).

> ✅ **Verificado contra la base de datos real de Supabase el 10 de junio de 2026.** Las tablas, columnas, tipos y constraints documentados abajo reflejan el estado actual de la base de datos en producción/desarrollo.

---

## 1. Prerequisites

### 1.1 Crear una cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y regístrate (GitHub o email).
2. Accede al [Dashboard](https://supabase.com/dashboard).

### 1.2 Crear un nuevo proyecto

1. Haz clic en **New project**.
2. **Name**: `servicio-local-sts` (o el que prefieras).
3. **Database Password**: generá una segura y guardala.
4. **Region**: elegí la más cercana a tu operación (e.g., `us-east-1`, `southamerica-east1`).
5. **Pricing Plan**: el plan **Free** es suficiente para desarrollo. Producir necesita al menos **Pro** para entornos productivos.
6. Esperá a que la base de datos se provisione (~2 minutos).

### 1.3 Herramientas necesarias

- **SQL Editor**: dentro del Dashboard de Supabase, en la sección "SQL Editor".
- **Supabase CLI** (opcional, para migraciones locales): `npm install -g supabase` — [docs](https://supabase.com/docs/guides/cli).
- **Cliente PostgreSQL** (opcional): `psql`, DBeaver, TablePlus.

---

## 2. Environment Variables

El archivo `backend/.env` contiene la configuración de conexión:

```env
SUPABASE_URL=https://soivnjbuhxowucgcprxc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=dev-secret-servicio-local-sts-2026
JWT_EXPIRES_IN=2h
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=https://serviciolocalsts.vercel.app
```

### 2.1 `SUPABASE_URL`

- **Qué es**: La URL de tu proyecto Supabase.
- **Dónde obtenerla**: Dashboard de Supabase → **Project Settings** → **API** → **Project URL**.
- **Formato**: `https://<referencia>.supabase.co`

### 2.2 `SUPABASE_SERVICE_KEY`

- **Qué es**: La **service_role key**. Es una clave con permisos totales (bypasea RLS). Usada por el backend para operaciones administrativas.
- **⚠️ Seguridad**: NUNCA exponer al frontend ni al cliente. Solo el backend la usa.
- **Dónde obtenerla**: Dashboard de Supabase → **Project Settings** → **API** → **service_role key**.
- **Alternativa anon key**: La `anon` public key se usa desde el cliente cuando tenés RLS configurado. El backend actual usa `service_role` directo, así que todas las queries bypasean RLS.

### 2.3 `JWT_SECRET`

- **Qué es**: La clave secreta para firmar los JWT de autenticación del backend (Fastify jwt, **no** el JWT de Supabase Auth).
- **Dónde obtenerlo**: Es una clave que vos generás. En desarrollo podés usar cualquier string. En producción usá una clave segura (e.g., `openssl rand -hex 64`).

### 2.4 `JWT_EXPIRES_IN`

- **Qué es**: Tiempo de expiración del token JWT del backend.
- **Valor actual**: `2h` (2 horas).

### 2.5 `REFRESH_TOKEN_EXPIRES_IN`

- **Qué es**: Tiempo de expiración del refresh token.
- **Valor actual**: `7d` (7 días).

### 2.6 `PORT`

- Puerto donde corre el servidor Fastify.
- **Valor actual**: `3001`

### 2.7 `NODE_ENV`

- Entorno de ejecución: `development`, `staging`, `production`.

### 2.8 `CORS_ORIGIN`

- Origen permitido para CORS.
- **Valor actual**: `https://serviciolocalsts.vercel.app` (Vercel production).

---

## 3. Database Schema

> **ℹ️ Nota sobre nombres de columnas**: Las columnas reales en Supabase usan **snake_case con prefijo de tabla** (ej. `usuario_id`, `servicio_nombre`). El backend consulta directamente con `supabase-js` (ver `connection.ts`). Drizzle ORM fue eliminado del proyecto.

Ejecutá este script SQL completo en el **SQL Editor** de Supabase (o manualmente tabla por tabla).

### 3.1 `usuarios`

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  usuario_id SERIAL PRIMARY KEY,
  usuario_username VARCHAR(50) NOT NULL UNIQUE,
  usuario_contrasena VARCHAR(255) NOT NULL,
  usuario_nombres VARCHAR(150) NOT NULL,
  usuario_apellido_paterno VARCHAR(150) NOT NULL DEFAULT '',
  usuario_apellido_materno VARCHAR(150) DEFAULT NULL,
  usuario_dni VARCHAR(20) DEFAULT NULL UNIQUE,
  usuario_telefono VARCHAR(20) DEFAULT NULL,
  usuario_correo VARCHAR(150) NOT NULL UNIQUE,
  usuario_rol VARCHAR(20) NOT NULL CHECK (usuario_rol IN ('Administrador', 'Encargado', 'Colaborador')),
  usuario_activo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME,
  usuario_disponible BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_ultimo_login DATE DEFAULT NULL
);

-- Partial unique index para DNI (solo cuando no es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(usuario_dni) WHERE usuario_dni IS NOT NULL;
```

**Columnas** (extraídas de `auth.service.ts`, `usuarios.controller.ts`):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `usuario_id` | SERIAL | NO | — | PK |
| `usuario_username` | VARCHAR(50) | NO | — | Nombre de usuario único |
| `usuario_contrasena` | VARCHAR(255) | NO | — | Hash bcrypt |
| `usuario_nombres` | VARCHAR(150) | NO | — | Nombres del usuario |
| `usuario_apellido_paterno` | VARCHAR(150) | NO | '' | Apellido paterno |
| `usuario_apellido_materno` | VARCHAR(150) | SÍ | NULL | Apellido materno |
| `usuario_dni` | VARCHAR(20) | SÍ | NULL | Documento (único si no nulo) |
| `usuario_telefono` | VARCHAR(20) | SÍ | NULL | Teléfono |
| `usuario_correo` | VARCHAR(150) | NO | — | Email único |
| `usuario_rol` | VARCHAR(20) | NO | — | `Administrador`, `Encargado`, `Colaborador` (capitalizados) |
| `usuario_activo` | BOOLEAN | NO | TRUE | Estado activo/inactivo |
| `usuario_fecha_creacion` | DATE | NO | CURRENT_DATE | Fecha de creación |
| `usuario_hora_creacion` | TIME | NO | CURRENT_TIME | Hora de creación |
| `usuario_disponible` | BOOLEAN | NO | FALSE | Disponible para recibir tareas |
| `usuario_ultimo_login` | DATE | SÍ | NULL | Fecha del último inicio de sesión |

---

### 3.2 `areas`

```sql
CREATE TABLE IF NOT EXISTS areas (
  area_id SERIAL PRIMARY KEY,
  area_nombre VARCHAR(150) NOT NULL,
  area_encargado_id INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
  area_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE
);
```

**Columnas** (extraídas de `areas.controller.ts`):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `area_id` | SERIAL | NO | — | PK |
| `area_nombre` | VARCHAR(150) | NO | — | Nombre del área |
| `area_encargado_id` | INTEGER | SÍ | NULL | FK → `usuarios.usuario_id` |
| `area_fecha_creacion` | DATE | NO | CURRENT_DATE | Fecha de creación |

---

### 3.3 `areacolaboradores`

```sql
CREATE TABLE IF NOT EXISTS areacolaboradores (
  areacolaborador_id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
  colaborador_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
  UNIQUE(area_id, colaborador_id)
);
```

**Columnas** (extraídas de `areas.controller.ts`, `manager.controller.ts`):

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `areacolaborador_id` | SERIAL | NO | PK |
| `area_id` | INTEGER | NO | FK → `areas.area_id` (CASCADE) |
| `colaborador_id` | INTEGER | NO | FK → `usuarios.usuario_id` (CASCADE) |
| UNIQUE(area_id, colaborador_id) | — | — | Evita duplicados |

---

### 3.4 `clientes`

```sql
CREATE TABLE IF NOT EXISTS clientes (
  cliente_id SERIAL PRIMARY KEY,
  cliente_nombres VARCHAR(150) NOT NULL,
  cliente_apellido_paterno VARCHAR(150) NOT NULL DEFAULT '',
  cliente_apellido_materno VARCHAR(150) DEFAULT NULL,
  cliente_dni VARCHAR(20) DEFAULT NULL UNIQUE,
  cliente_telefono VARCHAR(20) DEFAULT NULL,
  cliente_correo VARCHAR(150) DEFAULT NULL,
  cliente_direccion TEXT DEFAULT NULL,
  cliente_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE
);
```

**Columnas** (descubierta durante verificación con base de datos real):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `cliente_id` | SERIAL | NO | — | PK |
| `cliente_nombres` | VARCHAR(150) | NO | — | Nombres del cliente |
| `cliente_apellido_paterno` | VARCHAR(150) | NO | '' | Apellido paterno |
| `cliente_apellido_materno` | VARCHAR(150) | SÍ | NULL | Apellido materno |
| `cliente_dni` | VARCHAR(20) | SÍ | NULL | Documento de identidad (único) |
| `cliente_telefono` | VARCHAR(20) | SÍ | NULL | Teléfono de contacto |
| `cliente_correo` | VARCHAR(150) | SÍ | NULL | Correo electrónico |
| `cliente_direccion` | TEXT | SÍ | NULL | Dirección física |
| `cliente_fecha_creacion` | DATE | NO | CURRENT_DATE | Fecha de registro |

---

### 3.5 `servicios`

```sql
CREATE TABLE IF NOT EXISTS servicios (
  servicio_id SERIAL PRIMARY KEY,
  servicio_codigo VARCHAR(20) NOT NULL UNIQUE,
  servicio_nombre VARCHAR(250) NOT NULL,
  servicio_descripcion TEXT DEFAULT NULL,
  servicio_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (servicio_estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado', 'bloqueado')),
  servicio_tiempo_estimado INTEGER DEFAULT NULL,
  area_id INTEGER DEFAULT NULL REFERENCES areas(area_id) ON DELETE SET NULL,
  cliente_id INTEGER NOT NULL REFERENCES clientes(cliente_id) ON DELETE RESTRICT,
  tecnico_principal_id INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
  plantilla_id INTEGER DEFAULT NULL REFERENCES plantillas(plantilla_id) ON DELETE SET NULL,
  servicio_cliente_reporte TEXT DEFAULT NULL,
  servicio_diagnostico_inicial TEXT DEFAULT NULL,
  servicio_descripcion_equipo TEXT DEFAULT NULL,
  servicio_serie_equipo VARCHAR(100) DEFAULT NULL,
  servicio_detalles_equipo TEXT DEFAULT NULL,
  servicio_descripcion_accesorio TEXT DEFAULT NULL,
  servicio_detalles_accesorio TEXT DEFAULT NULL,
  servicio_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  servicio_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME,
  servicio_fecha_inicio DATE DEFAULT NULL,
  servicio_hora_inicio TIME DEFAULT NULL,
  servicio_fecha_fin DATE DEFAULT NULL,
  servicio_hora_fin TIME DEFAULT NULL
);
```

**Columnas** (extraídas de `servicios.controller.ts`, `seguimiento.controller.ts`, `display.controller.ts`, y verificación con base de datos real):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `servicio_id` | SERIAL | NO | — | PK |
| `servicio_codigo` | VARCHAR(20) | NO | — | Ej: `SRV-0001`, único |
| `servicio_nombre` | VARCHAR(250) | NO | — | Título del servicio |
| `servicio_descripcion` | TEXT | SÍ | NULL | Descripción |
| `servicio_estado` | VARCHAR(20) | NO | `'pendiente'` | `pendiente`, `en_progreso`, `completado`, `cancelado`, `bloqueado` |
| `servicio_tiempo_estimado` | INTEGER | SÍ | NULL | Minutos estimados |
| `area_id` | INTEGER | SÍ | NULL | FK → `areas.area_id` |
| `cliente_id` | INTEGER | NO | — | FK → `clientes.cliente_id` (RESTRICT) |
| `tecnico_principal_id` | INTEGER | SÍ | NULL | FK → `usuarios.usuario_id` (técnico asignado) |
| `plantilla_id` | INTEGER | SÍ | NULL | FK → `plantillas.plantilla_id` (si usa plantilla) |
| `servicio_cliente_reporte` | TEXT | SÍ | NULL | Reporte del cliente sobre el problema |
| `servicio_diagnostico_inicial` | TEXT | SÍ | NULL | Diagnóstico inicial del técnico |
| `servicio_descripcion_equipo` | TEXT | SÍ | NULL | Descripción del equipo asociado |
| `servicio_serie_equipo` | VARCHAR(100) | SÍ | NULL | Número de serie del equipo |
| `servicio_detalles_equipo` | TEXT | SÍ | NULL | Detalles técnicos del equipo |
| `servicio_descripcion_accesorio` | TEXT | SÍ | NULL | Descripción de accesorios |
| `servicio_detalles_accesorio` | TEXT | SÍ | NULL | Detalles de accesorios |
| `servicio_fecha_creacion` | DATE | NO | CURRENT_DATE | |
| `servicio_hora_creacion` | TIME | NO | CURRENT_TIME | |
| `servicio_fecha_inicio` | DATE | SÍ | NULL | |
| `servicio_hora_inicio` | TIME | SÍ | NULL | |
| `servicio_fecha_fin` | DATE | SÍ | NULL | |
| `servicio_hora_fin` | TIME | SÍ | NULL | |

---

### 3.6 `tareas`

> **Nota**: La columna `tarea_descripcion` no existe en la base de datos real. Fue eliminada del esquema.

```sql
CREATE TABLE IF NOT EXISTS tareas (
  tarea_id SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  tarea_titulo VARCHAR(250) NOT NULL,
  tarea_orden INTEGER NOT NULL DEFAULT 0,
  tarea_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (tarea_estado IN ('pendiente', 'completado')),
  tarea_completado_por INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
  tarea_fecha_completado DATE DEFAULT NULL,
  tarea_hora_completado TIME DEFAULT NULL,
  tarea_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  tarea_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_tareas_servicio_id ON tareas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(tarea_estado);
```

**Columnas** (extraídas de `servicios.controller.ts`, `manager.controller.ts`):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `tarea_id` | SERIAL | NO | — | PK |
| `servicio_id` | INTEGER | NO | — | FK → `servicios.servicio_id` (CASCADE) |
| `tarea_titulo` | VARCHAR(250) | NO | — | Título |
| `tarea_orden` | INTEGER | NO | 0 | Orden dentro del servicio |
| `tarea_estado` | VARCHAR(20) | NO | `'pendiente'` | `pendiente` o `completado` |
| `tarea_completado_por` | INTEGER | SÍ | NULL | FK → `usuarios.usuario_id` |
| `tarea_fecha_completado` | DATE | SÍ | NULL | |
| `tarea_hora_completado` | TIME | SÍ | NULL | |
| `tarea_fecha_creacion` | DATE | NO | CURRENT_DATE | |
| `tarea_hora_creacion` | TIME | NO | CURRENT_TIME | |

---

### 3.7 `plantillas`

> **Nota**: En el schema Drizzle se llama `plantillas_proceso`, pero en la base de datos Supabase real se llama `plantillas`.

```sql
CREATE TABLE IF NOT EXISTS plantillas (
  plantilla_id SERIAL PRIMARY KEY,
  plantilla_nombre VARCHAR(150) NOT NULL,
  plantilla_descripcion TEXT DEFAULT NULL,
  plantilla_activa BOOLEAN NOT NULL DEFAULT TRUE,
  plantilla_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE
);
```

**Columnas** (extraídas de `plantillas.controller.ts`):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `plantilla_id` | SERIAL | NO | — | PK |
| `plantilla_nombre` | VARCHAR(150) | NO | — | Nombre de la plantilla |
| `plantilla_descripcion` | TEXT | SÍ | NULL | Descripción |
| `plantilla_activa` | BOOLEAN | NO | TRUE | Si está activa |
| `plantilla_fecha_creacion` | DATE | NO | CURRENT_DATE | |

---

### 3.8 `plantillatareas`

> **Nota**: En el schema Drizzle se llama `plantillas_tarea`. En Supabase real el nombre es **una sola palabra**: `plantillatareas`. Los nombres de columna también usan el prefijo `plantillatarea_`. No tiene columnas `tarea_descripcion` ni `asignado_a`.

```sql
CREATE TABLE IF NOT EXISTS plantillatareas (
  plantillatarea_id SERIAL PRIMARY KEY,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(plantilla_id) ON DELETE CASCADE,
  plantillatarea_titulo VARCHAR(250) NOT NULL,
  plantillatarea_orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_plantillatareas_plantilla_id ON plantillatareas(plantilla_id);
```

**Columnas** (extraídas de `plantillas.controller.ts` y verificación con base de datos real):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `plantillatarea_id` | SERIAL | NO | — | PK |
| `plantilla_id` | INTEGER | NO | — | FK → `plantillas.plantilla_id` (CASCADE) |
| `plantillatarea_titulo` | VARCHAR(250) | NO | — | Título de la tarea de plantilla |
| `plantillatarea_orden` | INTEGER | NO | 0 | Orden dentro de la plantilla |

---

### 3.9 `servicios_plantillas` (junction)

```sql
CREATE TABLE IF NOT EXISTS servicios_plantillas (
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(plantilla_id) ON DELETE CASCADE,
  PRIMARY KEY (servicio_id, plantilla_id)
);
```

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `servicio_id` | INTEGER | NO | FK → `servicios.servicio_id` (CASCADE) |
| `plantilla_id` | INTEGER | NO | FK → `plantillas.plantilla_id` (CASCADE) |
| PRIMARY KEY (servicio_id, plantilla_id) | — | — | |

---

### 3.10 `serviciocolaboradores` (junction)

> **Nota**: Esta tabla **NO** existe en el schema Drizzle. Se usa directamente en Supabase para asignar colaboradores a servicios.

```sql
CREATE TABLE IF NOT EXISTS serviciocolaboradores (
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  colaborador_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
  PRIMARY KEY (servicio_id, colaborador_id)
);
```

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `servicio_id` | INTEGER | NO | FK → `servicios.servicio_id` (CASCADE) |
| `colaborador_id` | INTEGER | NO | FK → `usuarios.usuario_id` (CASCADE) |

---

### 3.11 `calificaciones` (encuestas)

> **Nota**: En el schema Drizzle se llama `encuestas`, pero en Supabase la tabla real es `calificaciones`.

```sql
CREATE TABLE IF NOT EXISTS calificaciones (
  calificacion_id SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(cliente_id),
  calificacion_puntaje INTEGER NOT NULL CHECK (calificacion_puntaje >= 1 AND calificacion_puntaje <= 5),
  calificacion_comentario TEXT DEFAULT NULL,
  calificacion_sugerencia TEXT DEFAULT NULL,
  calificacion_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  calificacion_hora TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_servicio_id ON calificaciones(servicio_id);
```

**Columnas** (extraídas de `seguimiento.controller.ts` y verificación con base de datos real):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `calificacion_id` | SERIAL | NO | — | PK |
| `servicio_id` | INTEGER | NO | — | FK → `servicios.servicio_id` (CASCADE) |
| `cliente_id` | INTEGER | NO | — | FK → `clientes.cliente_id` |
| `calificacion_puntaje` | INTEGER | NO | — | 1–5 |
| `calificacion_comentario` | TEXT | SÍ | NULL | Comentario de la encuesta |
| `calificacion_sugerencia` | TEXT | SÍ | NULL | Sugerencia |
| `calificacion_fecha` | DATE | NO | CURRENT_DATE | |
| `calificacion_hora` | TIME | NO | CURRENT_TIME | |

---

### 3.12 `serviciocomentarios`

> **Nota**: En el schema Drizzle, `comentarios` es una sola tabla. En Supabase real está dividida en `serviciocomentarios` (para comentarios de servicio) y `tareacomentarios` (para comentarios de tarea).

```sql
CREATE TABLE IF NOT EXISTS serviciocomentarios (
  serviciocomentario_id SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  serviciocomentario_contenido TEXT NOT NULL,
  serviciocomentario_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  serviciocomentario_hora TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_serviciocomentarios_servicio_id ON serviciocomentarios(servicio_id);
```

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `serviciocomentario_id` | SERIAL | NO | — | PK |
| `servicio_id` | INTEGER | NO | — | FK → `servicios.servicio_id` (CASCADE) |
| `usuario_id` | INTEGER | NO | — | FK → `usuarios.usuario_id` |
| `serviciocomentario_contenido` | TEXT | NO | — | Contenido del comentario |
| `serviciocomentario_fecha` | DATE | NO | CURRENT_DATE | |
| `serviciocomentario_hora` | TIME | NO | CURRENT_TIME | |

---

### 3.13 `tareacomentarios`

```sql
CREATE TABLE IF NOT EXISTS tareacomentarios (
  tareacomentario_id SERIAL PRIMARY KEY,
  tarea_id INTEGER NOT NULL REFERENCES tareas(tarea_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  tareacomentario_contenido TEXT NOT NULL,
  tareacomentario_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tareacomentario_hora TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_tareacomentarios_tarea_id ON tareacomentarios(tarea_id);
```

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `tareacomentario_id` | SERIAL | NO | — | PK |
| `tarea_id` | INTEGER | NO | — | FK → `tareas.tarea_id` (CASCADE) |
| `usuario_id` | INTEGER | NO | — | FK → `usuarios.usuario_id` |
| `tareacomentario_contenido` | TEXT | NO | — | Contenido del comentario |
| `tareacomentario_fecha` | DATE | NO | CURRENT_DATE | |
| `tareacomentario_hora` | TIME | NO | CURRENT_TIME | |

---

### 3.14 `auditoria`

```sql
CREATE TABLE IF NOT EXISTS auditoria (
  auditoria_id SERIAL PRIMARY KEY,
  usuario_id INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
  auditoria_accion VARCHAR(50) NOT NULL,
  auditoria_tabla VARCHAR(50) NOT NULL,
  auditoria_registro_id INTEGER DEFAULT NULL,
  auditoria_detalle JSONB DEFAULT NULL,
  auditoria_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  auditoria_hora TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria(auditoria_tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(auditoria_fecha);
```

**Columnas** (extraídas de `auditoria.controller.ts`):

| Columna | Tipo | Nulo | Default | Descripción |
|---|---|---|---|---|
| `auditoria_id` | SERIAL | NO | — | PK |
| `usuario_id` | INTEGER | SÍ | NULL | FK → `usuarios.usuario_id` |
| `auditoria_accion` | VARCHAR(50) | NO | — | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `STATUS_CHANGE`, etc. |
| `auditoria_tabla` | VARCHAR(50) | NO | — | `servicio`, `tarea`, `usuario`, `area`, etc. |
| `auditoria_registro_id` | INTEGER | SÍ | NULL | ID del registro afectado |
| `auditoria_detalle` | JSONB | SÍ | NULL | Detalle estructurado de la operación |
| `auditoria_fecha` | DATE | NO | CURRENT_DATE | |
| `auditoria_hora` | TIME | NO | CURRENT_TIME | |

---

### 3.15 Tabla adicional (no implementada en Supabase, solo en Drizzle)

Las siguientes tablas existen en el schema Drizzle (`backend/src/db/schema.ts`) pero **no tienen implementación en Supabase** — el backend actual las comenta como "no disponible":

- `tiempo_tracking` — tracking de tiempo por tarea (pendiente de implementar)
- `encuestas` — reemplazada por `calificaciones` en Supabase

---

## 4. RLS Policies

El backend actual se conecta con la **service_role key** que bypasea Row-Level Security. Si en el futuro querés migrar a usar la **anon key** con RLS, acá están las políticas recomendadas basadas en el proyecto SGSST relacionado.

> **Importante**: Mientras uses `SUPABASE_SERVICE_KEY`, las RLS policies **no se aplican**. Si querés cambiar a usar la `anon key` para queries desde el backend con autenticación de usuario, seguí las políticas debajo.

### 4.1 Habilitar RLS

```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE areacolaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviciocomentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareacomentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviciocolaboradores ENABLE ROW LEVEL SECURITY;
```

### 4.2 Políticas por rol

```sql
-- ═══════════════════════════════════
-- USUARIOS
-- ═══════════════════════════════════

-- Admin: todo
CREATE POLICY usuarios_admin ON usuarios
  FOR ALL USING (
    auth.rol() = 'admin'
  );

-- Encargado: solo lectura de usuarios de su área
CREATE POLICY usuarios_encargado_select ON usuarios
  FOR SELECT USING (
    auth.rol() = 'encargado'
    AND usuario_id IN (
      SELECT colaborador_id FROM areacolaboradores WHERE area_id IN (
        SELECT area_id FROM areas WHERE area_encargado_id = auth.uid()
      )
    )
  );

-- Colaborador: solo lectura propia
CREATE POLICY usuarios_colaborador_select ON usuarios
  FOR SELECT USING (
    auth.rol() = 'colaborador' AND usuario_id = auth.uid()
  );

-- ═══════════════════════════════════
-- SERVICIOS
-- ═══════════════════════════════════

-- Admin: todo
CREATE POLICY servicios_admin ON servicios
  FOR ALL USING (auth.rol() = 'admin');

-- Encargado: servicios de su área
CREATE POLICY servicios_encargado ON servicios
  FOR ALL USING (
    auth.rol() = 'encargado'
    AND area_id IN (
      SELECT area_id FROM areas WHERE area_encargado_id = auth.uid()
    )
  );

-- Colaborador: solo servicios donde está asignado
CREATE POLICY servicios_colaborador_select ON servicios
  FOR SELECT USING (
    auth.rol() = 'colaborador'
    AND servicio_id IN (
      SELECT servicio_id FROM serviciocolaboradores WHERE colaborador_id = auth.uid()
    )
  );

-- ═══════════════════════════════════
-- TAREAS
-- ═══════════════════════════════════

CREATE POLICY tareas_admin ON tareas
  FOR ALL USING (auth.rol() = 'admin');

CREATE POLICY tareas_encargado ON tareas
  FOR ALL USING (
    auth.rol() = 'encargado'
    AND servicio_id IN (
      SELECT servicio_id FROM servicios WHERE area_id IN (
        SELECT area_id FROM areas WHERE area_encargado_id = auth.uid()
      )
    )
  );

CREATE POLICY tareas_colaborador_select ON tareas
  FOR SELECT USING (
    auth.rol() = 'colaborador'
    AND (tarea_completado_por = auth.uid() OR servicio_id IN (
      SELECT servicio_id FROM serviciocolaboradores WHERE colaborador_id = auth.uid()
    ))
  );
```

---

## 5. Triggers

Basado en el proyecto relacionado **SGSST** (`F:\STS\SGSST\SistemaGestionServicios\backend\src\db\triggers.sql`), estos triggers de auditoría a nivel BD pueden ser útiles como respaldo del middleware de auditoría que ya existe en el backend.

### 5.1 Función genérica de auditoría

```sql
-- Crear tipo enum para acciones si no existe
DO $$ BEGIN
  CREATE TYPE accion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id INTEGER;
  v_cambios JSONB;
  v_registro_id INTEGER;
  v_tabla TEXT;
BEGIN
  -- Obtener usuario del contexto de aplicación (seteado por el backend)
  BEGIN
    v_user_id := current_setting('app.user_id')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Determinar el ID del registro afectado según la tabla
  v_tabla := TG_TABLE_NAME;

  IF TG_OP = 'DELETE' THEN
    v_cambios := row_to_json(OLD)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    v_cambios := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT jsonb_build_object(
      'old', row_to_json(OLD)::JSONB,
      'new', row_to_json(NEW)::JSONB,
      'diff', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::JSONB)
        WHERE row_to_json(OLD)::JSONB->>key IS DISTINCT FROM row_to_json(NEW)::JSONB->>key
      )
    ) INTO v_cambios;
  END IF;

  -- Determinar registro_id según la tabla
  v_registro_id := COALESCE(
    (CASE WHEN TG_OP != 'DELETE' THEN (NEW::json->>(SELECT column_name FROM information_schema.columns WHERE table_name = v_tabla AND ordinal_position = 1)) ELSE NULL END)::INTEGER,
    (CASE WHEN TG_OP = 'DELETE' THEN (OLD::json->>(SELECT column_name FROM information_schema.columns WHERE table_name = v_tabla AND ordinal_position = 1)) ELSE NULL END)::INTEGER
  );

  -- Insertar en auditoría
  INSERT INTO auditoria (
    usuario_id,
    auditoria_accion,
    auditoria_tabla,
    auditoria_registro_id,
    auditoria_detalle,
    auditoria_fecha,
    auditoria_hora
  ) VALUES (
    COALESCE(v_user_id, 0),
    TG_OP::TEXT,
    v_tabla,
    v_registro_id,
    v_cambios,
    CURRENT_DATE,
    CURRENT_TIME
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.2 Triggers por tabla

```sql
-- SERVICIOS
DROP TRIGGER IF EXISTS trg_auditoria_servicios ON servicios;
CREATE TRIGGER trg_auditoria_servicios
  AFTER INSERT OR UPDATE OR DELETE ON servicios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TAREAS
DROP TRIGGER IF EXISTS trg_auditoria_tareas ON tareas;
CREATE TRIGGER trg_auditoria_tareas
  AFTER INSERT OR UPDATE OR DELETE ON tareas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- USUARIOS
DROP TRIGGER IF EXISTS trg_auditoria_usuarios ON usuarios;
CREATE TRIGGER trg_auditoria_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- CALIFICACIONES
DROP TRIGGER IF EXISTS trg_auditoria_calificaciones ON calificaciones;
CREATE TRIGGER trg_auditoria_calificaciones
  AFTER INSERT OR UPDATE OR DELETE ON calificaciones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- AREAS
DROP TRIGGER IF EXISTS trg_auditoria_areas ON areas;
CREATE TRIGGER trg_auditoria_areas
  AFTER INSERT OR UPDATE OR DELETE ON areas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- PLANTILLAS
DROP TRIGGER IF EXISTS trg_auditoria_plantillas ON plantillas;
CREATE TRIGGER trg_auditoria_plantillas
  AFTER INSERT OR UPDATE OR DELETE ON plantillas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### 5.3 Cómo usar desde el backend

El backend debe setear `app.user_id` antes de hacer queries para que los triggers capturen el usuario:

```typescript
await supabase.rpc('set_config', {
  params: { key: 'app.user_id', value: String(userId) }
});
```

> **Nota**: Los triggers son **opcionales**. El backend ya tiene auditoría vía middleware (función `auditLog`). Los triggers de BD sirven como respaldo para capturar operaciones que el middleware no cubra (e.g., queries desde el SQL Editor o scripts directos).

---

## 6. Seed Data

### 6.1 Seed script (TypeScript — recomendado)

El archivo de seed en `backend/src/seeds/run.ts` está implementado con **supabase-js** (no Drizzle ORM). Genera datos de prueba completos: usuarios, áreas, clientes, servicios, tareas, plantillas, comentarios y calificaciones.

**Para ejecutarlo:**

```bash
cd backend
npm run seed
# → ejecuta: tsx src/seeds/run.ts
```

### 6.2 Características del seed

- **Idempotente**: maneja duplicados vía `ON CONFLICT` / detección de `23505` (unique violation). Puede ejecutarse múltiples veces sin errores.
- **Contraseñas reales**: genera hashes bcrypt en tiempo de ejecución (`admin123` para admin, `123456` para los demás).
- **Usa las columnas reales de Supabase**: todos los inserts usan los nombres reales (`usuario_username`, `servicio_nombre`, etc.).
- **Datos de referencia**: crea 8 usuarios (1 admin, 2 encargados, 5 colaboradores), 4 áreas, 3 clientes, 6 servicios con tareas, 2 plantillas con tareas, y calificaciones de ejemplo.
- **Independiente de Drizzle**: no requiere el schema Drizzle ni migraciones — funciona contra cualquier base de datos que tenga las tablas y columnas correctas.

### 6.3 Requisitos

1. El archivo `backend/.env` debe tener `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` configurados (ver Sección 2).
2. Las tablas deben existir (ejecutar el DDL de la Sección 3 primero en el SQL Editor de Supabase).
3. Node.js 18+ con el proyecto instalado (`npm install` en `backend/`).

---

## 7. Foreign Key Reference Map

Resumen de todas las FK detectadas en la base de datos real:

| Tabla | Columna FK | Referencia | Comportamiento |
|---|---|---|---|
| `usuarios` | *(no tiene FK propias)* | — | — |
| `areas` | `area_encargado_id` | `usuarios.usuario_id` | SET NULL |
| `areacolaboradores` | `area_id` | `areas.area_id` | CASCADE |
| `areacolaboradores` | `colaborador_id` | `usuarios.usuario_id` | CASCADE |
| `clientes` | *(no tiene FK propias)* | — | — |
| `servicios` | `area_id` | `areas.area_id` | SET NULL |
| `servicios` | `cliente_id` | `clientes.cliente_id` | RESTRICT |
| `servicios` | `tecnico_principal_id` | `usuarios.usuario_id` | SET NULL |
| `servicios` | `plantilla_id` | `plantillas.plantilla_id` | SET NULL |
| `tareas` | `servicio_id` | `servicios.servicio_id` | CASCADE |
| `tareas` | `tarea_completado_por` | `usuarios.usuario_id` | SET NULL |
| `plantillatareas` | `plantilla_id` | `plantillas.plantilla_id` | CASCADE |
| `servicios_plantillas` | `servicio_id` | `servicios.servicio_id` | CASCADE |
| `servicios_plantillas` | `plantilla_id` | `plantillas.plantilla_id` | CASCADE |
| `serviciocolaboradores` | `servicio_id` | `servicios.servicio_id` | CASCADE |
| `serviciocolaboradores` | `colaborador_id` | `usuarios.usuario_id` | CASCADE |
| `calificaciones` | `servicio_id` | `servicios.servicio_id` | CASCADE |
| `calificaciones` | `cliente_id` | `clientes.cliente_id` | — |
| `serviciocomentarios` | `servicio_id` | `servicios.servicio_id` | CASCADE |
| `serviciocomentarios` | `usuario_id` | `usuarios.usuario_id` | — |
| `tareacomentarios` | `tarea_id` | `tareas.tarea_id` | CASCADE |
| `tareacomentarios` | `usuario_id` | `usuarios.usuario_id` | — |
| `auditoria` | `usuario_id` | `usuarios.usuario_id` | SET NULL |

---

## 8. Quick Reference: Drizzle Schema vs Real Supabase Tables

El schema Drizzle en `backend/src/db/schema.ts` fue el diseño original pero **no coincide** con las tablas reales en Supabase que usa el backend hoy. Esta tabla muestra las diferencias clave:

| Drizzle (`schema.ts`) | Supabase Real |
|---|---|---|
| `usuarios.id` | `usuarios.usuario_id` |
| `usuarios.username` | `usuarios.usuario_username` |
| `usuarios.password_hash` | `usuarios.usuario_contrasena` |
| `usuarios.apellidos` | `usuarios.usuario_apellido_paterno` + `usuario_apellido_materno` |
| `usuarios.dni` | `usuarios.usuario_dni` |
| `usuarios.email` | `usuarios.usuario_correo` |
| `usuarios.rol` (`admin`/`encargado`/`colaborador`) | `usuarios.usuario_rol` (`Administrador`/`Encargado`/`Colaborador`) |
| `usuarios.activo` | `usuarios.usuario_activo` |
| *(no existe en Drizzle)* | `usuarios.usuario_disponible` |
| *(no existe en Drizzle)* | `usuarios.usuario_ultimo_login` |
| `areas.id` | `areas.area_id` |
| `areas.nombre` | `areas.area_nombre` |
| `areas_colaboradores` | `areacolaboradores` |
| *(no existe en Drizzle)* | `clientes` |
| `servicios.id` | `servicios.servicio_id` |
| `servicios.titulo` | `servicios.servicio_nombre` |
| `servicios_colaboradores` | `serviciocolaboradores` |
| `tareas.id` | `tareas.tarea_id` |
| `tareas.completada` (boolean) | `tareas.tarea_estado` (varchar: 'pendiente'/'completado') |
| `tareas.completada_at` | `tareas.tarea_fecha_completado` + `tareas.tarea_hora_completado` |
| `plantillas_proceso` | `plantillas` |
| `plantillas_tarea` | `plantillatareas` |
| `comentarios` | `serviciocomentarios` + `tareacomentarios` (split) |
| `encuestas` | `calificaciones` |
| `tiempo_tracking` | **No implementada en Supabase** |

---

## 9. Pasos finales después del setup

1. **Verificá la conexión**: `npm run dev` en el backend y revisá que no haya errores de conexión.
2. **Probá login**: `POST /api/auth/login` con `admin` / `admin123`.
3. **Ejecutá el seed**: `cd backend && npm run seed` para poblar datos de prueba (ver Sección 6).
4. **Configurá backups**: En Supabase Dashboard → Database → Backups, activá las backups automáticas si estás en plan Pro.
