import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";

export async function auditoriaController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── GET /api/auditoria — admin only, paginated, filterable ──
  app.get(
    "/api/auditoria",
    { preHandler: [authorize("sistema")] },
    async (request) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        entidad?: string;
        usuario_id?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
      };

      const page = Math.max(1, parseInt(query.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20")));
      const offset = (page - 1) * limit;

      // Build query
      let dbQuery = supabase
        .from("auditoria")
        .select(`
          auditoria_id,
          usuario_id,
          auditoria_accion,
          auditoria_tabla,
          auditoria_registro_id,
          auditoria_detalle,
          auditoria_fecha,
          auditoria_hora,
          usuarios!auditoria_usuario_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_username
          )
        `, { count: "exact" });

      if (query.entidad) {
        dbQuery = dbQuery.eq("auditoria_tabla", query.entidad);
      }

      if (query.usuario_id) {
        dbQuery = dbQuery.eq("usuario_id", parseInt(query.usuario_id));
      }

      if (query.fecha_desde) {
        dbQuery = dbQuery.gte("auditoria_fecha", query.fecha_desde);
      }

      if (query.fecha_hasta) {
        dbQuery = dbQuery.lte("auditoria_fecha", query.fecha_hasta);
      }

      const { data: rows, count: total } = await dbQuery
        .order("auditoria_id", { ascending: false })
        .range(offset, offset + limit - 1);

      const mapped = (rows || []).map((r: any) => ({
        id: r.auditoria_id,
        usuario_id: r.usuario_id,
        accion: r.auditoria_accion,
        entidad: r.auditoria_tabla,
        entidad_id: r.auditoria_registro_id,
        detalle: r.auditoria_detalle,
        created_at: r.auditoria_fecha,
        usuario: r.usuarios
          ? {
              id: r.usuarios.usuario_id,
              nombres: r.usuarios.usuario_nombres,
              username: r.usuarios.usuario_username,
            }
          : null,
      }));

      return {
        data: mapped,
        meta: {
          total: total || 0,
          page,
          limit,
          totalPages: Math.ceil((total || 0) / limit),
        },
      };
    }
  );
}
