import { FastifyInstance } from "fastify";
import { requireRoles } from "@/core/middleware/auth.js";
import * as seguridadService from "./seguridad.service.js";
import { cleanupSeguridad } from "@/scripts/cleanup-seguridad.js";

export async function seguridadController(app: FastifyInstance) {
  // ── GET /api/seguridad/resumen ────────────────────────────
  app.get(
    "/api/seguridad/resumen",
    { preHandler: [requireRoles("sistema")] },
    async () => {
      return { data: await seguridadService.getResumen() };
    }
  );

  // ── GET /api/seguridad/intentos-fallidos ──────────────────
  app.get(
    "/api/seguridad/intentos-fallidos",
    { preHandler: [requireRoles("sistema")] },
    async (request) => {
      const q = request.query as {
        page?: string;
        limit?: string;
        desde?: string;
        hasta?: string;
        username?: string;
      };

      const page = Math.max(1, parseInt(q.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || "20")));

      return seguridadService.getIntentosFallidos(
        page,
        limit,
        q.desde,
        q.hasta,
        q.username
      );
    }
  );

  // ── GET /api/seguridad/sesiones ───────────────────────────
  app.get(
    "/api/seguridad/sesiones",
    { preHandler: [requireRoles("sistema")] },
    async (request) => {
      const q = request.query as { page?: string; limit?: string };

      const page = Math.max(1, parseInt(q.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || "20")));

      return seguridadService.getSesiones(page, limit);
    }
  );

  // ── DELETE /api/seguridad/sesiones/:id ────────────────────
  app.delete(
    "/api/seguridad/sesiones/:id",
    { preHandler: [requireRoles("sistema")] },
    async (request) => {
      const { id } = request.params as { id: string };
      await seguridadService.revocarSesion(parseInt(id, 10));
      return { data: { success: true } };
    }
  );

  // ── GET /api/seguridad/sospechoso ─────────────────────────
  app.get(
    "/api/seguridad/sospechoso",
    { preHandler: [requireRoles("sistema")] },
    async (request) => {
      const q = request.query as { page?: string; limit?: string };

      const page = Math.max(1, parseInt(q.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || "20")));

      return seguridadService.getActividadSospechosa(page, limit);
    }
  );

  // ── GET /api/seguridad/exportar/:tipo ─────────────────────
  app.get(
    "/api/seguridad/exportar/:tipo",
    { preHandler: [requireRoles("sistema")] },
    async (request, reply) => {
      const { tipo } = request.params as { tipo: string };
      const q = request.query as { desde?: string; hasta?: string };

      if (tipo === "csv") {
        const data = await seguridadService.exportarLogs(
          "intentos-fallidos",
          q.desde,
          q.hasta
        );

        const headers = Object.keys(data[0] || {}).join(",");
        const rows = data.map((r) =>
          Object.values(r)
            .map((v) => (typeof v === "string" ? `"${v}"` : String(v ?? "")))
            .join(",")
        );
        const csv = [headers, ...rows].join("\r\n");

        reply.header("Content-Type", "text/csv");
        reply.header(
          "Content-Disposition",
          `attachment; filename="seguridad-${new Date().toISOString().split("T")[0]}.csv"`
        );
        return reply.send(csv);
      }

      // Exportación específica por tipo
      const data = await seguridadService.exportarLogs(tipo, q.desde, q.hasta);

      const headers = Object.keys(data[0] || {}).join(",");
      const rows = data.map((r) =>
        Object.values(r)
          .map((v) => (typeof v === "string" ? `"${v}"` : String(v ?? "")))
          .join(",")
      );
      const csv = [headers, ...rows].join("\r\n");

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="seguridad-${tipo}-${new Date().toISOString().split("T")[0]}.csv"`
      );
      return reply.send(csv);
    }
  );

  // ── POST /api/seguridad/cleanup ──────────────────────────
  app.post(
    "/api/seguridad/cleanup",
    { preHandler: [requireRoles("sistema")] },
    async () => {
      const result = await cleanupSeguridad();
      return { data: result };
    }
  );
}
