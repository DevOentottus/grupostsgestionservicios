import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError } from "@/core/errors/index.js";
import { authenticate } from "@/core/middleware/auth.js";

export async function displayController(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // TV DISPLAY — Público (sin auth)
  // GET /api/public/display/tv
  // ─────────────────────────────────────────────
  app.get("/api/public/display/tv", async (_request) => {
    const { data: servicios } = await supabase
      .from("servicios")
      .select("*")
      .eq("servicio_estado", "en_progreso")
      .order("servicio_id", { ascending: true });

    // Enriquecer con progreso y técnicos asignados
    const result = await Promise.all(
      (servicios || []).map(async (svc: any) => {
        // Contar tareas completadas
        const { data: tareasData } = await supabase
          .from("tareas")
          .select("tarea_estado")
          .eq("servicio_id", svc.servicio_id);

        const total = tareasData?.length || 0;
        const completadas = tareasData?.filter((t: any) => t.tarea_estado === "completado").length || 0;
        const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

        // Obtener técnicos asignados
        const { data: cols } = await supabase
          .from("serviciocolaboradores")
          .select(`
            colaborador_id,
            usuarios!serviciocolaboradores_colaborador_id_fkey (
              usuario_id,
              usuario_nombres
            )
          `)
          .eq("servicio_id", svc.servicio_id);

        const tecnicos = (cols || []).map((c: any) => {
          const u = c.usuarios || {};
          return {
            id: u.usuario_id || c.colaborador_id,
            nombres: u.usuario_nombres || null,
          };
        });

        let tiempoTranscurrido = 0;
        if (svc.servicio_fecha_inicio) {
          tiempoTranscurrido = Math.floor(
            (Date.now() - new Date(svc.servicio_fecha_inicio).getTime()) / 60000
          );
        }

        return {
          id: svc.servicio_id,
          codigo: svc.servicio_codigo,
          titulo: svc.servicio_nombre,
          descripcion: svc.servicio_descripcion,
          estado: svc.servicio_estado,
          prioridad: "media",
          cliente_nombre: null,
          area_id: svc.area_id,
          fecha_inicio: svc.servicio_fecha_inicio,
          tiempo_estimado: svc.servicio_tiempo_estimado,
          created_at: svc.servicio_fecha_creacion,
          progreso,
          tareas_total: total,
          tareas_completadas: completadas,
          tiempo_transcurrido_min: tiempoTranscurrido,
          tecnicos,
        };
      })
    );

    return { data: result };
  });

  // ─────────────────────────────────────────────
  // WORK ROOM DISPLAY — Autenticado
  // GET /api/display/trabajo
  // ─────────────────────────────────────────────
  app.get(
    "/api/display/trabajo",
    { preHandler: [authenticate] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };

      let query = supabase
        .from("servicios")
        .select("*")
        .in("servicio_estado", ["en_progreso", "bloqueado"]);

      if (user.rol !== "admin" && user.area_id) {
        query = query.eq("area_id", user.area_id);
      }

      const { data: servicios } = await query
        .order("servicio_estado", { ascending: false })
        .order("servicio_id", { ascending: false });

      const result = await Promise.all(
        (servicios || []).map(async (svc: any) => {
          const { data: tareasData } = await supabase
            .from("tareas")
            .select("tarea_estado")
            .eq("servicio_id", svc.servicio_id);

          const total = tareasData?.length || 0;
          const completadas = tareasData?.filter((t: any) => t.tarea_estado === "completado").length || 0;
          const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

          const { data: cols } = await supabase
            .from("serviciocolaboradores")
            .select(`
              colaborador_id,
              usuarios!serviciocolaboradores_colaborador_id_fkey (
                usuario_id,
                usuario_nombres,
                usuario_username
              )
            `)
            .eq("servicio_id", svc.servicio_id);

          const tecnicos = (cols || []).map((c: any) => {
            const u = c.usuarios || {};
            return {
              id: u.usuario_id || c.colaborador_id,
              nombres: u.usuario_nombres || null,
              username: u.usuario_username || null,
            };
          });

          let demorado = false;
          if (svc.servicio_fecha_inicio && svc.servicio_tiempo_estimado) {
            const transcurrido = (Date.now() - new Date(svc.servicio_fecha_inicio).getTime()) / 60000;
            demorado = transcurrido > svc.servicio_tiempo_estimado;
          }

          return {
            id: svc.servicio_id,
            codigo: svc.servicio_codigo,
            titulo: svc.servicio_nombre,
            descripcion: svc.servicio_descripcion,
            estado: svc.servicio_estado,
            prioridad: "media",
            cliente_nombre: null,
            area_id: svc.area_id,
            bloqueado_motivo: null,
            fecha_inicio: svc.servicio_fecha_inicio,
            tiempo_estimado: svc.servicio_tiempo_estimado,
            progreso,
            tareas_total: total,
            tareas_completadas: completadas,
            demorado,
            tecnicos,
            created_at: svc.servicio_fecha_creacion,
          };
        })
      );

      const bloqueados = result.filter((s) => s.estado === "bloqueado");
      const demorados = result.filter((s) => s.demorado);

      return {
        data: {
          servicios: result,
          alertas: {
            bloqueados: bloqueados.length,
            demorados: demorados.length,
            total_activos: result.length,
          },
        },
      };
    }
  );

  // ─────────────────────────────────────────────
  // WAITING ROOM — Público (sin auth)
  // GET /api/public/display/sala-espera/:codigo
  // ─────────────────────────────────────────────
  app.get("/api/public/display/sala-espera/:codigo", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };

    const { data: servicios } = await supabase
      .from("servicios")
      .select("*")
      .eq("servicio_codigo", codigo)
      .limit(1);

    const servicio = servicios?.[0];
    if (!servicio) throw new NotFoundError("Servicio no encontrado");

    // Progreso
    const { data: tareasData } = await supabase
      .from("tareas")
      .select("tarea_estado")
      .eq("servicio_id", servicio.servicio_id);

    const total = tareasData?.length || 0;
    const completadas = tareasData?.filter((t: any) => t.tarea_estado === "completado").length || 0;
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

    let tiempoTranscurrido = 0;
    if (servicio.servicio_fecha_inicio) {
      tiempoTranscurrido = Math.floor(
        (Date.now() - new Date(servicio.servicio_fecha_inicio).getTime()) / 60000
      );
    }

    // Posición en fila
    let posicionFila = 0;
    if (servicio.servicio_estado === "pendiente" && servicio.area_id) {
      const { data: pendientes } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("area_id", servicio.area_id)
        .eq("servicio_estado", "pendiente")
        .lt("servicio_id", servicio.servicio_id);

      posicionFila = (pendientes?.length || 0) + 1;
    }

    let etaEstimado: number | null = null;
    if (posicionFila > 0 && servicio.servicio_tiempo_estimado) {
      etaEstimado = posicionFila * servicio.servicio_tiempo_estimado;
    }

    return {
      data: {
        codigo: servicio.servicio_codigo,
        estado: servicio.servicio_estado,
        progreso_porcentaje: progreso,
        tiempo_transcurrido: tiempoTranscurrido,
        tiempo_estimado: servicio.servicio_tiempo_estimado,
        posicion_fila: posicionFila,
        eta_estimado: etaEstimado,
      },
    };
  });
}
