import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
} from "@/modules/auth/auth.schema.js";
import { generarUsername, auditLog } from "@/core/utils/index.js";

function splitApellidos(apellidos: string): {
  apellido_paterno: string;
  apellido_materno: string | null;
} {
  const parts = (apellidos || "").trim().split(/\s+/);
  return {
    apellido_paterno: parts[0] || "",
    apellido_materno: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function combineApellidos(paterno: string, materno: string | null): string {
  return [paterno, materno].filter(Boolean).join(" ");
}

export async function usuariosController(app: FastifyInstance) {
  // NOTA: No usar app.addHook("preHandler", authenticate) en serverless/emit.
  // El hook de scope + route-level preHandler combinados causan timeout en Vercel.
  // Cada ruta debe incluir authenticate + authorize en su propio preHandler.

  // ── GET /api/usuarios ──
  app.get(
    "/api/usuarios",
    { preHandler: [requireRoles("sistema", "admin", "encargado")] },
    async () => {
      const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_username, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_dni, usuario_telefono, usuario_correo, usuario_rol, usuario_activo, usuario_fecha_creacion")
        .limit(50);

      if (error) {
        return { data: [], error: error.message };
      }

      const rows = (usuarios || []).map((u: any) => ({
        id: u.usuario_id,
        username: u.usuario_username,
        nombres: u.usuario_nombres,
        apellidos: combineApellidos(u.usuario_apellido_paterno, u.usuario_apellido_materno),
        dni: u.usuario_dni,
        telefono: u.usuario_telefono,
        email: u.usuario_correo,
        rol: u.usuario_rol?.toLowerCase(),
        activo: u.usuario_activo,
        area_id: null,
        created_at: u.usuario_fecha_creacion,
      }));

      return { data: rows };
    }
  );

  // ── POST /api/usuarios ──
  app.post(
    "/api/usuarios",
    { preHandler: [requireRoles("sistema")] },
    async (request, reply) => {
      const input = crearUsuarioSchema.parse(request.body);

      // Verificar DNI único si se proporciona
      if (input.dni) {
        const { data: existentes } = await supabase
          .from("usuarios")
          .select("usuario_id")
          .eq("usuario_dni", input.dni)
          .limit(1);

        if (existentes?.length) throw new ValidationError("El DNI ya está registrado");
      }

      // Verificar email único
      const { data: emailExist } = await supabase
        .from("usuarios")
        .select("usuario_id")
        .eq("usuario_correo", input.email)
        .limit(1);

      if (emailExist?.length) throw new ValidationError("El email ya está registrado");

      // Auto-generar username si no se proporciona
      let username = input.username;
      if (!username) {
        const { data: allUsers } = await supabase
          .from("usuarios")
          .select("usuario_username");
        const existingUsernames = (allUsers || []).map((u) => u.usuario_username);
        username = generarUsername(
          input.nombres,
          input.apellidos || input.nombres,
          existingUsernames
        );
      }

      const hash = bcrypt.hashSync(input.password, 10);
      const now = new Date();
      const apellidos = splitApellidos(input.apellidos || input.nombres);

      const { data: newUsers, error } = await supabase
        .from("usuarios")
        .insert({
          usuario_username: username,
          usuario_contrasena: hash,
          usuario_nombres: input.nombres,
          usuario_apellido_paterno: apellidos.apellido_paterno,
          usuario_apellido_materno: apellidos.apellido_materno,
          usuario_dni: input.dni || null,
          usuario_telefono: input.telefono || null,
          usuario_correo: input.email,
          usuario_rol: input.rol, // lowercase — Supabase lo almacena como está
          usuario_activo: true,
          usuario_fecha_creacion: now.toISOString().split("T")[0],
          usuario_hora_creacion: now.toTimeString().split(" ")[0],
        })
        .select(
          "usuario_id, usuario_username, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_dni, usuario_telefono, usuario_correo, usuario_rol, usuario_activo, usuario_fecha_creacion"
        );

      if (error) throw new Error(error.message);
      const user = newUsers?.[0];
      if (!user) throw new Error("No se pudo crear el usuario");

      // Auditoría
      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "CREATE", "usuario", user.usuario_id, {
        username,
      });

      return reply.status(201).send({
        data: {
          id: user.usuario_id,
          username: user.usuario_username,
          nombres: user.usuario_nombres,
          apellidos: combineApellidos(user.usuario_apellido_paterno, user.usuario_apellido_materno),
          dni: user.usuario_dni,
          telefono: user.usuario_telefono,
          email: user.usuario_correo,
          rol: user.usuario_rol?.toLowerCase(),
          activo: user.usuario_activo,
          created_at: user.usuario_fecha_creacion,
        },
      });
    }
  );

  // ── PUT /api/usuarios/:id ──
  app.put(
    "/api/usuarios/:id",
    { preHandler: [requireRoles("sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = actualizarUsuarioSchema.parse(request.body);

      // Verificar DNI único si cambia
      if (input.dni) {
        const { data: existentes } = await supabase
          .from("usuarios")
          .select("usuario_id")
          .eq("usuario_dni", input.dni)
          .neq("usuario_id", parseInt(id))
          .limit(1);

        if (existentes?.length) throw new ValidationError("El DNI ya está registrado");
      }

      const updateData: Record<string, unknown> = {};
      if (input.nombres !== undefined) updateData.usuario_nombres = input.nombres;
      if (input.apellidos !== undefined) {
        const a = splitApellidos(input.apellidos);
        updateData.usuario_apellido_paterno = a.apellido_paterno;
        updateData.usuario_apellido_materno = a.apellido_materno;
      }
      if (input.dni !== undefined) updateData.usuario_dni = input.dni;
      if (input.telefono !== undefined) updateData.usuario_telefono = input.telefono;
      if (input.email !== undefined) updateData.usuario_correo = input.email;
      if (input.rol !== undefined) updateData.usuario_rol = input.rol;
      if (input.username !== undefined) updateData.usuario_username = input.username;

      const { data: updatedUsers, error } = await supabase
        .from("usuarios")
        .update(updateData)
        .eq("usuario_id", parseInt(id))
        .select(
          "usuario_id, usuario_username, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_dni, usuario_telefono, usuario_correo, usuario_rol, usuario_activo"
        );

      if (error) throw new Error(error.message);
      if (!updatedUsers?.length) throw new NotFoundError("Usuario no encontrado");

      const updated = updatedUsers[0];
      // Auditoría
      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "UPDATE", "usuario", parseInt(id), {
        campos: Object.keys(input),
      });

      return reply.send({
        data: {
          id: updated.usuario_id,
          username: updated.usuario_username,
          nombres: updated.usuario_nombres,
          apellidos: combineApellidos(updated.usuario_apellido_paterno, updated.usuario_apellido_materno),
          dni: updated.usuario_dni,
          telefono: updated.usuario_telefono,
          email: updated.usuario_correo,
          rol: updated.usuario_rol?.toLowerCase(),
          activo: updated.usuario_activo,
          area_id: null,
        },
      });
    }
  );

  // ── PUT /api/usuarios/:id/password ──
  app.put(
    "/api/usuarios/:id/password",
    { preHandler: [requireRoles("sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { password: string };

      if (!body.password || body.password.length < 6) {
        throw new ValidationError(
          "La contraseña debe tener al menos 6 caracteres"
        );
      }

      const { data: users } = await supabase
        .from("usuarios")
        .select("usuario_id")
        .eq("usuario_id", parseInt(id))
        .limit(1);

      if (!users?.length) throw new NotFoundError("Usuario no encontrado");

      const hash = bcrypt.hashSync(body.password, 10);
      await supabase
        .from("usuarios")
        .update({ usuario_contrasena: hash })
        .eq("usuario_id", parseInt(id));

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "UPDATE", "usuario-password", parseInt(id));

      return reply.send({ data: { success: true } });
    }
  );

  // ── PATCH /api/usuarios/:id/estado ──
  app.patch(
    "/api/usuarios/:id/estado",
    { preHandler: [requireRoles("sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const { data: users } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_activo")
        .eq("usuario_id", parseInt(id))
        .limit(1);

      if (!users?.length) throw new NotFoundError("Usuario no encontrado");
      const user = users[0];
      const nuevoActivo = !user.usuario_activo;

      const { data: updatedUsers } = await supabase
        .from("usuarios")
        .update({ usuario_activo: nuevoActivo })
        .eq("usuario_id", parseInt(id))
        .select("usuario_id, usuario_activo");

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "UPDATE", "usuario", parseInt(id), {
        campo: "activo",
        valor_anterior: user.usuario_activo,
        valor_nuevo: nuevoActivo,
      });

      const updated = updatedUsers?.[0];
      return reply.send({
        data: { id: updated?.usuario_id, activo: updated?.usuario_activo },
      });
    }
  );
}
