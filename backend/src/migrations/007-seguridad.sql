-- ============================================================================
-- Migration 007: Seguridad del Sistema — login_attempts, sessions, auditoria_ip
-- ============================================================================
-- EJECUTAR ESTE SQL EN EL SQL EDITOR DEL DASHBOARD DE SUPABASE
-- ============================================================================

-- 1. Tabla login_attempts: registro de intentos de inicio de sesión
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(usuario_id) NULL,
  username_intentado VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  exito BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username_intentado);

-- 2. Tabla sessions: sesiones activas con tracking JTI
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES usuarios(usuario_id),
  token_jti TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(revoked, expires_at);

-- 3. Columna auditoria_ip en tabla auditoria
ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS auditoria_ip VARCHAR(45) NULL;
