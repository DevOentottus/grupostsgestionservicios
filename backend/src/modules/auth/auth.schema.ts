import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const crearUsuarioSchema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
  nombres: z.string().min(1, "Nombre requerido").max(150),
  apellido_paterno: z.string().min(1, "Apellido paterno requerido").max(100),
  apellido_materno: z.string().max(100).optional(),
  // compatibilidad: apellidos como string único (se parsea)
  apellidos: z.string().max(150).optional(),
  dni: z.string().max(20).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email("Email inválido"),
  rol: z.enum(["admin", "colaborador", "sistema"]),
  area_ids: z.array(z.number().int().positive()).optional(),
});

export const actualizarUsuarioSchema = z.object({
  nombres: z.string().min(1).max(150).optional(),
  apellido_paterno: z.string().max(100).optional(),
  apellido_materno: z.string().max(100).optional(),
  apellidos: z.string().max(150).optional(),
  dni: z.string().max(20).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email().optional(),
  rol: z.enum(["admin", "colaborador", "sistema", "encargado"]).optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
  area_ids: z.array(z.number().int().positive()).optional(),
});
