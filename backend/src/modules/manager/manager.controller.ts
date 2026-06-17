import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

export async function managerController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).

  // -- GET /api/manager/mi-area --
  app.get(
    "/api/manager/mi-area",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
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

      // Servicios del área con información enriquecida
      const { data: serviciosData } = await supabase
        .from("servicios")
        .select("*")
        .eq("area_id", areaId)
        .order("servicio_id", { ascending: false });

      // Cache nombres de colaboradores
      const colIds = (serviciosData || []).map((s: any) => s.tecnico_principal_id).filter(Boolean);
      const { data: colsCache } = colIds.length > 0
        ? await supabase.from("usuarios").select("usuario_id, usuario_nombres").in("usuario_id", colIds)
        : { data: [] };
      const nombresMap = new Map((colsCache || []).map((u: any) => [u.usuario_id, u.usuario_nombres]));

      const servicios = await Promise.all(
        (serviciosData || []).map(async (s: any) => {
          const tecnico = s.tecnico_principal_id
            ? { id: s.tecnico_principal_id, nombres: nombresMap.get(s.tecnico_principal_id) || null }
            : null;

          // Progreso de tareas
          const { data: tareasSvc } = await supabase
            .from("tareas")
            .select("tarea_id, tarea_estado")
            .eq("servicio_id", s.servicio_id);

          const totalTareas = tareasSvc?.length || 0;
          const compTareas = tareasSvc?.filter((t: any) => t.tarea_estado === "completado").length || 0;

          return {
            id: s.servicio_id,
            codigo: s.servicio_codigo,
            titulo: s.servicio_nombre,
            descripcion: s.servicio_descripcion,
            estado: s.servicio_estado,
            created_at: s.servicio_fecha_creacion,
            cliente_nombre: null,
            prioridad: s.servicio_prioridad || "media",
            tecnico,
            progreso: totalTareas > 0 ? Math.round((compTareas / totalTareas) * 100) : 0,
            total_tareas: totalTareas,
            tareas_completadas: compTareas,
          };
        })
      );

      const estadoCounts = {
        total: servicios.length,
        pendiente: servicios.filter((s) => s.estado === "pendiente").length,
        en_progreso: servicios.filter((s) => s.estado === "en_progreso").length,
        completado: servicios.filter((s) => s.estado === "completado").length,
        bloqueado: servicios.filter((s) => s.estado === "bloqueado").length,
        cancelado: servicios.filter((s) => s.estado === "cancelado").length,
      };

      // Colaboradores del área con datos enriquecidos
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

      const colaboradores = await Promise.all(
        (cols || []).map(async (a: any) => {
          const u = a.usuarios || {};
          const colId = u.usuario_id || a.colaborador_id;

          // Servicios asignados a este colaborador dentro del área
          const { data: servAsignados } = await supabase
            .from("servicios")
            .select(`
              servicio_id,
              servicio_codigo,
              servicio_nombre,
              servicio_estado
            `)
            .eq("tecnico_principal_id", colId)
            .eq("area_id", areaId);

          // Tareas completadas por este colaborador
          const { data: tareasComp } = await supabase
            .from("tareas")
            .select("tarea_id")
            .eq("tarea_completado_por", colId)
            .eq("tarea_estado", "completado");

          // Tareas pendientes en los servicios asignados
          const serviciosIds = (servAsignados || []).map((sa: any) => sa.servicio_id).filter(Boolean);
          let tareasPend = 0;
          if (serviciosIds.length > 0) {
            const { data: pendientes } = await supabase
              .from("tareas")
              .select("tarea_id")
              .in("servicio_id", serviciosIds)
              .eq("tarea_estado", "pendiente");
            tareasPend = pendientes?.length || 0;
          }

          const serviciosCompletados = (servAsignados || []).filter(
            (sa: any) => sa.servicio_estado === "completado"
          ).length;

          // Calificación promedio en los servicios asignados
          let calificacionPromedio: number | null = null;
          if (serviciosIds.length > 0) {
            const { data: califs } = await supabase
              .from("calificaciones")
              .select("calificacion_puntaje")
              .in("servicio_id", serviciosIds);
            if (califs && califs.length > 0) {
              const suma = califs.reduce((acc: number, c: any) => acc + c.calificacion_puntaje, 0);
              calificacionPromedio = Math.round((suma / califs.length) * 10) / 10;
            }
          }

          return {
            usuario_id: colId,
            id: colId,
            nombres: u.usuario_nombres || null,
            email: u.usuario_correo || null,
            username: u.usuario_username || null,
            rol: u.usuario_rol?.toLowerCase() || null,
            tareas_activas: tareasPend,
            tareas_completadas: tareasComp?.length || 0,
            servicios_completados: serviciosCompletados,
            calificacion_promedio: calificacionPromedio,
            servicios_asignados: (servAsignados || []).map((sa: any) => ({
              id: sa.servicio_id,
              codigo: sa.servicio_codigo || null,
              titulo: sa.servicio_nombre || null,
              estado: sa.servicio_estado || null,
            })),
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

  // -- GET /api/manager/distribucion --
  app.get(
    "/api/manager/distribucion",
    { preHandler: [requireRoles("admin", "encargado")] },
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

  // -- GET /api/manager/desempeno/:usuario_id --
  app.get(
    "/api/manager/desempeno/:usuario_id",
    { preHandler: [requireRoles("admin", "encargado", "sistema")] },
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

  // -- GET /api/manager/clientes --
  app.get(
    "/api/manager/clientes",
    { preHandler: [requireRoles("admin", "sistema")] },
    async () => {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("*")
        .order("cliente_nombres", { ascending: true });

      if (!clientes?.length) return { data: [] };

      // Servicio counts per client
      const { data: servicios } = await supabase
        .from("servicios")
        .select("cliente_id, servicio_id, servicio_codigo, servicio_fecha_creacion")
        .in("cliente_id", clientes.map((c) => c.cliente_id));

      const serviceMap: Record<number, { total: number; ultimo: { codigo: string; fecha: string } | null }> = {};
      for (const s of servicios || []) {
        if (!serviceMap[s.cliente_id]) {
          serviceMap[s.cliente_id] = { total: 0, ultimo: null };
        }
        serviceMap[s.cliente_id].total++;
        const fecha = s.servicio_fecha_creacion;
        if (!serviceMap[s.cliente_id].ultimo || fecha > serviceMap[s.cliente_id].ultimo!.fecha) {
          serviceMap[s.cliente_id].ultimo = { codigo: s.servicio_codigo, fecha };
        }
      }

      const data = clientes.map((c) => ({
        ...c,
        total_servicios: serviceMap[c.cliente_id]?.total || 0,
        ultimo_servicio: serviceMap[c.cliente_id]?.ultimo || null,
      }));

      return { data };
    }
  );
}

