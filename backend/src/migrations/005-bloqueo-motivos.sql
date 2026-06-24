-- ============================================================================
-- Migration 005: Agregar columnas para motivo de bloqueo y desbloqueo
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS servicio_bloqueado_motivo TEXT,
  ADD COLUMN IF NOT EXISTS servicio_desbloqueo_motivo TEXT;
