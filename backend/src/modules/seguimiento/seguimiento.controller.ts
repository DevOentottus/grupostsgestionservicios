import { FastifyInstance } from "fastify";
import { eq, and, isNull, sql, asc, desc, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { z } from "zod";

export async function seguimientoController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ──────────────────────────────────
  // TIME TRACKING (ET-02)
  // ──────────────────────────────────

  // POST /api/tareas/:id/tiempo/iniciar
  app.post("/api/tareas/:id/tiempo/iniciar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    // Verificar que no haya un tracking activo
    const [activo] = await db
      .select()
      .from(schema.tiempo_tracking)
      .where(and(
        eq(schema.tiempo_tracking.tarea_id, parseInt(id)),
        eq(schema.tiempo_tracking.usuario_id, user.user_id),
        isNull(schema.tiempo_tracking.fin),
      ))
      .limit(1);
    if (activo) throw new ValidationError("Ya hay un tracking activo para esta tarea");
    const [track] = await db
      .insert(schema.tiempo_tracking)
      .values({ tarea_id: parseInt(id), usuario_id: user.user_id })
      .returning();
    return reply.status(201).send({ data: track });
  });

  // PATCH /api/tiempo/:id/pausar
  app.patch("/api/tiempo/:id/pausar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await db
      .update(schema.tiempo_tracking)
      .set({ pausa_at: new Date() })
      .where(eq(schema.tiempo_tracking.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Registro no encontrado");
    return reply.send({ data: updated });
  });

  // PATCH /api/tiempo/:id/reanudar
  app.patch("/api/tiempo/:id/reanudar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await db
      .update(schema.tiempo_tracking)
      .set({ pausa_at: null })
      .where(eq(schema.tiempo_tracking.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Registro no encontrado");
    return reply.send({ data: updated });
  });

  // PATCH /api/tiempo/:id/finalizar
  app.patch("/api/tiempo/:id/finalizar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await db
      .update(schema.tiempo_tracking)
      .set({ fin: new Date(), pausa_at: null })
      .where(eq(schema.tiempo_tracking.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Registro no encontrado");
    return reply.send({ data: updated });
  });

  // GET /api/tareas/:id/tiempo
  app.get("/api/tareas/:id/tiempo", async (request) => {
    const { id } = request.params as { id: string };
    const rows = await db
      .select()
      .from(schema.tiempo_tracking)
      .where(eq(schema.tiempo_tracking.tarea_id, parseInt(id)))
      .orderBy(asc(schema.tiempo_tracking.inicio));
    return { data: rows };
  });

  // ──────────────────────────────────
  // ENCUESTAS (ET-04)
  // ──────────────────────────────────

  const encuestaSchema = z.object({
    calificacion: z.number().int().min(1).max(5),
    comentario: z.string().optional(),
    sugerencia: z.string().optional(),
  });

  // POST /api/servicios/:id/encuesta
  app.post("/api/servicios/:id/encuesta", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = encuestaSchema.parse(request.body);
    const [encuesta] = await db
      .insert(schema.encuestas)
      .values({
        servicio_id: parseInt(id),
        calificacion: input.calificacion,
        comentario: input.comentario || null,
        sugerencia: input.sugerencia || null,
      })
      .returning();
    return reply.status(201).send({ data: encuesta });
  });

  // GET /api/servicios/:id/encuesta
  app.get("/api/servicios/:id/encuesta", async (request) => {
    const { id } = request.params as { id: string };
    const [encuesta] = await db
      .select()
      .from(schema.encuestas)
      .where(eq(schema.encuestas.servicio_id, parseInt(id)))
      .limit(1);
    return { data: encuesta || null };
  });

  // ──────────────────────────────────
  // PORTAL CLIENTE (ET-03)
  // ──────────────────────────────────

  // GET /api/public/servicios/:codigo
  app.get("/api/public/servicios/:codigo", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const [servicio] = await db
      .select()
      .from(schema.servicios)
      .where(eq(schema.servicios.codigo, codigo))
      .limit(1);
    if (!servicio) throw new NotFoundError("Servicio no encontrado");
    // Marcar como consultado por el cliente
    await db
      .update(schema.servicios)
      .set({ consultado_cliente: true })
      .where(eq(schema.servicios.id, servicio.id));

    const tareasList = await db
      .select()
      .from(schema.tareas)
      .where(eq(schema.tareas.servicio_id, servicio.id))
      .orderBy(asc(schema.tareas.orden));
    return { data: { servicio, tareas: tareasList } };
  });

  // ──────────────────────────────────
  // DASHBOARD / KPI (ET-05)
  // ──────────────────────────────────

  app.get("/api/dashboard", async (request) => {
    const query = request.query as { desde?: string; hasta?: string };
    const desde = query.desde ? new Date(query.desde) : null;
    const hasta = query.hasta ? new Date(query.hasta) : null;

    // Filtro por fecha
    const filtroFecha = and(
      desde ? gte(schema.servicios.created_at, desde) : undefined,
      hasta ? lte(schema.servicios.created_at, hasta) : undefined,
    );

    // Totales
    const totalServicios = await db.$count(schema.servicios, filtroFecha);
    const completados = await db.$count(
      schema.servicios,
      and(eq(schema.servicios.estado, "completado"), filtroFecha)
    );

    // IND-01: % registros con datos completos
    const completos = await db.$count(
      schema.servicios,
      and(eq(schema.servicios.datos_completos, true), filtroFecha)
    );

    // IND-02: % servicios con tareas
    const conTareas = await db.$count(
      schema.servicios,
      and(
        sql`EXISTS (SELECT 1 FROM ${schema.tareas} WHERE ${schema.tareas.servicio_id} = ${schema.servicios.id})`,
        filtroFecha
      )
    );

    // IND-03: Tiempo promedio (minutos)
    const [tiempoResult] = await db
      .select({
        promedio: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${schema.tiempo_tracking.fin} - ${schema.tiempo_tracking.inicio})) / 60), 0)`,
      })
      .from(schema.tiempo_tracking)
      .where(and(
        sql`${schema.tiempo_tracking.fin} IS NOT NULL`,
        desde ? gte(schema.tiempo_tracking.inicio, desde) : undefined,
        hasta ? lte(schema.tiempo_tracking.inicio, hasta) : undefined,
      ));

    const tiempoPromedio = Math.round(Number(tiempoResult?.promedio || 0));

    // IND-04: % completados dentro del tiempo promedio
    const dentroTiempo = await db.$count(
      schema.tiempo_tracking,
      and(
        sql`${schema.tiempo_tracking.fin} IS NOT NULL`,
        sql`EXTRACT(EPOCH FROM (${schema.tiempo_tracking.fin} - ${schema.tiempo_tracking.inicio})) / 60 <= ${tiempoPromedio}`,
      ),
    );
    const totalConTiempo = await db.$count(
      schema.tiempo_tracking,
      sql`${schema.tiempo_tracking.fin} IS NOT NULL`
    );

    // IND-05: % servicios consultados por clientes
    const consultados = await db.$count(
      schema.servicios,
      and(eq(schema.servicios.consultado_cliente, true), filtroFecha)
    );

    // IND-06: Satisfacción visibilidad (promedio)
    const [satResult] = await db
      .select({
        promedio: sql<number>`COALESCE(AVG(calificacion), 0)`,
      })
      .from(schema.encuestas)
      .innerJoin(schema.servicios, eq(schema.encuestas.servicio_id, schema.servicios.id))
      .where(filtroFecha);

    // IND-07: % servicios evaluados
    const evaluados = await db.$count(
      schema.encuestas,
      filtroFecha ? sql`EXISTS (SELECT 1 FROM ${schema.servicios} WHERE ${schema.servicios.id} = ${schema.encuestas.servicio_id} AND ${filtroFecha})` : undefined
    );

    // IND-08: % servicios con comentarios
    const conFeedback = await db.$count(
      schema.encuestas,
      and(
        sql`(comentario IS NOT NULL OR sugerencia IS NOT NULL)`,
        filtroFecha ? sql`EXISTS (SELECT 1 FROM ${schema.servicios} WHERE ${schema.servicios.id} = ${schema.encuestas.servicio_id} AND ${filtroFecha})` : undefined
      )
    );

    // Rankings para el dashboard
    const serviciosRecientes = await db
      .select()
      .from(schema.servicios)
      .where(filtroFecha)
      .orderBy(desc(schema.servicios.created_at))
      .limit(10);

    return {
      data: {
        kpi: {
          registros_completos_pct: totalServicios ? Math.round((completos / totalServicios) * 100) : 0,
          servicios_con_tareas_pct: totalServicios ? Math.round((conTareas / totalServicios) * 100) : 0,
          tiempo_promedio_min: tiempoPromedio,
          completados_dentro_tiempo_pct: totalConTiempo ? Math.round((dentroTiempo / totalConTiempo) * 100) : 0,
          servicios_consultados_pct: totalServicios ? Math.round((consultados / totalServicios) * 100) : 0,
          satisfaccion_visibilidad: Math.round(Number(satResult?.promedio || 0) * 10) / 10,
          servicios_evaluados_pct: completados ? Math.round((evaluados / completados) * 100) : 0,
          servicios_con_comentarios_pct: completados ? Math.round((conFeedback / completados) * 100) : 0,
        },
        servicios_recientes: serviciosRecientes,
        total_servicios: totalServicios,
        completados,
      },
    };
  });
}
