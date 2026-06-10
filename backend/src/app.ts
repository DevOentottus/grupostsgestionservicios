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

  return app;
}

// ── Inicio local ──
const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 ServicioLocalSTS corriendo en http://${config.host}:${config.port}`);
  } catch (err) {
    console.error("Error al iniciar:", err);
    process.exit(1);
  }
};

start();
