import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { AppError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const STORAGE_BUCKET = "audio-reportes";

const uploadAudioSchema = z.object({
  audio_base64: z.string().min(1, "El audio en base64 es requerido"),
  content_type: z.string().nullable().optional().default("audio/webm"),
});

/**
 * POST /api/upload/audio
 *
 * Recibe un audio en base64, lo sube a Supabase Storage y devuelve la URL pública.
 */
export async function audioController(app: FastifyInstance) {
  app.post(
    "/api/upload/audio",
    { preHandler: [requireRoles()] },
    async (request) => {
      try {
        const user = request.user;
        if (!user) throw new ValidationError("Usuario no autenticado");

        const input = uploadAudioSchema.parse(request.body);
        const mime = input.content_type || "audio/webm";

        // Generar ruta única en storage
        const extension = mime.includes("mp3")
          ? "mp3"
          : mime.includes("wav")
          ? "wav"
          : mime.includes("ogg")
          ? "ogg"
          : mime.includes("mp4")
          ? "mp4"
          : "webm";

        const storagePath = `audios/${user.user_id}/${randomUUID()}.${extension}`;

        // Subir a Supabase Storage
        const raw = input.audio_base64.replace(/^data:.*?;base64,/, "");
        const buffer = Buffer.from(raw, "base64");

        if (buffer.length === 0) {
          throw new ValidationError("El audio está vacío");
        }

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: mime,
            upsert: false,
          });

        if (uploadError) {
          throw new ValidationError(
            "Error al subir el audio a storage: " + uploadError.message
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        return { data: { url: publicUrlData.publicUrl } };
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof z.ZodError) {
          throw new ValidationError(
            "Datos inválidos: " + err.issues.map((i) => i.message).join(", ")
          );
        }
        console.error("Error in audio upload:", err);
        throw new ValidationError("Error interno al procesar el audio");
      }
    }
  );
}
