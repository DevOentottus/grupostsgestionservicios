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

  // Obtener área del usuario (encargado → area_encargado_id, colaborador → areacolaboradores)
  let area_id: number | null = null;
  if (usuario.usuario_rol?.toLowerCase() === "encargado") {
    const { data: areaData } = await supabase
      .from("areas")
      .select("area_id")
      .eq("area_encargado_id", usuario.usuario_id)
      .limit(1);
    if (areaData?.length) area_id = areaData[0].area_id;
  } else if (usuario.usuario_rol?.toLowerCase() === "colaborador") {
    const { data: acData } = await supabase
      .from("areacolaboradores")
      .select("area_id")
      .eq("colaborador_id", usuario.usuario_id)
      .limit(1);
    if (acData?.length) area_id = acData[0].area_id;
  }

  return {
    user: {
      id: usuario.usuario_id,
      username: usuario.usuario_username,
      nombres: `${usuario.usuario_nombres} ${usuario.usuario_apellido_paterno || ""}`.trim(),
      email: usuario.usuario_correo,
      rol: (usuario.usuario_rol?.toLowerCase() || "colaborador") as Rol,
      activo: usuario.usuario_activo,
      area_id,
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
