import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const STORAGE_BUCKET = "audio-reportes";

const uploadAudioSchema = z.object({
  audio_base64: z.string().min(1),
  content_type: z.string().default("audio/webm"),
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
      const user = request.user;
      if (!user) throw new ValidationError("Usuario no autenticado");

      const input = uploadAudioSchema.parse(request.body);

      // Generar ruta única en storage
      const extension = input.content_type.includes("mp3")
        ? "mp3"
        : input.content_type.includes("wav")
        ? "wav"
        : input.content_type.includes("ogg")
        ? "ogg"
        : input.content_type.includes("mp4")
        ? "mp4"
        : "webm";

      const storagePath = `audios/${user.user_id}/${randomUUID()}.${extension}`;

      // Subir a Supabase Storage
      const raw = input.audio_base64.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(raw, "base64");

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: input.content_type,
          upsert: false,
        });

      if (uploadError) {
        throw new ValidationError(
          "Error al subir el audio: " + uploadError.message
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return { data: { url: publicUrlData.publicUrl } };
    }
  );
}
