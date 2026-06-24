-- ============================================================================
-- Migration 006: Tabla para suscripciones push de clientes
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  dni TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_dni ON push_subscriptions(dni);
