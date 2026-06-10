/**
 * Database setup script — creates all tables, triggers, and RLS policies.
 * Run ONCE on a fresh Supabase project before seeding.
 *
 * Usage: npx tsx src/seeds/setup-db.ts
 *
 * Requires: DATABASE_PASSWORD env var, or pass as argument.
 */

import "dotenv/config";
import postgres from "postgres";

const PASSWORD = process.env.DATABASE_PASSWORD || "lacontrasena.P3";
const PROJECT_REF = "soivnjbuhxowucgcprxc";

const sql = postgres(
  `postgres://postgres.${PROJECT_REF}:${encodeURIComponent(PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  { max: 3, timeout: 30 },
);

async function setup() {
  console.log("⚡ Creando tablas en Supabase...\n");

  // ── 1. usuarios ──
  console.log("1/13 Creando usuarios...");
  await sql`
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
      usuario_disponible BOOLEAN NOT NULL DEFAULT FALSE,
      usuario_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
      usuario_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME,
      usuario_ultimo_login DATE DEFAULT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(usuario_dni) WHERE usuario_dni IS NOT NULL;
  `;

  // ── 2. areas ──
  console.log("2/13 Creando areas...");
  await sql`
    CREATE TABLE IF NOT EXISTS areas (
      area_id SERIAL PRIMARY KEY,
      area_nombre VARCHAR(150) NOT NULL,
      area_descripcion TEXT DEFAULT NULL,
      area_encargado_id INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
      area_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE
    );
  `;

  // ── 3. areacolaboradores ──
  console.log("3/13 Creando areacolaboradores...");
  await sql`
    CREATE TABLE IF NOT EXISTS areacolaboradores (
      areacolaborador_id SERIAL PRIMARY KEY,
      area_id INTEGER NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
      colaborador_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
      areacolaborador_es_principal BOOLEAN NOT NULL DEFAULT FALSE,
      areacolaborador_fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE(area_id, colaborador_id)
    );
  `;

  // ── 4. clientes ──
  console.log("4/13 Creando clientes...");
  await sql`
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
  `;

  // ── 5. servicios ──
  console.log("5/13 Creando servicios...");
  await sql`
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
      plantilla_id INTEGER DEFAULT NULL,
      servicio_cliente_reporte TEXT DEFAULT NULL,
      servicio_diagnostico_inicial TEXT DEFAULT NULL,
      servicio_descripcion_equipo TEXT DEFAULT NULL,
      servicio_serie_equipo VARCHAR(100) DEFAULT NULL,
      servicio_detalles_equipo TEXT DEFAULT NULL,
      servicio_descripcion_accesorio TEXT DEFAULT NULL,
      servicio_detalles_accesorio TEXT DEFAULT NULL,
      servicio_codigo_acceso VARCHAR(50) DEFAULT NULL,
      servicio_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
      servicio_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME,
      servicio_fecha_inicio DATE DEFAULT NULL,
      servicio_hora_inicio TIME DEFAULT NULL,
      servicio_fecha_fin DATE DEFAULT NULL,
      servicio_hora_fin TIME DEFAULT NULL
    );
  `;

  // ── 6. tareas ──
  console.log("6/13 Creando tareas...");
  await sql`
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
      tarea_hora_inicio TIME DEFAULT NULL,
      tarea_hora_fin TIME DEFAULT NULL,
      tarea_tiempo_real INTEGER DEFAULT NULL,
      tarea_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
      tarea_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME
    );
    CREATE INDEX IF NOT EXISTS idx_tareas_servicio_id ON tareas(servicio_id);
    CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas(tarea_estado);
  `;

  // ── 7. serviciocolaboradores ──
  console.log("7/13 Creando serviciocolaboradores...");
  await sql`
    CREATE TABLE IF NOT EXISTS serviciocolaboradores (
      serviciocolaborador_id SERIAL PRIMARY KEY,
      servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
      colaborador_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
      serviciocolaborador_fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE(servicio_id, colaborador_id)
    );
  `;

  // ── 8. plantillas ──
  console.log("8/13 Creando plantillas...");
  await sql`
    CREATE TABLE IF NOT EXISTS plantillas (
      plantilla_id SERIAL PRIMARY KEY,
      plantilla_nombre VARCHAR(150) NOT NULL,
      plantilla_descripcion TEXT DEFAULT NULL,
      plantilla_activa BOOLEAN NOT NULL DEFAULT TRUE,
      plantilla_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE
    );
  `;

  // ── 9. plantillatareas ──
  console.log("9/13 Creando plantillatareas...");
  await sql`
    CREATE TABLE IF NOT EXISTS plantillatareas (
      plantillatarea_id SERIAL PRIMARY KEY,
      plantilla_id INTEGER NOT NULL REFERENCES plantillas(plantilla_id) ON DELETE CASCADE,
      plantillatarea_titulo VARCHAR(250) NOT NULL,
      plantillatarea_orden INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_plantillatareas_plantilla_id ON plantillatareas(plantilla_id);
  `;

  // ── 10. servicios_plantillas (junction) ──
  console.log("10/13 Creando servicios_plantillas...");
  await sql`
    CREATE TABLE IF NOT EXISTS servicios_plantillas (
      servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
      plantilla_id INTEGER NOT NULL REFERENCES plantillas(plantilla_id) ON DELETE CASCADE,
      PRIMARY KEY (servicio_id, plantilla_id)
    );
  `;

  // ── 11. serviciocomentarios ──
  console.log("11/13 Creando serviciocomentarios...");
  await sql`
    CREATE TABLE IF NOT EXISTS serviciocomentarios (
      serviciocomentario_id SERIAL PRIMARY KEY,
      servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
      serviciocomentario_contenido TEXT NOT NULL,
      serviciocomentario_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      serviciocomentario_hora TIME NOT NULL DEFAULT CURRENT_TIME
    );
    CREATE INDEX IF NOT EXISTS idx_serviciocomentarios_servicio_id ON serviciocomentarios(servicio_id);
  `;

  // ── 12. tareacomentarios ──
  console.log("12/13 Creando tareacomentarios...");
  await sql`
    CREATE TABLE IF NOT EXISTS tareacomentarios (
      tareacomentario_id SERIAL PRIMARY KEY,
      tarea_id INTEGER NOT NULL REFERENCES tareas(tarea_id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
      tareacomentario_contenido TEXT NOT NULL,
      tareacomentario_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      tareacomentario_hora TIME NOT NULL DEFAULT CURRENT_TIME
    );
    CREATE INDEX IF NOT EXISTS idx_tareacomentarios_tarea_id ON tareacomentarios(tarea_id);
  `;

  // ── 13. calificaciones ──
  console.log("13/13 Creando calificaciones...");
  await sql`
    CREATE TABLE IF NOT EXISTS calificaciones (
      calificacion_id SERIAL PRIMARY KEY,
      servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(cliente_id) ON DELETE RESTRICT,
      calificacion_puntaje INTEGER NOT NULL CHECK (calificacion_puntaje >= 1 AND calificacion_puntaje <= 5),
      calificacion_comentario TEXT DEFAULT NULL,
      calificacion_sugerencia TEXT DEFAULT NULL,
      calificacion_observacion TEXT DEFAULT NULL,
      calificacion_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      calificacion_hora TIME NOT NULL DEFAULT CURRENT_TIME
    );
    CREATE INDEX IF NOT EXISTS idx_calificaciones_servicio_id ON calificaciones(servicio_id);
  `;

  // ── 14. auditoria (no tiene FK a servicios) ──
  console.log("14/13 Creando auditoria...");
  await sql`
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
  `;

  console.log("\n✅ Tablas creadas exitosamente");

  await sql.end();
}

setup().catch((err) => {
  console.error("\n❌ Error creando tablas:", err.message);
  process.exit(1);
});
