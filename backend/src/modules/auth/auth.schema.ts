import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const crearUsuarioSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres").max(50),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
  nombres: z.string().min(1, "Nombre requerido").max(150),
  email: z.string().email("Email inválido"),
  rol: z.enum(["admin", "encargado", "colaborador"]),
});
