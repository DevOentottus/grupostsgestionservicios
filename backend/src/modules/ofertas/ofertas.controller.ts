import { FastifyInstance } from "fastify";
import { join } from "node:path";
import { readdirSync, existsSync, createReadStream } from "node:fs";

function findOfertasDir(): string {
  const candidates = [
    join(process.cwd(), "Ofertas"),
    join(process.cwd(), "backend", "Ofertas"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}
const OFERTAS_DIR = findOfertasDir();

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isImage(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export async function ofertasController(app: FastifyInstance) {
  // -- GET /api/ofertas -- listar imágenes de ofertas
  app.get(
    "/api/ofertas",
    async () => {
      if (!existsSync(OFERTAS_DIR)) return { data: [] };

      const files = readdirSync(OFERTAS_DIR)
        .filter((f: string) => isImage(f))
        .sort((a: string, b: string) => a.localeCompare(b));

      return { data: files };
    }
  );

  // -- GET /api/ofertas/imagen/:filename -- servir imagen
  app.get(
    "/api/ofertas/imagen/:filename",
    async (request, reply) => {
      const { filename } = request.params as { filename: string };

      // Sanitize: solo permitir nombres de archivo seguros
      if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return reply.status(400).send({ error: "Nombre de archivo inválido" });
      }

      if (!isImage(filename)) {
        return reply.status(400).send({ error: "Tipo de archivo no permitido" });
      }

      const filePath = join(OFERTAS_DIR, filename);

      if (!existsSync(filePath)) {
        return reply.status(404).send({ error: "Imagen no encontrada" });
      }

      const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
      const mimeMap: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };

      reply.type(mimeMap[ext] || "application/octet-stream");
      return reply.send(createReadStream(filePath));
    }
  );
}
