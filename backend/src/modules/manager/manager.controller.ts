import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { authenticate, authorize, authorizeByArea } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

export async function managerController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── GET /api/manager/mi-area ──
  app.get(
    "/api/manager/mi-area",
    { preHandler: [authorize("admin", "encargado")] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const query = request.query as { area_id?: string };

      let areaId: number;
      if (user.rol === "admin" && query.area_id) {
        areaId = parseInt(query.area_id);
      } else if (user.area_id) {
        areaId = user.area_id;
      } else {
        throw new ValidationError("No tienes un área asignada");
      }

      const { data: areas } = await supabase
        .from("areas")
        .select("*")
        .eq("area_id", areaId)
        .limit(1);

      if (!areas?.length) throw new NotFoundError("Área no encontrada");
      const area = areas[0];

      // Servicios del área
      const { data: serviciosData } = await supabase
        .from("servicios")
        .select("*")
        .eq("area_id", areaId)
        .order("servicio_id", { ascending: false });

      const servicios = (serviciosData || []).map((s: any) => ({
        id: s.servicio_id,
        codigo: s.servicio_codigo,
        titulo: s.servicio_nombre,
        estado: s.servicio_estado,
      }));

      const estadoCounts = {
        total: servicios.length,
        pendiente: servicios.filter((s) => s.estado === "pendiente").length,
        en_progreso: servicios.filter((s) => s.estado === "en_progreso").length,
        completado: servicios.filter((s) => s.estado === "completado").length,
        bloqueado: servicios.filter((s) => s.estado === "bloqueado").length,
        cancelado: servicios.filter((s) => s.estado === "cancelado").length,
      };

      // Colaboradores del área
      const { data: cols } = await supabase
        .from("areacolaboradores")
        .select(`
          colaborador_id,
          usuarios!areacolaboradores_colaborador_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username,
            usuario_rol
          )
        `)
        .eq("area_id", areaId);

      // Tareas activas por colaborador
      const colaboradores = await Promise.all(
        (cols || []).map(async (a: any) => {
          const u = a.usuarios || {};
          const colId = u.usuario_id || a.colaborador_id;

          // En Supabase, tareas no tiene asignado_a, usamos tareas completadas como proxy
          const { data: tareas } = await supabase
            .from("tareas")
            .select("tarea_id")
            .eq("tarea_completado_por", colId)
            .eq("tarea_estado", "pendiente");

          return {
            usuario_id: colId,
            id: colId,
            nombres: u.usuario_nombres || null,
            email: u.usuario_correo || null,
            username: u.usuario_username || null,
            rol: u.usuario_rol?.toLowerCase() || null,
            tareas_activas: tareas?.length || 0,
          };
        })
      );

      return {
        data: {
          area: {
            id: area.area_id,
            nombre: area.area_nombre,
            encargado_id: area.area_encargado_id,
          },
          servicios,
          estado_counts: estadoCounts,
          colaboradores,
        },
      };
    }
  );

  // ── GET /api/manager/distribucion ──
  app.get(
    "/api/manager/distribucion",
    { preHandler: [authorize("admin", "encargado")] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const query = request.query as {
        area_id?: string;
        colaborador_id?: string;
      };

      let areaId: number;
      if (user.rol === "admin" && query.area_id) {
        areaId = parseInt(query.area_id);
      } else if (user.area_id) {
        areaId = user.area_id;
      } else {
        throw new ValidationError("No tienes un área asignada");
      }

      const { data: areas } = await supabase
        .from("areas")
        .select("area_id")
        .eq("area_id", areaId)
        .limit(1);

      if (!areas?.length) throw new NotFoundError("Área no encontrada");

      // Obtener tareas pendientes de servicios del área
      const { data: servicios } = await supabase
        .from("servicios")
        .select("servicio_id, servicio_codigo, servicio_nombre")
        .eq("area_id", areaId);

      if (!servicios?.length) return { data: [] };

      const servicioIds = servicios.map((s: any) => s.servicio_id);

      let tareasQuery = supabase
        .from("tareas")
        .select(`
          tarea_id,
          tarea_titulo,
          tarea_orden,
          tarea_fecha_creacion,
          tarea_completado_por,
          tarea_estado,
          servicio_id,
          servicios!tareas_servicio_id_fkey (
            servicio_id,
            servicio_codigo,
            servicio_nombre
          ),
          usuarios!tareas_tarea_completado_por_fkey (
            usuario_id,
            usuario_nombres
          )
        `)
        .in("servicio_id", servicioIds)
        .neq("tarea_estado", "completado");

      if (query.colaborador_id) {
        tareasQuery = tareasQuery.eq("tarea_completado_por", parseInt(query.colaborador_id));
      }

      const { data: rows } = await tareasQuery.order("tarea_orden", { ascending: true });

      const result = (rows || []).map((r: any) => {
        const s = r.servicios || {};
        const u = r.usuarios || {};
        return {
          id: r.tarea_id,
          titulo: r.tarea_titulo,
          servicio_id: r.servicio_id,
          servicio_titulo: s.servicio_nombre || null,
          servicio_codigo: s.servicio_codigo || null,
          asignado_a: r.tarea_completado_por,
          asignado_nombre: u.usuario_nombres || null,
          tiempo_estimado: null, // no disponible en Supabase
          orden: r.tarea_orden,
          created_at: r.tarea_fecha_creacion,
        };
      });

      return { data: result };
    }
  );

  // ── GET /api/manager/desempeno/:usuario_id ──
  app.get(
    "/api/manager/desempeno/:usuario_id",
    { preHandler: [authorize("admin", "encargado")] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const { usuario_id } = request.params as { usuario_id: string };
      const query = request.query as {
        fecha_inicio?: string;
        fecha_fin?: string;
      };
      const colaboradorId = parseInt(usuario_id);

      // Verificar que el usuario sea colaborador del área
      if (user.rol === "encargado" && user.area_id) {
        const { data: assignments } = await supabase
          .from("areacolaboradores")
          .select("areacolaborador_id")
          .eq("area_id", user.area_id)
          .eq("colaborador_id", colaboradorId)
          .limit(1);

        if (!assignments?.length) {
          throw new ForbiddenError("El colaborador no pertenece a tu área");
        }
      }

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_nombres, usuario_correo, usuario_username, usuario_rol")
        .eq("usuario_id", colaboradorId)
        .limit(1);

      if (!usuarios?.length) throw new NotFoundError("Usuario no encontrado");
      const colaborador = usuarios[0];

      const fechaInicio = query.fecha_inicio
        ? new Date(query.fecha_inicio)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const fechaFin = query.fecha_fin ? new Date(query.fecha_fin) : new Date();

      // Tareas completadas en el período
      const { data: tareasData } = await supabase
        .from("tareas")
        .select(`
          tarea_id,
          tarea_titulo,
          servicio_id,
          tarea_fecha_completado,
          servicios!tareas_servicio_id_fkey (
            servicio_id,
            servicio_codigo,
            servicio_nombre
          )
        `)
        .eq("tarea_completado_por", colaboradorId)
        .eq("tarea_estado", "completado")
        .gte("tarea_fecha_completado", fechaInicio.toISOString().split("T")[0])
        .lte("tarea_fecha_completado", fechaFin.toISOString().split("T")[0])
        .order("tarea_fecha_completado", { ascending: false });

      const tareasCompletadas = (tareasData || []).map((t: any) => {
        const s = t.servicios || {};
        return {
          id: t.tarea_id,
          titulo: t.tarea_titulo,
          servicio_id: t.servicio_id,
          servicio_titulo: s.servicio_nombre || null,
          servicio_codigo: s.servicio_codigo || null,
          completada_at: t.tarea_fecha_completado,
        };
      });

      // Servicios completados por el colaborador
      const { data: serviciosCompletados } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("servicio_estado", "completado");

      // En Supabase no hay relación directa servicio → colaborador que completó
      // (excepto a través de tareas). Contamos servicios donde el colaborador
      // completó tareas
      const serviciosIds = new Set(tareasCompletadas.map((t: any) => t.servicio_id));

      return {
        data: {
          colaborador: {
            id: colaborador.usuario_id,
            nombres: colaborador.usuario_nombres,
            email: colaborador.usuario_correo,
            username: colaborador.usuario_username,
            rol: colaborador.usuario_rol?.toLowerCase(),
          },
          periodo: {
            desde: fechaInicio.toISOString(),
            hasta: fechaFin.toISOString(),
          },
          tareas_completadas: tareasCompletadas,
          total_tareas: tareasCompletadas.length,
          tiempo_promedio_por_tarea: 0, // tiempo_tracking no disponible
          tiempo_total_minutos: 0,
          eficiencia: 0,
          servicios_completados: serviciosIds.size,
        },
      };
    }
  );
}
