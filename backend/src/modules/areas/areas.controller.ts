import { FastifyInstance } from "fastify";
import { supabase, type TablesUpdate } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const crearAreaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(150),
  encargado_id: z.number().int().nullable().optional(),
});

const actualizarAreaSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  encargado_id: z.number().int().nullable().optional(),
});

/** Upgrade un colaborador a encargado, y revierte el anterior si queda sin áreas */
async function sincronizarRolEncargado(
  nuevoEncargadoId: number | null,
  viejoEncargadoId: number | null,
) {
  // Subir rol del nuevo encargado si era colaborador
  if (nuevoEncargadoId) {
    const { data: user } = await supabase
      .from("usuarios")
      .select("usuario_id, usuario_rol")
      .eq("usuario_id", nuevoEncargadoId)
      .limit(1)
      .single();

    if (user && user.usuario_rol === "colaborador") {
      await supabase
        .from("usuarios")
        .update({ usuario_rol: "encargado" })
        .eq("usuario_id", nuevoEncargadoId);
    }
  }

  // Bajar rol del anterior encargado si ya no es encargado de ninguna área
  if (viejoEncargadoId && viejoEncargadoId !== nuevoEncargadoId) {
    const { data: otrasAreas } = await supabase
      .from("areas")
      .select("area_id")
      .eq("area_encargado_id", viejoEncargadoId);

    if (!otrasAreas?.length) {
      const { data: oldUser } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_rol")
        .eq("usuario_id", viejoEncargadoId)
        .limit(1)
        .single();

      if (oldUser && oldUser.usuario_rol === "encargado") {
        await supabase
          .from("usuarios")
          .update({ usuario_rol: "colaborador" })
          .eq("usuario_id", viejoEncargadoId);
      }
    }
  }
}

