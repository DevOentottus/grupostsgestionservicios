import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { config } from "@/core/config/index.js";
import { errorHandler } from "@/core/middleware/error-handler.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { authController } from "@/modules/auth/auth.controller.js";
import { usuariosController } from "@/modules/usuarios/usuarios.controller.js";
import { serviciosController } from "@/modules/servicios/servicios.controller.js";
import { seguimientoController } from "@/modules/seguimiento/seguimiento.controller.js";
import { areasController } from "@/modules/areas/areas.controller.js";
import { plantillasController } from "@/modules/plantillas/plantillas.controller.js";
import { comentariosController } from "@/modules/comentarios/comentarios.controller.js";
import { auditoriaController } from "@/modules/auditoria/auditoria.controller.js";
import { displayController } from "@/modules/display/display.controller.js";
import { reportesController } from "@/modules/reportes/reportes.controller.js";
import { managerController } from "@/modules/manager/manager.controller.js";

export async function buildApp() {
  const app = Fastify({ logger: config.isDev });

  // ── Plugins ──
  await app.register(cors, { origin: config.cors.origin, credentials: true });
  await app.register(jwt, { secret: config.jwt.secret });

  // ── Decorators ──
  app.decorate("authenticate", authenticate);

  // ── Error handler ──
  app.setErrorHandler(errorHandler);

  // ── Health ──
  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // ── Módulos ──
  await app.register(authController);
  await app.register(usuariosController);
  await app.register(serviciosController);
  await app.register(seguimientoController);
  await app.register(areasController);
  await app.register(plantillasController);
  await app.register(comentariosController);
  await app.register(auditoriaController);
  await app.register(displayController);
  await app.register(reportesController);
  await app.register(managerController);

  return app;
}
