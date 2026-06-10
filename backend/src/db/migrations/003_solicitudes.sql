CREATE TABLE IF NOT EXISTS solicitudes (
  solicitud_id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
  solicitud_tipo VARCHAR(30) NOT NULL DEFAULT 'apoyo'
    CHECK (solicitud_tipo IN ('apoyo', 'herramienta', 'equipo', 'otro')),
  solicitud_descripcion TEXT NOT NULL,
  solicitud_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (solicitud_estado IN ('pendiente', 'en_proceso', 'resuelto', 'rechazado')),
  solicitud_prioridad VARCHAR(10) NOT NULL DEFAULT 'media'
    CHECK (solicitud_prioridad IN ('baja', 'media', 'alta', 'urgente')),
  atendido_por INTEGER DEFAULT NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
  solicitud_respuesta TEXT DEFAULT NULL,
  solicitud_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  solicitud_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME,
  solicitud_fecha_atencion DATE DEFAULT NULL,
  solicitud_hora_atencion TIME DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(solicitud_estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(usuario_id);
