import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { config } from "@/core/config/index.js";
import { z } from "zod";
import webPush from "web-push";

// Configurar VAPID
webPush.setVapidDetails(
  "mailto:soporte@serviciolocalsts.com",
  config.vapid.publicKey,
  config.vapid.privateKey,
);

const subscribeSchema = z.object({
  dni: z.string().min(1),
  endpoint: z.string().url(),
  p256dh_key: z.string().min(1),
  auth_key: z.string().min(1),
});

/**
 * Envía una notificación push a todas las suscripciones asociadas a un DNI.
 * No lanza errores si falla el envío individual (la suscripción pudo expirar).
 */
export async function sendPushToDNI(
  dni: string,
  payload: { title: string; body: string; icon?: string; url?: string },
) {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("dni", dni);

  if (!subscriptions?.length) return;

  const text = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        },
        text,
      );
    } catch (err: any) {
      // Si el endpoint ya no es válido (410 Gone), eliminar la suscripción
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

export async function pushController(app: FastifyInstance) {
  // POST /api/push/subscribe — guardar suscripción
  app.post("/api/push/subscribe", async (request, reply) => {
    const input = subscribeSchema.parse(request.body);

    // Evitar duplicados: mismo DNI + mismo endpoint
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("dni", input.dni)
      .eq("endpoint", input.endpoint)
      .limit(1);

    if (existing?.length) {
      // Ya existe, actualizar claves por si rotaron
      await supabase
        .from("push_subscriptions")
        .update({
          p256dh_key: input.p256dh_key,
          auth_key: input.auth_key,
        })
        .eq("id", existing[0].id);
      return reply.send({ data: { id: existing[0].id } });
    }

    const { data: inserted } = await supabase
      .from("push_subscriptions")
      .insert({
        dni: input.dni,
        endpoint: input.endpoint,
        p256dh_key: input.p256dh_key,
        auth_key: input.auth_key,
      })
      .select()
      .limit(1);

    if (!inserted?.length) throw new Error("No se pudo guardar la suscripción");

    return reply.status(201).send({ data: { id: inserted[0].id } });
  });

  // DELETE /api/push/subscribe — eliminar suscripción
  app.delete("/api/push/subscribe", async (request, reply) => {
    const { endpoint } = request.query as { endpoint?: string };
    if (!endpoint) {
      return reply.status(400).send({ error: "endpoint es requerido" });
    }

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    return reply.status(204).send();
  });
}
