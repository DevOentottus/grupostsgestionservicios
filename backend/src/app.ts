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
import { solicitudesController } from "@/modules/solicitudes/solicitudes.controller.js";
import { anunciosController } from "@/modules/anuncios/anuncios.controller.js";
import { rendimientoController } from "@/modules/rendimiento/rendimiento.controller.js";
import { evidenciasController } from "@/modules/evidencias/evidencias.controller.js";
import { audioController } from "@/modules/audio/audio.controller.js";
import { pushController } from "@/modules/push/push.controller.js";
import { ofertasController } from "@/modules/ofertas/ofertas.controller.js";

export async function buildApp() {
  const app = Fastify({ logger: config.isDev });

  // -- Plugins --
  await app.register(cors, { origin: config.cors.origin, credentials: true });
  await app.register(jwt, { secret: config.jwt.secret });

  // -- Decorators --
  app.decorate("authenticate", authenticate);

  // -- Permite body vacío con Content-Type: application/json (PATCH sin body) --
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body: string, done) => {
    if (body === "") return done(null, {});
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      done(err as Error);
    }
  });

  // -- Error handler --
  app.setErrorHandler(errorHandler);

  // -- Health --
  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // -- Módulos --
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
  await app.register(solicitudesController);
  await app.register(anunciosController);
  await app.register(rendimientoController);
  await app.register(evidenciasController);
  await app.register(audioController);
  await app.register(pushController);
  await app.register(ofertasController);

  return app;
}
