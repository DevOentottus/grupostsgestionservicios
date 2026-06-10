import { buildApp } from "./app.js";
import middie from "@fastify/middie";

let app: Awaited<ReturnType<typeof buildApp>> | null = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.register(middie);
    await app.ready();
  }
  app.server.emit("request", req, res);
}
