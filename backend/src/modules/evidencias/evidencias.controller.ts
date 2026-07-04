import { FastifyInstance } from "fastify";
import { supabase, type TablesUpdate } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const STORAGE_BUCKET = "evidencia-files";

// -- Helpers --

async function uploadBase64(
  bucket: string,
  path: string,
  base64: string,
  contentType: string
): Promise<string> {
  const raw = base64.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl.publicUrl;
}

async function canAccessServicio(
  servicioId: number,
  userId: number,
  rol: string,
  areaId: number | null
): Promise<boolean> {
  if (rol === "admin" || rol === "sistema") return true;
  const { data: s } = await supabase
    .from("servicios")
    .select("servicio_id, area_id, tecnico_principal_id")
    .eq("servicio_id", servicioId)
    .single();
  if (!s) return false;
  if (s.tecnico_principal_id === userId) return true;
  if (rol === "encargado" && s.area_id === areaId) return true;
  return false;
}

const uploadSchema = z.object({
  servicio_id: z.number().int(),
  tarea_id: z.number().int(),
  tipo: z.enum(["photo", "video"]),
  archivo_base64: z.string().min(1),
  content_type: z.string().optional(),
  comentario: z.string().optional(),
});

const comentarioSchema = z.object({
  contenido: z.string().min(1),
});

// -- Controller --

