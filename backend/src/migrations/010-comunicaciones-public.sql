-- Permitir mensajes del cliente en comunicaciones
-- Hacemos usuario_id nullable para que el cliente pueda escribir sin estar en usuarios
ALTER TABLE comunicaciones
  ALTER COLUMN usuario_id DROP NOT NULL;

-- remitente_nombre: nombre visible del remitente (cliente o staff)
ALTER TABLE comunicaciones
  ADD COLUMN IF NOT EXISTS remitente_nombre VARCHAR(255);

-- es_cliente: true = mensaje del cliente, false = mensaje del staff
ALTER TABLE comunicaciones
  ADD COLUMN IF NOT EXISTS es_cliente BOOLEAN NOT NULL DEFAULT false;
