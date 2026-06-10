import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
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
  };
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.username, username))
    .limit(1);

  if (!usuario) throw new UnauthorizedError("Credenciales inválidas");
  if (!usuario.activo) throw new UnauthorizedError("Usuario desactivado");

  const valida = bcrypt.compareSync(password, usuario.password_hash);
  if (!valida) throw new UnauthorizedError("Credenciales inválidas");

  return {
    user: {
      id: usuario.id,
      username: usuario.username,
      nombres: usuario.nombres,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    },
  };
}

export function generateJwtPayload(userId: number, rol: Rol): JwtPayload {
  return { user_id: userId, rol, area_id: null };
}
