-- Normalizar roles de usuario a minúsculas
-- El CHECK constraint original solo permitía: 'Sistema', 'Administrador', 'Encargado', 'Colaborador'
-- Ahora usamos valores normalizados en minúsculas que coinciden con el middleware authorize

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_usuario_rol_check;

UPDATE usuarios SET usuario_rol = 'admin' WHERE LOWER(usuario_rol) = 'administrador';
UPDATE usuarios SET usuario_rol = 'sistema' WHERE LOWER(usuario_rol) = 'sistema';
UPDATE usuarios SET usuario_rol = 'encargado' WHERE LOWER(usuario_rol) = 'encargado';
UPDATE usuarios SET usuario_rol = 'colaborador' WHERE LOWER(usuario_rol) = 'colaborador';
