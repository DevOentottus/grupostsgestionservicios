-- ============================================================================
-- Migration 001: Un servicio → un colaborador
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================
-- Paso 1: Agregar columna colaborador_id a servicios
ALTER TABLE servicios
  ADD COLUMN colaborador_id INTEGER
  REFERENCES usuarios(usuario_id) ON DELETE SET NULL;

-- Paso 2: Migrar datos existentes desde serviciocolaboradores
-- Toma el primer colaborador asignado a cada servicio
UPDATE servicios s
SET colaborador_id = sub.primer_colaborador
FROM (
  SELECT DISTINCT ON (sc.servicio_id)
    sc.servicio_id,
    sc.colaborador_id AS primer_colaborador
  FROM serviciocolaboradores sc
  ORDER BY sc.servicio_id, sc.colaborador_id
) sub
WHERE s.servicio_id = sub.servicio_id;

-- Paso 3: Verificar la migración
-- Descomentar para revisar:
-- SELECT s.servicio_codigo, s.servicio_nombre, s.colaborador_id, u.usuario_nombres
-- FROM servicios s
-- LEFT JOIN usuarios u ON u.usuario_id = s.colaborador_id
-- WHERE s.colaborador_id IS NOT NULL
-- ORDER BY s.servicio_id;

-- Paso 4: (Opcional) Agregar índice para performance
CREATE INDEX IF NOT EXISTS idx_servicios_colaborador_id ON servicios(colaborador_id);
