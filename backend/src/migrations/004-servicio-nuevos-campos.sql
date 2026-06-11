-- ============================================================================
-- Migration 004: Agregar campos de cliente, equipo, accesorios a servicios
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

-- Cliente (datos directos en el servicio, sin tabla separada)
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS cliente_dni VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cliente_apellido_paterno VARCHAR(150),
  ADD COLUMN IF NOT EXISTS cliente_apellido_materno VARCHAR(150),
  ADD COLUMN IF NOT EXISTS cliente_nombres VARCHAR(150),
  ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(30);

-- Equipo
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS servicio_descripcion_equipo TEXT,
  ADD COLUMN IF NOT EXISTS servicio_serie_equipo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS servicio_detalles_equipo TEXT;

-- Accesorios
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS servicio_descripcion_accesorio TEXT,
  ADD COLUMN IF NOT EXISTS servicio_detalles_accesorio TEXT;

-- Servicio (nuevos campos)
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS servicio_cliente_reporte TEXT,
  ADD COLUMN IF NOT EXISTS servicio_diagnostico_inicial TEXT;

-- Plantilla inicial (FK opcional)
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS id_plantilla_inicial INTEGER
  REFERENCES plantillas(plantilla_id) ON DELETE SET NULL;
