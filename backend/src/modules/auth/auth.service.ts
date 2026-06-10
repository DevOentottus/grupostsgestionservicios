import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";
import { UnauthorizedError } from "@/core/errors/index.js";
import type { JwtPayload, Rol } from "@/core/types/index.js";

export interface LoginResult {
  user: {
    id: number;
    username: string;
    nombres: string;
    email: string;
    rol: Rol;
    activo: boolean;
    area_id: number | null;
  };
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResult> {
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "usuario_id, usuario_username, usuario_contrasena, usuario_nombres, usuario_apellido_paterno, usuario_correo, usuario_rol, usuario_activo"
    )
    .eq("usuario_username", username)
    .limit(1);

  if (error) throw new Error(`Error de base de datos: ${error.message}`);
  const usuario = usuarios?.[0];
  if (!usuario) throw new UnauthorizedError("Credenciales inválidas");

  if (!usuario.usuario_activo) throw new UnauthorizedError("Usuario desactivado");

  const valida = bcrypt.compareSync(password, usuario.usuario_contrasena);
  if (!valida) throw new UnauthorizedError("Credenciales inválidas");

  return {
    user: {
      id: usuario.usuario_id,
      username: usuario.usuario_username,
      nombres: `${usuario.usuario_nombres} ${usuario.usuario_apellido_paterno || ""}`.trim(),
      email: usuario.usuario_correo,
      rol: (usuario.usuario_rol?.toLowerCase() || "colaborador") as Rol,
      activo: usuario.usuario_activo,
      area_id: null, // area_id no está en la tabla usuarios de Supabase
    },
  };
}

export function generateJwtPayload(
  userId: number,
  rol: Rol,
  area_id: number | null
): JwtPayload {
  return { user_id: userId, rol, area_id };
}
