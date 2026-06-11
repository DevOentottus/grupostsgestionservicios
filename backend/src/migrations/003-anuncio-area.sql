-- ============================================================================
-- Migration 003: Agregar area_id a anuncios (comunicaciones)
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

-- Paso 1: Agregar columna area_id a anuncios
-- NULL = general para todas las áreas
ALTER TABLE anuncios
  ADD COLUMN area_id INTEGER
  REFERENCES areas(area_id) ON DELETE SET NULL;

-- Paso 2: Índice para filtrar anuncios por área
CREATE INDEX IF NOT EXISTS idx_anuncios_area_id ON anuncios(area_id);
