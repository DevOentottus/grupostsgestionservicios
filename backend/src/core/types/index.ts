import "fastify";

export type { Rol, JwtPayload, Servicio, Tarea, TiempoTracking, Encuesta, Usuario, DashboardKPI, EstadoServicio } from "../../../../shared/types/index.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      user_id: number;
      rol: import("../../../../shared/types/index.js").Rol;
      area_id: number | null;
    };
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
