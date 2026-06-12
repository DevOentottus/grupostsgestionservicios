-- Migración: Crear tabla serviciovisitas para tracking de visitas de clientes
-- Las columnas usan el prefijo servi ciovisita_ siguiendo la convención del proyecto

CREATE TABLE IF NOT EXISTS serviciovisitas (
  serviciovisita_id SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(servicio_id) ON DELETE CASCADE,
  serviciovisita_fecha DATE NOT NULL,
  serviciovisita_hora TIME NOT NULL,
  serviciovisita_ip VARCHAR(45) DEFAULT NULL,
  serviciovisita_user_agent TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_serviciovisitas_servicio ON serviciovisitas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_serviciovisitas_fecha ON serviciovisitas(serviciovisita_fecha);
