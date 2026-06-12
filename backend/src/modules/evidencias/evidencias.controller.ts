import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const STORAGE_BUCKET = "evidencia-files";

// ── Helpers ──

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

// ── Controller ──

export async function evidenciasController(app: FastifyInstance) {
  // ── POST /api/evidencias/upload ──
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

      // Generate storage path
      const ext = input.content_type?.includes("video") ? "mp4" : "jpg";
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

      return { data: mapEvidencia(rows[0]) };
    }
  );

  // ── GET /api/servicios/:id/evidencias ──
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

  // ── POST /api/evidencias/:id/comentario ──
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

  // ── PATCH /api/evidencias/:id/estado ──
  app.patch(
    "/api/evidencias/:id/estado",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = z.object({ estado: z.enum(["pendiente", "aprobado", "rechazado", "reemplazado"]) }).parse(request.body);
      const user = request.user as { user_id: number; rol: string; };
      const evidenciaId = parseInt(id);

      const { error } = await supabase
        .from("evidencias")
        .update({ estado: input.estado })
        .eq("evidencia_id", evidenciaId);

      if (error) throw new ValidationError("Error al actualizar estado: " + error.message);

      await auditLog(null, user.user_id, "UPDATE", "evidencias", evidenciaId, { estado: input.estado });
      return { data: { id: evidenciaId, estado: input.estado } };
    }
  );

  // ── PATCH /api/tareas/:id/evidencia-config ──
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
        const s = (tarea as any).servicios;
        if (!s) throw new ForbiddenError("No tenés acceso");

        // Colaborador can only toggle if servicio allows it
        if (input.evidencia_desactivada !== undefined) {
          if (!s.servicio_colaborador_desactiva && user.rol === "colaborador") {
            throw new ForbiddenError("No podés desactivar la evidencia para este servicio");
          }
        }
      }

      const updateData: Record<string, any> = {};
      if (input.requiere_evidencia !== undefined) updateData.tarea_requiere_evidencia = input.requiere_evidencia;
      if (input.modo_evidencia !== undefined) updateData.tarea_modo_evidencia = input.modo_evidencia;
      if (input.evidencia_desactivada !== undefined) updateData.tarea_evidencia_desactivada = input.evidencia_desactivada;

      if (Object.keys(updateData).length === 0) throw new ValidationError("No hay campos para actualizar");

      const { error } = await supabase.from("tareas").update(updateData).eq("tarea_id", tareaId);
      if (error) throw new ValidationError("Error al actualizar config de evidencia: " + error.message);

      return { data: { id: tareaId, ...updateData } };
    }
  );

  // ── GET /api/public/servicios/:codigo/evidencias ──
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
      .eq("cliente_id", s.cliente_id)
      .limit(1);

    if (clientes?.[0] && clientes[0].cliente_dni !== query.dni) {
      throw new ForbiddenError("DNI incorrecto");
    }

    const { data: rows } = await supabase
      .from("evidencias")
      .select("*, comentariosevidencias(*)")
      .eq("servicio_id", s.servicio_id)
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

  // ── POST /api/public/evidencias/:id/comentario ──
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

    const s = (ev as any).servicios as { servicio_codigo: string; cliente_id?: number };
    if (s.servicio_codigo !== input.codigo) throw new ForbiddenError("Código de servicio incorrecto");

    // Validate DNI
    const { data: sv } = await supabase
      .from("servicios")
      .select("cliente_id, clientes!inner(cliente_dni)")
      .eq("servicio_id", ev.servicio_id)
      .limit(1);
    const clienteDni = (sv?.[0] as any)?.clientes?.cliente_dni;
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

// ── Mapper ──

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
  };
}
