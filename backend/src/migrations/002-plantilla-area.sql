-- ============================================================================
-- Migration 002: Agregar area_id a plantillas
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

-- Paso 1: Agregar columna area_id a plantillas
ALTER TABLE plantillas
  ADD COLUMN area_id INTEGER
  REFERENCES areas(area_id) ON DELETE SET NULL;

-- Paso 2: Índice para filtrar rápido por área
CREATE INDEX IF NOT EXISTS idx_plantillas_area_id ON plantillas(area_id);
