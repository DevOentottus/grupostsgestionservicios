-- Tabla de comunicaciones con el cliente
-- Cada fila representa un mensaje enviado desde el staff hacia el cliente
CREATE TABLE IF NOT EXISTS comunicaciones (
  comunicacion_id SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  comunicacion_mensaje TEXT NOT NULL,
  comunicacion_tipo VARCHAR(20) NOT NULL DEFAULT 'avance'
    CHECK (comunicacion_tipo IN ('avance', 'consulta', 'notificacion', 'finalizacion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comunicaciones_servicio
  ON comunicaciones (servicio_id, created_at DESC);
