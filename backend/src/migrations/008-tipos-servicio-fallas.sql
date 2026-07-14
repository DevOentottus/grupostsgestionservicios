-- ============================================================================
-- Migration 008: Tipos de servicio y fallas comunes
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

-- 1. Tabla: tipos_servicio
CREATE TABLE IF NOT EXISTS tipos_servicio (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tiempo_estimado_min INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla: fallas_comunes
CREATE TABLE IF NOT EXISTS fallas_comunes (
  id SERIAL PRIMARY KEY,
  tipo_servicio_id INTEGER NOT NULL REFERENCES tipos_servicio(id) ON DELETE CASCADE,
  nombre VARCHAR(300) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fallas_comunes_tipo_servicio_id ON fallas_comunes(tipo_servicio_id);

-- 3. Agregar columna tipo_servicio_id a servicios
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS tipo_servicio_id INTEGER
  REFERENCES tipos_servicio(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_servicios_tipo_servicio_id ON servicios(tipo_servicio_id);
