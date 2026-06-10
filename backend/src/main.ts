import { buildApp } from "./app.js";
import { config } from "@/core/config/index.js";

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