export async function areasController(app: FastifyInstance) {
  // NOTA: No usar app.addHook("preHandler", authenticate) en serverless/emit.
  // El hook de scope + route-level preHandler combinados causan timeout en Vercel.
  // Cada ruta debe incluir authenticate + authorize en su propio preHandler.

  // ÔöÇÔöÇ GET /api/areas ÔÇö listar todas las áreas ÔöÇÔöÇ
  app.get(
    "/api/areas",
    { preHandler: [requireRoles("admin", "sistema", "encargado", "colaborador")] },
    async (request) => {
      const user = request.user as {
        rol: string;
        user_id: number;
        area_id: number | null;
      };

      // 1. Obtener IDs de áreas según el rol
      let areaIds: number[] | null = null;

      if (user.rol === "encargado" || user.rol === "colaborador") {
        const { data: rows } = user.rol === "encargado"
          ? await supabase.from("areas").select("area_id").eq("area_encargado_id", user.user_id)
          : await supabase.from("areacolaboradores").select("area_id").eq("colaborador_id", user.user_id);

        areaIds = (rows || []).map((r) => r.area_id);
        if (areaIds.length === 0) return { data: [] };
      }

      // 2. Query simplificada sin ORDER primero para aislar el problema
      let q = supabase.from("areas").select("area_id, area_nombre, area_encargado_id, area_fecha_creacion");

      if (areaIds) q = q.in("area_id", areaIds);

      const { data: areasData, error } = await q;
      if (error) throw new Error(error.message);
      if (!areasData?.length) return { data: [] };

      // Deduplicar por nombre de área (conservar el área más antigua)
      const seen = new Map<string, (typeof areasData)[number]>();
      for (const a of areasData) {
        if (!seen.has(a.area_nombre)) {
          seen.set(a.area_nombre, a);
        }
      }
      const uniqueAreas = Array.from(seen.values());

      // 3. Obtener encargados y counts
      const encargadoIds = [...new Set(uniqueAreas.map((a) => a.area_encargado_id).filter(Boolean))];

      const encResult = encargadoIds.length > 0
        ? await supabase.from("usuarios").select("usuario_id, usuario_nombres, usuario_correo, usuario_username").in("usuario_id", encargadoIds)
        : null;
      const countResult = await supabase.from("areacolaboradores").select("area_id");

      const encMap = new Map((encResult?.data || []).map((u) => [u.usuario_id, u]));
      const cMap = new Map<number, number>();
      for (const c of countResult.data || []) {
        cMap.set(c.area_id, (cMap.get(c.area_id) || 0) + 1);
      }

      const rows = uniqueAreas.map((a: any) => {
        const enc = encMap.get(a.area_encargado_id);
        return {
          id: a.area_id,
          nombre: a.area_nombre,
          encargado_id: a.area_encargado_id,
          created_at: a.area_fecha_creacion,
          updated_at: null,
          encargado_nombres: enc?.usuario_nombres || null,
          encargado_email: enc?.usuario_correo || null,
          encargado_username: enc?.usuario_username || null,
          colaborador_count: cMap.get(a.area_id) || 0,
        };
      });

      rows.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

      return { data: rows };
    }
  );

  // ÔöÇÔöÇ GET /api/areas/:id ÔÇö obtener área con colaboradores ÔöÇÔöÇ
  app.get(
    "/api/areas/:id",
    { preHandler: [requireRoles("admin", "sistema", "encargado")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const areaId = parseInt(id);

      const { data: areas } = await supabase
        .from("areas")
        .select("*")
        .eq("area_id", areaId)
        .limit(1);

      const area = areas?.[0];
      if (!area) throw new NotFoundError("Área no encontrada");

      // Obtener colaboradores
      const { data: asignaciones } = await supabase
        .from("areacolaboradores")
        .select(`
          colaborador_id,
          usuarios!areacolaboradores_colaborador_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          )
        `)
        .eq("area_id", areaId);

      const colaboradores = (asignaciones || []).map((a: any) => {
        const u = a.usuarios || {};
        return {
          usuario_id: u.usuario_id || a.colaborador_id,
          id: u.usuario_id || a.colaborador_id,
          nombres: u.usuario_nombres || null,
          email: u.usuario_correo || null,
          username: u.usuario_username || null,
        };
      });

      return reply.send({
        data: {
          id: area.area_id,
          nombre: area.area_nombre,
          encargado_id: area.area_encargado_id,
          created_at: area.area_fecha_creacion,
          colaboradores,
        },
      });
    }
  );

  // ÔöÇÔöÇ POST /api/areas ÔÇö crear área ÔöÇÔöÇ
  app.post(
    "/api/areas",
    { preHandler: [requireRoles("admin", "sistema")] },
    async (request, reply) => {
      const input = crearAreaSchema.parse(request.body);
      const now = new Date();

      const { data: newAreas, error } = await supabase
        .from("areas")
        .insert({
          area_nombre: input.nombre,
          area_encargado_id: input.encargado_id ?? null,
          area_fecha_creacion: now.toISOString().split("T")[0],
        })
        .select();

      if (error) throw new Error(error.message);
      const area = newAreas?.[0];
      if (!area) throw new Error("No se pudo crear el área");

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "CREATE", "area", area.area_id, {
        nombre: input.nombre,
      });

      // Sincronizar rol del usuario asignado como encargado
      await sincronizarRolEncargado(input.encargado_id ?? null, null);

      return reply.status(201).send({
        data: {
          id: area.area_id,
          nombre: area.area_nombre,
          encargado_id: area.area_encargado_id,
          created_at: area.area_fecha_creacion,
        },
      });
    }
  );

  // ÔöÇÔöÇ PUT /api/areas/:id ÔÇö actualizar área ÔöÇÔöÇ
  app.put(
    "/api/areas/:id",
    { preHandler: [requireRoles("admin", "sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = actualizarAreaSchema.parse(request.body);
      const areaId = parseInt(id);

      const { data: existing } = await supabase
        .from("areas")
        .select("area_id, area_encargado_id")
        .eq("area_id", areaId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Área no encontrada");

      const oldEncargadoId = existing[0].area_encargado_id ?? null;

      const updateData: TablesUpdate<"areas"> = {};
      if (input.nombre !== undefined) updateData.area_nombre = input.nombre;
      if (input.encargado_id !== undefined) updateData.area_encargado_id = input.encargado_id;

      const { data: updatedAreas } = await supabase
        .from("areas")
        .update(updateData)
        .eq("area_id", areaId)
        .select();

      const updated = updatedAreas?.[0];

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "UPDATE", "area", areaId, {
        campos: Object.keys(input),
      });

      // Sincronizar rol del nuevo/anterior encargado
      const nuevoEncargadoId = input.encargado_id !== undefined ? input.encargado_id : oldEncargadoId;
      await sincronizarRolEncargado(nuevoEncargadoId, oldEncargadoId);

      return reply.send({
        data: updated
          ? {
              id: updated.area_id,
              nombre: updated.area_nombre,
              encargado_id: updated.area_encargado_id,
            }
          : null,
      });
    }
  );

  // ÔöÇÔöÇ DELETE /api/areas/:id ÔÇö eliminar área ÔöÇÔöÇ
  app.delete(
    "/api/areas/:id",
    { preHandler: [requireRoles("admin", "sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const areaId = parseInt(id);

      const { data: areas } = await supabase
        .from("areas")
        .select("area_id, area_nombre")
        .eq("area_id", areaId)
        .limit(1);

      const area = areas?.[0];
      if (!area) throw new NotFoundError("Área no encontrada");

      // Verificar que no tenga servicios asignados
      const { count } = await supabase
        .from("servicios")
        .select("*", { count: "exact", head: true })
        .eq("area_id", areaId);

      if (count && count > 0) {
        throw new ConflictError("No se puede eliminar el área porque tiene servicios asignados");
      }

      await supabase.from("areas").delete().eq("area_id", areaId);

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "DELETE", "area", areaId, {
        nombre: area.area_nombre,
      });

      return reply.status(204).send();
    }
  );

  // ÔöÇÔöÇ POST /api/areas/:id/colaboradores ÔÇö agregar colaborador ÔöÇÔöÇ
  app.post(
    "/api/areas/:id/colaboradores",
    { preHandler: [requireRoles("admin", "sistema", "encargado")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { usuario_id: number };
      const areaId = parseInt(id);

      if (!body.usuario_id) {
        throw new ValidationError("usuario_id es requerido");
      }

      const { data: areas } = await supabase
        .from("areas")
        .select("area_id")
        .eq("area_id", areaId)
        .limit(1);

      if (!areas?.length) throw new NotFoundError("Área no encontrada");

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("usuario_id")
        .eq("usuario_id", body.usuario_id)
        .limit(1);

      if (!usuarios?.length) throw new NotFoundError("Usuario no encontrado");

      // Insertar (ignorar duplicado)
      const { error } = await supabase
        .from("areacolaboradores")
        .insert({
          area_id: areaId,
          colaborador_id: body.usuario_id,
        });

      if (error && !error.message.includes("duplicate")) {
        throw new Error(error.message);
      }

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "CREATE", "area-colaborador", areaId, {
        usuario_id: body.usuario_id,
      });

      return reply.status(201).send({ data: { success: true } });
    }
  );

  // ÔöÇÔöÇ GET /api/areas/:id/servicios ÔÇö servicios del área ÔöÇÔöÇ
  app.get(
    "/api/areas/:id/servicios",
    { preHandler: [requireRoles("admin", "sistema", "encargado")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const areaId = parseInt(id);

      const { data: areas } = await supabase
        .from("areas")
        .select("*")
        .eq("area_id", areaId)
        .limit(1);

      if (!areas?.length) throw new NotFoundError("Área no encontrada");
      const area = areas[0];

      const { data: serviciosData } = await supabase
        .from("servicios")
        .select("*")
        .eq("area_id", areaId)
        .order("servicio_fecha_creacion", { ascending: false });

      const servicios = (serviciosData || []).map((s: any) => ({
        id: s.servicio_id,
        codigo: s.servicio_codigo,
        titulo: s.servicio_nombre,
        descripcion: s.servicio_descripcion,
        estado: s.servicio_estado,
        area_id: s.area_id,
        created_at: s.servicio_fecha_creacion,
        fecha_inicio: s.servicio_fecha_inicio,
        fecha_fin: s.servicio_fecha_fin,
        tiempo_estimado: s.servicio_tiempo_estimado,
        prioridad: "media", // no disponible en Supabase
        cliente_nombre: s.cliente_id ? `Cliente #${s.cliente_id}` : null,
      }));

      const estadoCounts = {
        total: servicios.length,
        pendiente: servicios.filter((s) => s.estado === "pendiente").length,
        en_progreso: servicios.filter((s) => s.estado === "en_progreso").length,
        completado: servicios.filter((s) => s.estado === "completado").length,
        bloqueado: servicios.filter((s) => s.estado === "bloqueado").length,
        cancelado: servicios.filter((s) => s.estado === "cancelado").length,
      };

      return {
        data: {
          area: {
            id: area.area_id,
            nombre: area.area_nombre,
            encargado_id: area.area_encargado_id,
          },
          servicios,
          estado_counts: estadoCounts,
          tiempo_promedio: 0, // tiempo_tracking no disponible en Supabase
        },
      };
    }
  );

  // ÔöÇÔöÇ DELETE /api/areas/:id/colaboradores/:usuario_id ÔÇö remover colaborador ÔöÇÔöÇ
  app.delete(
    "/api/areas/:id/colaboradores/:usuario_id",
    { preHandler: [requireRoles("admin", "sistema", "encargado")] },
    async (request, reply) => {
      const { id, usuario_id } = request.params as {
        id: string;
        usuario_id: string;
      };

      await supabase
        .from("areacolaboradores")
        .delete()
        .eq("area_id", parseInt(id))
        .eq("colaborador_id", parseInt(usuario_id));

      const authUser = request.user as { user_id: number };
      await auditLog(null, authUser.user_id, "DELETE", "area-colaborador", parseInt(id), {
        usuario_id: parseInt(usuario_id),
      });

      return reply.status(204).send();
    }
  );
}
