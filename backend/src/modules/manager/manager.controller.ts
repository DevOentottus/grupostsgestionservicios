import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ForbiddenError } from "@/core/errors/index.js";
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
      const query = request.query as { area_id?: string; fecha_inicio?: string; fecha_fin?: string };

      let areaId: number | null = null;
      if ((user.rol === "admin" || user.rol === "sistema") && query.area_id) {
        areaId = parseInt(query.area_id);
      } else if (user.area_id) {
        areaId = user.area_id;
      }

      if (!areaId) {
        return { data: { area: null, servicios: [], estado_counts: { total: 0, pendiente: 0, en_progreso: 0, completado: 0, bloqueado: 0, cancelado: 0 }, colaboradores: [], satisfaccion: { promedio: 0, cantidad: 0, promotores: 0, pasivos: 0, detractores: 0, nps: 0, servicios_evaluados: 0, servicios_evaluados_pct: 0, calificaciones_positivas_pct: 0, calificaciones_negativas_pct: 0 } } };
      }

      const { data: areas } = await supabase
        .from("areas")
        .select("*")
        .eq("area_id", areaId)
        .limit(1);

      if (!areas?.length) {
        return { data: { area: null, servicios: [], estado_counts: { total: 0, pendiente: 0, en_progreso: 0, completado: 0, bloqueado: 0, cancelado: 0 }, colaboradores: [], satisfaccion: { promedio: 0, cantidad: 0, promotores: 0, pasivos: 0, detractores: 0, nps: 0, servicios_evaluados: 0, servicios_evaluados_pct: 0, calificaciones_positivas_pct: 0, calificaciones_negativas_pct: 0 } } };
      }
      const area = areas[0];

      // Servicios del área con información enriquecida
      let svcQuery = supabase
        .from("servicios")
        .select("*")
        .eq("area_id", areaId);

      if (query.fecha_inicio) {
        svcQuery = svcQuery.gte("servicio_fecha_creacion", query.fecha_inicio);
      }
      if (query.fecha_fin) {
        svcQuery = svcQuery.lte("servicio_fecha_creacion", query.fecha_fin);
      }

      const { data: serviciosData } = await svcQuery.order("servicio_id", { ascending: false });

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

          // Progreso de tareas + tiempo real
          const { data: tareasSvc } = await supabase
            .from("tareas")
            .select("tarea_id, tarea_estado, tarea_tiempo_real")
            .eq("servicio_id", s.servicio_id);

          const totalTareas = tareasSvc?.length || 0;
          const compTareas = tareasSvc?.filter((t: any) => t.tarea_estado === "completado").length || 0;
          const tiempoTotal = (tareasSvc || [])
            .filter((t: any) => t.tarea_estado === "completado" && t.tarea_tiempo_real != null)
            .reduce((sum: number, t: any) => sum + t.tarea_tiempo_real, 0);

          return {
            id: s.servicio_id,
            codigo: s.servicio_codigo,
            titulo: s.servicio_nombre,
            descripcion: s.servicio_descripcion,
            estado: s.servicio_estado,
            created_at: s.servicio_fecha_creacion,
            fecha_fin: s.servicio_fecha_fin,
            cliente_nombre: null,
            prioridad: s.servicio_prioridad || "media",
            tecnico,
            progreso: totalTareas > 0 ? Math.round((compTareas / totalTareas) * 100) : 0,
            total_tareas: totalTareas,
            tareas_completadas: compTareas,
            tiempo_total_minutos: tiempoTotal,
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
            usuario_apellido_paterno,
            usuario_apellido_materno,
            usuario_correo,
            usuario_username,
            usuario_rol,
            usuario_activo
          )
        `)
        .eq("area_id", areaId);

      const colaboradores = await Promise.all(
        (cols || []).map(async (a: any) => {
          const u = a.usuarios || {};
          const colId = u.usuario_id || a.colaborador_id;

          // Servicios donde es técnico principal
          let svcPrincipalQuery = supabase
            .from("servicios")
            .select(`
              servicio_id,
              servicio_codigo,
              servicio_nombre,
              servicio_estado
            `)
            .eq("tecnico_principal_id", colId)
            .eq("area_id", areaId);
          if (query.fecha_inicio) svcPrincipalQuery = svcPrincipalQuery.gte("servicio_fecha_creacion", query.fecha_inicio);
          if (query.fecha_fin) svcPrincipalQuery = svcPrincipalQuery.lte("servicio_fecha_creacion", query.fecha_fin);
          const { data: servComoPrincipal } = await svcPrincipalQuery;

          // Tareas completadas por este colaborador
          const { data: tareasComp } = await supabase
            .from("tareas")
            .select("tarea_id, servicio_id")
            .eq("tarea_completado_por", colId)
            .eq("tarea_estado", "completado");

          // Servicios donde completó tareas (aunque no sea técnico principal)
          const svcIdsDeTareas = [...new Set((tareasComp || [])
            .map((t: any) => t.servicio_id)
            .filter(Boolean))] as number[];

          // Servicios donde es técnico principal (ya filtrados por fecha)
          const principalIds = (servComoPrincipal || []).map((s: any) => s.servicio_id);

          // Obtener datos completos de los servicios donde participó
          let servFinalList: any[] = servComoPrincipal || [];
          if (svcIdsDeTareas.length > 0) {
            const idsFaltantes = svcIdsDeTareas.filter((id) => !principalIds.includes(id));
            if (idsFaltantes.length > 0) {
              let servExtraQuery = supabase
                .from("servicios")
                .select(`
                  servicio_id,
                  servicio_codigo,
                  servicio_nombre,
                  servicio_estado
                `)
                .in("servicio_id", idsFaltantes)
                .eq("area_id", areaId);
              if (query.fecha_inicio) servExtraQuery = servExtraQuery.gte("servicio_fecha_creacion", query.fecha_inicio);
              if (query.fecha_fin) servExtraQuery = servExtraQuery.lte("servicio_fecha_creacion", query.fecha_fin);
              const { data: servExtra } = await servExtraQuery;
              if (servExtra?.length) {
                servFinalList = [...servFinalList, ...servExtra];
              }
            }
          }

          // Reconstruir IDs SOLO de los servicios que pasaron el filtro de fecha
          const todosSvcIds = [...new Set(servFinalList.map((s: any) => s.servicio_id))];

          const serviciosCompletados = servFinalList.filter(
            (s: any) => s.servicio_estado === "completado"
          ).length;

          // Tareas pendientes en servicios donde participó
          let tareasPend = 0;
          if (todosSvcIds.length > 0) {
            const { data: pendientes } = await supabase
              .from("tareas")
              .select("tarea_id")
              .in("servicio_id", todosSvcIds)
              .eq("tarea_estado", "pendiente");
            tareasPend = pendientes?.length || 0;
          }

          // Calificación promedio en servicios donde participó
          let calificacionPromedio: number | null = null;
          let totalCalificaciones = 0;
          if (todosSvcIds.length > 0) {
            const { data: califsRaw } = await supabase
              .from("calificaciones")
              .select("calificacion_puntaje")
              .in("servicio_id", todosSvcIds);
            totalCalificaciones = califsRaw?.length ?? 0;
            if (califsRaw && califsRaw.length > 0) {
              const suma = califsRaw.reduce((acc: number, c: any) => acc + c.calificacion_puntaje, 0);
              calificacionPromedio = Math.round((suma / califsRaw.length) * 10) / 10;
            }
          }

          return {
            usuario_id: colId,
            id: colId,
            nombres: u.usuario_nombres || null,
            apellidos: [u.usuario_apellido_paterno, u.usuario_apellido_materno].filter(Boolean).join(" ") || null,
            email: u.usuario_correo || null,
            username: u.usuario_username || null,
            rol: u.usuario_rol?.toLowerCase() || null,
            activo: u.usuario_activo ?? true,
            tareas_activas: tareasPend,
            tareas_completadas: tareasComp?.length || 0,
            servicios_completados: serviciosCompletados,
            calificacion_promedio: calificacionPromedio,
            total_calificaciones: totalCalificaciones,
            servicios_asignados: servFinalList.map((s: any) => ({
              id: s.servicio_id,
              codigo: s.servicio_codigo || null,
              titulo: s.servicio_nombre || null,
              estado: s.servicio_estado || null,
            })),
          };
        })
      );

      // Calificación promedio del área — solo servicios de colaboradores actuales
      const colaboradorSvcIds = [...new Set(
        (colaboradores || []).flatMap((c: any) =>
          (c.servicios_asignados || []).map((s: any) => s.id)
        )
      )];
      const servicioIds = colaboradorSvcIds.length > 0 ? colaboradorSvcIds : (serviciosData || []).map((s: any) => s.servicio_id);
      let areaSatisfaccion = { 
        promedio: 0, cantidad: 0, promotores: 0, pasivos: 0, detractores: 0, nps: 0,
        servicios_evaluados: 0, servicios_evaluados_pct: 0,
        calificaciones_positivas_pct: 0, calificaciones_negativas_pct: 0,
      };
      if (servicioIds.length > 0) {
        const { data: califs } = await supabase
          .from("calificaciones")
          .select("calificacion_puntaje, nps_score")
          .in("servicio_id", servicioIds);
        const totalServicios = servicioIds.length;
        const totalEval = califs?.length || 0;
        const toNpsCat = (c: { nps_score: number | null; calificacion_puntaje: number }) => {
          if (c.nps_score != null) return c.nps_score >= 9 ? "promoter" : c.nps_score >= 7 ? "passive" : "detractor";
          return c.calificacion_puntaje >= 4 ? "promoter" : c.calificacion_puntaje === 3 ? "passive" : "detractor";
        };
        areaSatisfaccion.servicios_evaluados = totalEval;
        areaSatisfaccion.servicios_evaluados_pct = Math.round((totalEval / totalServicios) * 100);
        if (califs && califs.length > 0) {
          const total = califs.length;
          const suma = califs.reduce((acc: number, c: any) => acc + c.calificacion_puntaje, 0);
          const promotores = califs.filter((c: any) => toNpsCat(c) === "promoter").length;
          const pasivos = califs.filter((c: any) => toNpsCat(c) === "passive").length;
          const detractores = califs.filter((c: any) => toNpsCat(c) === "detractor").length;
          const positivas = califs.filter((c: any) => c.calificacion_puntaje >= 3).length;
          const negativas = califs.filter((c: any) => c.calificacion_puntaje < 3).length;
          areaSatisfaccion = {
            promedio: Math.round((suma / total) * 10) / 10,
            cantidad: total,
            promotores,
            pasivos,
            detractores,
            nps: Math.round(((promotores - detractores) / total) * 100),
            servicios_evaluados: totalEval,
            servicios_evaluados_pct: Math.round((totalEval / totalServicios) * 100),
            calificaciones_positivas_pct: Math.round((positivas / total) * 100),
            calificaciones_negativas_pct: Math.round((negativas / total) * 100),
          };
        }
      }

      // Obtener nombre del encargado
      let encargadoNombre: string | null = null;
      if (area.area_encargado_id) {
        const { data: enc } = await supabase
          .from("usuarios")
          .select("usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno")
          .eq("usuario_id", area.area_encargado_id)
          .limit(1);
        if (enc?.length) {
          const e = enc[0];
          encargadoNombre = [e.usuario_nombres, e.usuario_apellido_paterno, e.usuario_apellido_materno]
            .filter(Boolean).join(" ");
        }
      }

      return {
        data: {
          area: {
            id: area.area_id,
            nombre: area.area_nombre,
            encargado_id: area.area_encargado_id,
            encargado_nombre: encargadoNombre,
          },
          satisfaccion: areaSatisfaccion,
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

      // -- Tiempo tracking para tareas completadas en el período --
      const tareaIds = tareasCompletadas.map((t: any) => t.id);
      let tiempoPromedio = 0;
      let tiempoTotal = 0;
      let eficiencia = 0;

      if (tareaIds.length > 0) {
        const { data: trackingData } = await supabase
          .from("tiempo_tracking")
          .select("tarea_id, tracking_inicio, tracking_fin")
          .in("tarea_id", tareaIds);

        let sumaMinutos = 0;
        let tareasConTiempo = 0;
        const tareaTiempoReal: Record<number, number> = {};

        for (const tr of trackingData || []) {
          if (tr.tracking_inicio && tr.tracking_fin) {
            const diff = Math.floor(
              (new Date(tr.tracking_fin).getTime() - new Date(tr.tracking_inicio).getTime()) / 60000
            );
            if (diff > 0) {
              sumaMinutos += diff;
              tareasConTiempo++;
              tareaTiempoReal[tr.tarea_id] = diff;
            }
          }
        }

        tiempoPromedio = tareasConTiempo > 0 ? Math.round(sumaMinutos / tareasConTiempo) : 0;
        tiempoTotal = sumaMinutos;

        // -- Eficiencia: % de tareas dentro del tiempo estimado del servicio --
        if (tareaIds.length > 0) {
          const { data: tareasConServicio } = await supabase
            .from("tareas")
            .select("tarea_id, servicio_id")
            .in("tarea_id", tareaIds);

          const svcIds = [...new Set((tareasConServicio || []).map((t: any) => t.servicio_id))];

          if (svcIds.length > 0) {
            const { data: serviciosData } = await supabase
              .from("servicios")
              .select("servicio_id, servicio_tiempo_estimado")
              .in("servicio_id", svcIds);

            const svcEstimado: Record<number, number> = {};
            for (const s of serviciosData || []) {
              if (s.servicio_tiempo_estimado) {
                svcEstimado[s.servicio_id] = s.servicio_tiempo_estimado;
              }
            }

            const tareaSvc: Record<number, number> = {};
            for (const t of tareasConServicio || []) {
              tareaSvc[t.tarea_id] = t.servicio_id;
            }

            let dentro = 0;
            let totalComparables = 0;
            for (const [tareaId, realMin] of Object.entries(tareaTiempoReal)) {
              const svcId = tareaSvc[Number(tareaId)];
              const estimado = svcId ? svcEstimado[svcId] : 0;
              if (estimado > 0) {
                totalComparables++;
                if (realMin <= estimado) dentro++;
              }
            }
            eficiencia = totalComparables > 0 ? Math.round((dentro / totalComparables) * 100) : 0;
          }
        }
      }

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
          tiempo_promedio_por_tarea: tiempoPromedio,
          tiempo_total_minutos: tiempoTotal,
          eficiencia: eficiencia,
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
        const cid = s.cliente_id;
        if (cid === null) continue;
        if (!serviceMap[cid]) {
          serviceMap[cid] = { total: 0, ultimo: null };
        }
        serviceMap[cid].total++;
        const fecha = s.servicio_fecha_creacion;
        if (!serviceMap[cid].ultimo || fecha > serviceMap[cid].ultimo!.fecha) {
          serviceMap[cid].ultimo = { codigo: s.servicio_codigo, fecha };
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

