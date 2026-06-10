import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors/index.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
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

export async function areasController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── GET /api/areas — listar todas las áreas ──
  app.get(
    "/api/areas",
    { preHandler: [authorize("admin", "encargado", "colaborador")] },
    async (request) => {
      const user = request.user as {
        rol: string;
        user_id: number;
        area_id: number | null;
      };

      // Obtener áreas según el rol del usuario
      let query = supabase
        .from("areas")
        .select(`
          area_id,
          area_nombre,
          area_encargado_id,
          area_fecha_creacion,
          usuarios!areas_area_encargado_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          )
        `)
        .order("area_nombre", { ascending: true });

      if (user.rol === "encargado") {
        // Encargado: solo su área
        const { data: encAreas } = await supabase
          .from("areas")
          .select("area_id")
          .eq("area_encargado_id", user.user_id);

        const areaIds = (encAreas || []).map((a) => a.area_id);
        if (areaIds.length > 0) {
          query = query.in("area_id", areaIds);
        } else {
          query = query.eq("area_encargado_id", user.user_id);
        }
      } else if (user.rol === "colaborador") {
        // Colaborador: áreas donde está asignado
        const { data: cols } = await supabase
          .from("areacolaboradores")
          .select("area_id")
          .eq("colaborador_id", user.user_id);

        const areaIds = (cols || []).map((c) => c.area_id);
        if (areaIds.length > 0) {
          query = query.in("area_id", areaIds);
        } else {
          return { data: [] };
        }
      }
      // Admin: todas (sin filtro)

      const { data: areasData, error } = await query;
      if (error) throw new Error(error.message);

      // Obtener conteo de colaboradores por área
      const rows = await Promise.all(
        (areasData || []).map(async (a: any) => {
          const { count } = await supabase
            .from("areacolaboradores")
            .select("*", { count: "exact", head: true })
            .eq("area_id", a.area_id);

          const encargado = a.usuarios || null;
          return {
            id: a.area_id,
            nombre: a.area_nombre,
            encargado_id: a.area_encargado_id,
            created_at: a.area_fecha_creacion,
            updated_at: null,
            encargado_nombres: encargado?.usuario_nombres || null,
            encargado_email: encargado?.usuario_correo || null,
            encargado_username: encargado?.usuario_username || null,
            colaborador_count: count || 0,
          };
        })
      );

      // Ordenar por nombre (en memoria porque los joins complican el ordering)
      rows.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

      return { data: rows };
    }
  );

  // ── GET /api/areas/:id — obtener área con colaboradores ──
  app.get(
    "/api/areas/:id",
    { preHandler: [authorize("admin", "encargado")] },
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

  // ── POST /api/areas — crear área ──
  app.post(
    "/api/areas",
    { preHandler: [authorize("admin")] },
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

  // ── PUT /api/areas/:id — actualizar área ──
  app.put(
    "/api/areas/:id",
    { preHandler: [authorize("admin")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = actualizarAreaSchema.parse(request.body);
      const areaId = parseInt(id);

      const { data: existing } = await supabase
        .from("areas")
        .select("area_id")
        .eq("area_id", areaId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Área no encontrada");

      const updateData: Record<string, unknown> = {};
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

  // ── DELETE /api/areas/:id — eliminar área ──
  app.delete(
    "/api/areas/:id",
    { preHandler: [authorize("admin")] },
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

  // ── POST /api/areas/:id/colaboradores — agregar colaborador ──
  app.post(
    "/api/areas/:id/colaboradores",
    { preHandler: [authorize("admin", "encargado")] },
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

  // ── GET /api/areas/:id/servicios — servicios del área ──
  app.get(
    "/api/areas/:id/servicios",
    { preHandler: [authorize("admin", "encargado")] },
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

  // ── DELETE /api/areas/:id/colaboradores/:usuario_id — remover colaborador ──
  app.delete(
    "/api/areas/:id/colaboradores/:usuario_id",
    { preHandler: [authorize("admin", "encargado")] },
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
