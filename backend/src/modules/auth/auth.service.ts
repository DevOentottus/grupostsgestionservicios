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
    area_nombre: string | null;
  };
}

function nombreCompleto(
  nombres: string,
  apellido_paterno: string | null,
  apellido_materno: string | null
): string {
  const base = (nombres || "").trim();
  const parts = [base];
  for (const ap of [apellido_paterno, apellido_materno]) {
    const s = (ap || "").trim();
    if (!s) continue;
    if (base.toLowerCase().includes(s.toLowerCase())) continue;
    parts.push(s);
  }
  return parts.join(" ");
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResult> {
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "usuario_id, usuario_username, usuario_contrasena, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_correo, usuario_rol, usuario_activo"
    )
    .eq("usuario_username", username)
    .limit(1);

  if (error) throw new Error(`Error de base de datos: ${error.message}`);
  const usuario = usuarios?.[0];
  if (!usuario) throw new UnauthorizedError("Credenciales inválidas");

  if (!usuario.usuario_activo) throw new UnauthorizedError("Usuario desactivado");

  const valida = bcrypt.compareSync(password, usuario.usuario_contrasena);
  if (!valida) throw new UnauthorizedError("Credenciales inválidas");

  // Registrar fecha de último login
  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("usuarios")
    .update({ usuario_ultimo_login: today })
    .eq("usuario_id", usuario.usuario_id);

  // Obtener área del usuario (encargado → area_encargado_id, colaborador → areacolaboradores)
  let area_id: number | null = null;
  let area_nombre: string | null = null;
  if (usuario.usuario_rol?.toLowerCase() === "encargado") {
    const { data: areaData } = await supabase
      .from("areas")
      .select("area_id, area_nombre")
      .eq("area_encargado_id", usuario.usuario_id)
      .limit(1);
    if (areaData?.length) {
      area_id = areaData[0].area_id;
      area_nombre = areaData[0].area_nombre;
    }
  } else if (usuario.usuario_rol?.toLowerCase() === "colaborador") {
    const { data: acData } = await supabase
      .from("areacolaboradores")
      .select("area_id")
      .eq("colaborador_id", usuario.usuario_id)
      .limit(1);
    if (acData?.length) area_id = acData[0].area_id;

    if (area_id) {
      const { data: aData } = await supabase
        .from("areas")
        .select("area_nombre")
        .eq("area_id", area_id)
        .limit(1);
      if (aData?.length) area_nombre = aData[0].area_nombre;
    }
  }

  return {
    user: {
      id: usuario.usuario_id,
      username: usuario.usuario_username,
      nombres: nombreCompleto(
        usuario.usuario_nombres,
        usuario.usuario_apellido_paterno,
        usuario.usuario_apellido_materno,
      ),
      email: usuario.usuario_correo,
      rol: (usuario.usuario_rol?.toLowerCase() || "colaborador") as Rol,
      activo: usuario.usuario_activo,
      area_id,
      area_nombre,
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
