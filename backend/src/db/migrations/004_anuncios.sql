CREATE TABLE IF NOT EXISTS anuncios (
  anuncio_id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
  anuncio_titulo VARCHAR(200) NOT NULL,
  anuncio_contenido TEXT NOT NULL,
  anuncio_activo BOOLEAN NOT NULL DEFAULT TRUE,
  anuncio_prioridad VARCHAR(15) NOT NULL DEFAULT 'informativo'
    CHECK (anuncio_prioridad IN ('informativo', 'importante', 'urgente')),
  anuncio_fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
  anuncio_hora_publicacion TIME NOT NULL DEFAULT CURRENT_TIME,
  anuncio_fecha_expiracion DATE DEFAULT NULL,
  anuncio_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  anuncio_hora_creacion TIME NOT NULL DEFAULT CURRENT_TIME
);

CREATE INDEX IF NOT EXISTS idx_anuncios_activo ON anuncios(anuncio_activo);
CREATE INDEX IF NOT EXISTS idx_anuncios_fecha ON anuncios(anuncio_fecha_publicacion DESC);