export async function evidenciasController(app: FastifyInstance) {
  // -- POST /api/evidencias/upload --
  app.post(
    "/api/evidencias/upload",
    { preHandler: [requireRoles()] },
    async (request) => {
      const input = uploadSchema.parse(request.body);
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };

      // Verify access to the service
      if (!(await canAccessServicio(input.servicio_id, user.user_id, user.rol, user.area_id))) {
        throw new ForbiddenError("No tenés acceso a este servicio");
      }

      // Generate storage path — mapear MIME a extensión real
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/avif": "avif",
        "video/mp4": "mp4",
        "video/webm": "webm",
      };
      const ext = mimeToExt[input.content_type || ""] || "jpg";
      const storagePath = `servicio_${input.servicio_id}/tarea_${input.tarea_id}/${randomUUID()}.${ext}`;

      // Upload file
      let publicUrl: string;
      try {
        publicUrl = await uploadBase64(
          STORAGE_BUCKET,
          storagePath,
          input.archivo_base64,
          input.content_type || "image/jpeg"
        );
      } catch (err: any) {
        throw new ValidationError("Error al subir el archivo: " + err.message);
      }

      // Create record
      const { data: rows, error } = await supabase
        .from("evidencias")
        .insert({
          servicio_id: input.servicio_id,
          tarea_id: input.tarea_id,
          tipo: input.tipo,
          archivo_url: publicUrl,
          comentario_colaborador: input.comentario || null,
          submitted_by: user.user_id,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .limit(1);

      if (error) throw new ValidationError("Error al guardar evidencia: " + error.message);
      if (!rows?.length) throw new Error("No se pudo crear la evidencia");

      await auditLog(null, user.user_id, "INSERT", "evidencias", rows[0].evidencia_id, {
        servicio_id: input.servicio_id,
        tarea_id: input.tarea_id,
        tipo: input.tipo,
      });

      // ─── Notificación: nueva evidencia ───
      try {
        const { data: svc } = await supabase
          .from("servicios")
          .select("servicio_nombre, area_id")
          .eq("servicio_id", input.servicio_id)
          .limit(1);

        const servicio = svc?.[0];
        if (servicio?.area_id) {
          // Get area encargado
          const { data: areaRows } = await supabase
            .from("areas")
            .select("area_encargado_id")
            .eq("area_id", servicio.area_id)
            .limit(1);
          const encargadoId = areaRows?.[0]?.area_encargado_id;

          // Get area collaborators
          const { data: colabRows } = await supabase
            .from("areacolaboradores")
            .select("colaborador_id")
            .eq("area_id", servicio.area_id);

          // Combine user IDs (add assigned technician too via tecnico_principal_id)
          // Note: tecnico_principal_id is already in servicios if assigned
          const userIds = new Set<number>();
          if (encargadoId) userIds.add(encargadoId);
          for (const c of colabRows || []) userIds.add(c.colaborador_id);

          // Remove the uploader
          userIds.delete(user.user_id);

          // Insert one notification per user
          const titulo = "Nueva evidencia";
          const mensaje = `Se ha cargado una nueva evidencia en ${servicio.servicio_nombre}`;
          const now = new Date().toISOString();

          for (const uid of userIds) {
            await supabase.from("notificaciones").insert({
              usuario_id: uid,
              titulo,
              mensaje,
              tipo: "evidencia",
              referencia_id: input.servicio_id,
              created_at: now,
            });
          }
        }
      } catch {
        // No bloquear el upload si falla la notificación
      }

      return { data: mapEvidencia(rows[0]) };
    }
  );

  // -- GET /api/servicios/:id/evidencias --
  app.get(
    "/api/servicios/:id/evidencias",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const servicioId = parseInt(id);

      if (!(await canAccessServicio(servicioId, user.user_id, user.rol, user.area_id))) {
        throw new ForbiddenError("No tenés acceso a este servicio");
      }

      const { data: rows } = await supabase
        .from("evidencias")
        .select("*, comentariosevidencias(*)")
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: false });

      return {
        data: (rows || []).map((e: any) => ({
          ...mapEvidencia(e),
          comentarios: (e.comentariosevidencias || []).map((c: any) => ({
            id: c.comentarioevidencia_id,
            evidencia_id: c.evidencia_id,
            usuario_id: c.usuario_id,
            es_cliente: c.es_cliente,
            contenido: c.contenido,
            created_at: c.created_at,
          })),
        })),
      };
    }
  );

  // -- POST /api/evidencias/:id/comentario --
  app.post(
    "/api/evidencias/:id/comentario",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = comentarioSchema.parse(request.body);
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const evidenciaId = parseInt(id);

      // Verify evidence exists and user can access
      const { data: ev } = await supabase
        .from("evidencias")
        .select("*, servicios!inner(servicio_id, area_id, tecnico_principal_id)")
        .eq("evidencia_id", evidenciaId)
        .single();

      if (!ev) throw new NotFoundError("Evidencia no encontrada");
      if (!(await canAccessServicio(ev.servicio_id, user.user_id, user.rol, user.area_id))) {
        throw new ForbiddenError("No tenés acceso");
      }

      const { data: rows, error } = await supabase
        .from("comentariosevidencias")
        .insert({
          evidencia_id: evidenciaId,
          usuario_id: user.user_id,
          es_cliente: false,
          contenido: input.contenido,
        })
        .select()
        .limit(1);

      if (error) throw new ValidationError("Error al guardar comentario: " + error.message);

      return { data: rows?.[0] };
    }
  );

  // -- PATCH /api/evidencias/:id/estado --
  app.patch(
    "/api/evidencias/:id/estado",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = z.object({
        estado: z.enum(["pendiente", "aprobado", "rechazado", "reemplazado"]),
        motivo: z.string().optional(),
      }).parse(request.body);
      const user = request.user as { user_id: number; rol: string; };
      const evidenciaId = parseInt(id);

      // Si se rechaza: guardar motivo, actualizar evidencia y volver tarea a pendiente
      if (input.estado === "rechazado") {
        const { data: evidencia } = await supabase
          .from("evidencias")
          .select("tarea_id, servicio_id")
          .eq("evidencia_id", evidenciaId)
          .single();

        if (!evidencia) throw new NotFoundError("Evidencia no encontrada");

        // Guardar motivo como comentario si se proporcionó
        if (input.motivo) {
          const { error: commentError } = await supabase
            .from("comentariosevidencias")
            .insert({
              evidencia_id: evidenciaId,
              usuario_id: user.user_id,
              es_cliente: false,
              contenido: `Motivo de rechazo: ${input.motivo}`,
            });

          if (commentError) throw new ValidationError("Error al guardar motivo: " + commentError.message);
        }

        // Actualizar estado de la evidencia
        const { error: updateError } = await supabase
          .from("evidencias")
          .update({ estado: input.estado })
          .eq("evidencia_id", evidenciaId);

        if (updateError) throw new ValidationError("Error al actualizar estado: " + updateError.message);

        // Volver la tarea asociada a pendiente
        const { error: tareaError } = await supabase
          .from("tareas")
          .update({
            tarea_estado: "pendiente",
            tarea_completado_por: null,
            tarea_fecha_completado: null,
            tarea_hora_completado: null,
          })
          .eq("tarea_id", evidencia.tarea_id);

        if (tareaError) throw new ValidationError("Error al actualizar tarea: " + tareaError.message);

        await auditLog(null, user.user_id, "UPDATE", "evidencias", evidenciaId, { estado: input.estado, tarea_reabierta: true });
        return { data: { id: evidenciaId, estado: input.estado } };
      }

      // Para aprobado: guardar motivo como comentario
      if (input.estado === "aprobado" && input.motivo) {
        const { error: commentError } = await supabase
          .from("comentariosevidencias")
          .insert({
            evidencia_id: evidenciaId,
            usuario_id: user.user_id,
            es_cliente: false,
            contenido: `Motivo de aprobación: ${input.motivo}`,
          });

        if (commentError) throw new ValidationError("Error al guardar motivo: " + commentError.message);
      }

      // Para otros estados (pendiente, reemplazado) — comportamiento actual
      const { error } = await supabase
        .from("evidencias")
        .update({ estado: input.estado })
        .eq("evidencia_id", evidenciaId);

      if (error) throw new ValidationError("Error al actualizar estado: " + error.message);

      await auditLog(null, user.user_id, "UPDATE", "evidencias", evidenciaId, { estado: input.estado });
      return { data: { id: evidenciaId, estado: input.estado } };
    }
  );

  // -- PATCH /api/evidencias/:id/mostrar-cliente --
  app.patch(
    "/api/evidencias/:id/mostrar-cliente",
    { preHandler: [requireRoles("admin", "sistema", "encargado", "colaborador")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = z.object({ mostrar_cliente: z.boolean() }).parse(request.body);
      const user = request.user as { user_id: number; rol: string; area_id: number | null; };
      const evidenciaId = parseInt(id);

      // Get evidence to check servicio permissions
      const { data: ev } = await supabase
        .from("evidencias")
        .select("evidencia_id, servicio_id, tarea_id, submitted_by, servicios!inner(servicio_id, area_id, servicio_colaborador_edita_visibilidad)")
        .eq("evidencia_id", evidenciaId)
        .single();

      if (!ev) throw new NotFoundError("Evidencia no encontrada");

      const s = ev.servicios;

      // Admin/sistema can always toggle
      if (user.rol !== "admin" && user.rol !== "sistema") {
        // Encargado can toggle for servicios in their area
        if (user.rol === "encargado") {
          if (s.area_id !== user.area_id) {
            throw new ForbiddenError("No tenés acceso a este servicio");
          }
        }
        // Colaborador can only toggle if servicio allows it AND they own the evidence
        if (user.rol === "colaborador") {
          if (!s.servicio_colaborador_edita_visibilidad) {
            throw new ForbiddenError("No tenés permiso para cambiar la visibilidad de evidencias en este servicio");
          }
          if (ev.submitted_by !== user.user_id) {
            throw new ForbiddenError("Solo podés modificar la visibilidad de tus propias evidencias");
          }
        }
      }

      const { error } = await supabase
        .from("evidencias")
        .update({ mostrar_cliente: input.mostrar_cliente } as any)
        .eq("evidencia_id", evidenciaId);

      if (error) throw new ValidationError("Error al actualizar mostrar_cliente: " + error.message);

      await auditLog(null, user.user_id, "UPDATE", "evidencias", evidenciaId, { mostrar_cliente: input.mostrar_cliente });
      return { data: { id: evidenciaId, mostrar_cliente: input.mostrar_cliente } };
    }
  );

  // -- PATCH /api/tareas/:id/evidencia-config --
  app.patch(
    "/api/tareas/:id/evidencia-config",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = z.object({
        requiere_evidencia: z.boolean().optional(),
        modo_evidencia: z.string().nullable().optional(),
        evidencia_desactivada: z.boolean().optional(),
      }).parse(request.body);
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const tareaId = parseInt(id);

      // Verify access to the tarea's service
      const { data: tarea } = await supabase
        .from("tareas")
        .select("servicio_id, servicios!inner(servicio_id, area_id, tecnico_principal_id, servicio_colaborador_desactiva)")
        .eq("tarea_id", tareaId)
        .single();

      if (!tarea) throw new NotFoundError("Tarea no encontrada");

      if (user.rol !== "admin" && user.rol !== "sistema") {
        const s = tarea.servicios;
        if (!s) throw new ForbiddenError("No tenés acceso");

        // Colaborador can only toggle if servicio allows it
        if (input.evidencia_desactivada !== undefined) {
          if (!s.servicio_colaborador_desactiva && user.rol === "colaborador") {
            throw new ForbiddenError("No podés desactivar la evidencia para este servicio");
          }
        }
      }

      const updateData: TablesUpdate<"tareas"> = {};
      if (input.requiere_evidencia !== undefined) updateData.tarea_requiere_evidencia = input.requiere_evidencia;
      if (input.modo_evidencia !== undefined) updateData.tarea_modo_evidencia = input.modo_evidencia;
      if (input.evidencia_desactivada !== undefined) updateData.tarea_evidencia_desactivada = input.evidencia_desactivada;

      if (Object.keys(updateData).length === 0) throw new ValidationError("No hay campos para actualizar");

      const { error } = await supabase.from("tareas").update(updateData).eq("tarea_id", tareaId);
      if (error) throw new ValidationError("Error al actualizar config de evidencia: " + error.message);

      return { data: { id: tareaId, ...updateData } };
    }
  );

  // -- GET /api/public/servicios/:codigo/evidencias --
  app.get("/api/public/servicios/:codigo/evidencias", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const query = request.query as { dni?: string };

    if (!query?.dni) {
      return reply.status(400).send({ detail: "DNI es obligatorio" });
    }

    const { data: servicios } = await supabase
      .from("servicios")
      .select("servicio_id, cliente_id")
      .eq("servicio_codigo", codigo)
      .limit(1);

    if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");

    const s = servicios[0];

    // Validate DNI
    const { data: clientes } = await supabase
      .from("clientes")
      .select("cliente_dni")
      .eq("cliente_id", s.cliente_id!)
      .limit(1);

    if (clientes?.[0] && clientes[0].cliente_dni !== query.dni) {
      throw new ForbiddenError("DNI incorrecto");
    }

    const { data: rows } = await supabase
      .from("evidencias")
      .select("*, comentariosevidencias(*)")
      .eq("servicio_id", s.servicio_id)
      .eq("mostrar_cliente" as any, true)
      .neq("estado", "rechazado")
      .order("created_at", { ascending: false });

    return {
      data: (rows || []).map((e: any) => ({
        ...mapEvidencia(e),
        comentarios: (e.comentariosevidencias || []).map((c: any) => ({
          id: c.comentarioevidencia_id,
          evidencia_id: c.evidencia_id,
          es_cliente: c.es_cliente,
          contenido: c.contenido,
          created_at: c.created_at,
        })),
      })),
    };
  });

  // -- POST /api/public/evidencias/:id/comentario --
  app.post("/api/public/evidencias/:id/comentario", async (request) => {
    const { id } = request.params as { id: string };
    const input = z.object({
      contenido: z.string().min(1),
      codigo: z.string().min(1),
      dni: z.string().min(1),
    }).parse(request.body);
    const evidenciaId = parseInt(id);

    // Verify the evidence exists and belongs to this service
    const { data: ev } = await supabase
      .from("evidencias")
      .select("evidencia_id, servicio_id, servicios!inner(servicio_codigo)")
      .eq("evidencia_id", evidenciaId)
      .single();

    if (!ev) throw new NotFoundError("Evidencia no encontrada");

    const s = ev.servicios;
    if (s.servicio_codigo !== input.codigo) throw new ForbiddenError("Código de servicio incorrecto");

    // Validate DNI
    const { data: sv } = await supabase
      .from("servicios")
      .select("cliente_id, clientes!inner(cliente_dni)")
      .eq("servicio_id", ev.servicio_id)
      .limit(1);
    const clienteDni = sv?.[0]?.clientes?.cliente_dni;
    if (clienteDni && clienteDni !== input.dni) {
      throw new ForbiddenError("DNI incorrecto");
    }

    const { data: rows, error } = await supabase
      .from("comentariosevidencias")
      .insert({
        evidencia_id: evidenciaId,
        es_cliente: true,
        contenido: input.contenido,
      })
      .select()
      .limit(1);

    if (error) throw new ValidationError("Error al guardar comentario: " + error.message);
    return { data: rows?.[0] };
  });
}

// -- Mapper --

function mapEvidencia(row: any) {
  return {
    id: row.evidencia_id,
    servicio_id: row.servicio_id,
    tarea_id: row.tarea_id,
    tipo: row.tipo,
    archivo_url: row.archivo_url,
    thumbnail_url: row.thumbnail_url,
    comentario_colaborador: row.comentario_colaborador,
    comentario_cliente: row.comentario_cliente,
    estado: row.estado,
    submitted_by: row.submitted_by,
    submitted_at: row.submitted_at,
    created_at: row.created_at,
    mostrar_cliente: row.mostrar_cliente ?? false,
  };
}
