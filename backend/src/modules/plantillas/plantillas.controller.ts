import { FastifyInstance } from "fastify";
import { supabase, type TablesUpdate } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const crearPlantillaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(150),
  descripcion: z.string().nullable().optional(),
  area_id: z.number().int().nullable().optional(),
  tareas: z
    .array(
      z.object({
        titulo: z.string().min(1, "Título de tarea requerido"),
        sort_order: z.number().int().optional(),
        asignado_a: z.number().int().nullable().optional(),
        obligatoria: z.boolean().optional(),
      })
    )
    .optional(),
});

const actualizarPlantillaSchema = z.object({
  nombre: z.string().min(1).max(150).optional(),
  descripcion: z.string().nullable().optional(),
  area_id: z.number().int().nullable().optional(),
  tareas: z
    .array(
      z.object({
        id: z.number().int().optional(),
        titulo: z.string().min(1),
        sort_order: z.number().int().optional(),
        asignado_a: z.number().int().nullable().optional(),
        obligatoria: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function plantillasController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).

  // -- GET /api/plantillas --
  app.get(
    "/api/plantillas",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request) => {
      const authUser = request.user as { user_id: number; rol: string };
      const { data: plantillas } = await supabase
        .from("plantillas")
        .select("*, areas!plantillas_area_id_fkey(area_id, area_nombre)")
        .order("plantilla_nombre", { ascending: true });

      // Obtener IDs de plantillas favoritas del usuario actual
      const { data: favs } = await (supabase as any)
        .from("plantillas_favoritas")
        .select("plantilla_id")
        .eq("usuario_id", authUser.user_id);

      const favIds = new Set((favs || []).map((f: any) => f.plantilla_id));

      const rows = await Promise.all(
        (plantillas || []).map(async (p: any) => {
        const { count } = await supabase
            .from("plantillatareas")
            .select("*", { count: "exact", head: true })
            .eq("plantilla_id", p.plantilla_id);

          return {
            id: p.plantilla_id,
            nombre: p.plantilla_nombre,
            descripcion: p.plantilla_descripcion,
            area_id: p.area_id,
            area_nombre: p.areas?.area_nombre || null,
            created_at: p.plantilla_fecha_creacion,
            updated_at: null,
            activa: p.plantilla_activa,
            tareas_count: count || 0,
            es_favorito: favIds.has(p.plantilla_id),
          };
        })
      );

      return { data: rows };
    }
  );

  // -- GET /api/plantillas/:id --
  app.get(
    "/api/plantillas/:id",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const plantillaId = parseInt(id);

      const { data: plantillas } = await supabase
        .from("plantillas")
        .select("*, areas!plantillas_area_id_fkey(area_id, area_nombre)")
        .eq("plantilla_id", plantillaId)
        .limit(1);

      const plantilla = plantillas?.[0];
      if (!plantilla) throw new NotFoundError("Plantilla no encontrada");

      const { data: tareasData } = await supabase
        .from("plantillatareas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("plantillatarea_orden", { ascending: true });

      const tareas = (tareasData || []).map((t: any) => ({
        id: t.plantillatarea_id,
        plantilla_id: t.plantilla_id,
        titulo: t.plantillatarea_titulo,
        orden: t.plantillatarea_orden,
        obligatoria: t.plantillatarea_obligatoria,
      }));

      return reply.send({
        data: {
          id: plantilla.plantilla_id,
          nombre: plantilla.plantilla_nombre,
          descripcion: plantilla.plantilla_descripcion,
          area_id: plantilla.area_id,
          area_nombre: plantilla.areas?.area_nombre || null,
          activa: plantilla.plantilla_activa,
          created_at: plantilla.plantilla_fecha_creacion,
          tareas,
        },
      });
    }
  );

  // -- POST /api/plantillas/favoritos/:id --
  app.post(
    "/api/plantillas/favoritos/:id",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const authUser = request.user as { user_id: number };
      const plantillaId = parseInt(id);

      const { data: existing } = await (supabase as any)
        .from("plantillas_favoritas")
        .select("plantillafavorita_id")
        .eq("usuario_id", authUser.user_id)
        .eq("plantilla_id", plantillaId)
        .limit(1);

      if (existing?.length) {
        // Ya es favorito → quitar
        await (supabase as any)
          .from("plantillas_favoritas")
          .delete()
          .eq("usuario_id", authUser.user_id)
          .eq("plantilla_id", plantillaId);
        return reply.send({ data: { es_favorito: false } });
      }

      // No es favorito → agregar
      await (supabase as any)
        .from("plantillas_favoritas")
        .insert({ usuario_id: authUser.user_id, plantilla_id: plantillaId });
      return reply.send({ data: { es_favorito: true } });
    }
  );

  // -- POST /api/plantillas --
  app.post(
    "/api/plantillas",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const input = crearPlantillaSchema.parse(request.body);
      const authUser = request.user as { user_id: number; rol: string };

      // 🔐 Colaborador no puede asignar área ni marcar tareas obligatorias
      const esColaborador = authUser.rol === "colaborador";

      const { data: newPlantillas, error } = await supabase
        .from("plantillas")
        .insert({
          plantilla_nombre: input.nombre,
          plantilla_descripcion: input.descripcion ?? null,
          area_id: esColaborador ? null : (input.area_id ?? null),
          plantilla_activa: true,
          plantilla_fecha_creacion: new Date().toISOString().split("T")[0],
        })
        .select();

      if (error) throw new Error(error.message);
      const plantilla = newPlantillas?.[0];
      if (!plantilla) throw new Error("No se pudo crear la plantilla");

      // Insertar tareas de plantilla si vienen
      if (input.tareas && input.tareas.length > 0) {
        const tareasToInsert = input.tareas.map((t, i) => ({
          plantilla_id: plantilla.plantilla_id,
          plantillatarea_titulo: t.titulo,
          plantillatarea_orden: t.sort_order ?? i,
          plantillatarea_obligatoria: esColaborador ? false : (t.obligatoria ?? false),
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("plantillatareas").insert(tareasToInsert as any);
      }

      await auditLog(null, authUser.user_id, "CREATE", "plantilla", plantilla.plantilla_id, {
        nombre: input.nombre,
        tareas_count: input.tareas?.length ?? 0,
      });

      const { data: tareasData } = await supabase
        .from("plantillatareas")
        .select("*")
        .eq("plantilla_id", plantilla.plantilla_id)
        .order("plantillatarea_orden", { ascending: true });

      const tareas = (tareasData || []).map((t: any) => ({
        id: t.plantillatarea_id,
        plantilla_id: t.plantilla_id,
        titulo: t.plantillatarea_titulo,
        orden: t.plantillatarea_orden,
        obligatoria: t.plantillatarea_obligatoria,
      }));

      return reply.status(201).send({
        data: {
          id: plantilla.plantilla_id,
          nombre: plantilla.plantilla_nombre,
          descripcion: plantilla.plantilla_descripcion,
          area_id: plantilla.area_id,
          activa: plantilla.plantilla_activa,
          created_at: plantilla.plantilla_fecha_creacion,
          tareas,
        },
      });
    }
  );

  // -- PUT /api/plantillas/:id --
  app.put(
    "/api/plantillas/:id",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = actualizarPlantillaSchema.parse(request.body);
      const authUser = request.user as { user_id: number; rol: string };
      const plantillaId = parseInt(id);
      const esColaborador = authUser.rol === "colaborador";

      const { data: existing } = await supabase
        .from("plantillas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Plantilla no encontrada");

      // 🔐 Colaborador no puede cambiar el área de una plantilla
      if (esColaborador && input.area_id !== undefined) {
        throw new ForbiddenError("No puedes cambiar el área de la plantilla");
      }

      const updateData: TablesUpdate<"plantillas"> = {};
      if (input.nombre !== undefined) updateData.plantilla_nombre = input.nombre;
      if (input.descripcion !== undefined) updateData.plantilla_descripcion = input.descripcion;
      if (input.area_id !== undefined && !esColaborador) updateData.area_id = input.area_id;

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("plantillas")
          .update(updateData)
          .eq("plantilla_id", plantillaId);
      }

      // Si se enviaron tareas, reemplazar todas
      if (input.tareas !== undefined) {
        await supabase
          .from("plantillatareas")
          .delete()
          .eq("plantilla_id", plantillaId);

        const tareasToInsert = input.tareas.map((t, i) => ({
          plantilla_id: plantillaId,
          plantillatarea_titulo: t.titulo,
          plantillatarea_orden: t.sort_order ?? i,
          plantillatarea_obligatoria: esColaborador ? false : (t.obligatoria ?? false),
        }));

        if (tareasToInsert.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from("plantillatareas").insert(tareasToInsert as any);
        }
      }

      await auditLog(null, authUser.user_id, "UPDATE", "plantilla", plantillaId, {
        campos: Object.keys(input),
      });

      const { data: updatedPlantillas } = await supabase
        .from("plantillas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .limit(1);

      const { data: tareasData } = await supabase
        .from("plantillatareas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("plantillatarea_orden", { ascending: true });

      const updated = updatedPlantillas?.[0];
      const tareas = (tareasData || []).map((t: any) => ({
        id: t.plantillatarea_id,
        plantilla_id: t.plantilla_id,
        titulo: t.plantillatarea_titulo,
        orden: t.plantillatarea_orden,
        obligatoria: t.plantillatarea_obligatoria,
      }));

      return reply.send({
        data: updated
          ? {
              id: updated.plantilla_id,
              nombre: updated.plantilla_nombre,
              descripcion: updated.plantilla_descripcion,
              area_id: updated.area_id,
              activa: updated.plantilla_activa,
              tareas,
            }
          : null,
      });
    }
  );

  // -- DELETE /api/plantillas/:id --
  app.delete(
    "/api/plantillas/:id",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const authUser = request.user as { user_id: number };
      const plantillaId = parseInt(id);

      const { data: existing } = await supabase
        .from("plantillas")
        .select("plantilla_id, plantilla_nombre")
        .eq("plantilla_id", plantillaId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Plantilla no encontrada");
      const plantilla = existing[0];

      // Eliminar (cascade no garantizado, eliminar tareas primero)
      await supabase.from("plantillatareas").delete().eq("plantilla_id", plantillaId);
      await supabase.from("plantillas").delete().eq("plantilla_id", plantillaId);

      await auditLog(null, authUser.user_id, "DELETE", "plantilla", plantillaId, {
        nombre: plantilla.plantilla_nombre,
      });

      return reply.status(204).send();
    }
  );

  // -- POST /api/plantillas/:id/aplicar/:servicioId --
  app.post(
    "/api/plantillas/:id/aplicar/:servicioId",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request, reply) => {
      const { id, servicioId } = request.params as {
        id: string;
        servicioId: string;
      };
      const authUser = request.user as { user_id: number };
      const plantillaId = parseInt(id);
      const sId = parseInt(servicioId);

      const { data: plantillas } = await supabase
        .from("plantillas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .limit(1);

      if (!plantillas?.length) throw new NotFoundError("Plantilla no encontrada");

      const { data: servicios } = await supabase
        .from("servicios")
        .select("servicio_id, servicio_codigo")
        .eq("servicio_id", sId)
        .limit(1);

      if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");
      const servicio = servicios[0];

      const { data: plantillaTareas } = await supabase
        .from("plantillatareas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("plantillatarea_orden", { ascending: true });

      if (!plantillaTareas?.length) {
        return reply.status(200).send({
          data: {
            aplicadas: 0,
            mensaje: "La plantilla no contiene tareas",
          },
        });
      }

      // Obtener el orden máximo actual de las tareas del servicio
      const { data: maxTareas } = await supabase
        .from("tareas")
        .select("tarea_orden")
        .eq("servicio_id", sId)
        .order("tarea_orden", { ascending: true })
        .limit(1);

      const ordenOffset = (maxTareas?.[0]?.tarea_orden ?? -1) + 1;

      const nuevasTareas = plantillaTareas.map((pt: any, i: number) => ({
        servicio_id: sId,
        tarea_titulo: pt.plantillatarea_titulo,
        tarea_orden: ordenOffset + i,
      }));

      const { data: inserted } = await supabase
        .from("tareas")
        .insert(nuevasTareas)
        .select();

      await auditLog(null, authUser.user_id, "CREATE", "plantilla-aplicar", plantillaId, {
        servicio_id: sId,
        servicio_codigo: servicio.servicio_codigo,
        tareas_creadas: inserted?.length ?? 0,
      });

      const mappedTareas = (inserted || []).map((t: any) => ({
        id: t.tarea_id,
        servicio_id: t.servicio_id,
        titulo: t.tarea_titulo,
        orden: t.tarea_orden,
      }));

      return reply.status(201).send({
        data: {
          success: true,
          tareas: mappedTareas,
          count: mappedTareas.length,
        },
      });
    }
  );
}

