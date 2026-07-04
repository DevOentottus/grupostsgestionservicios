import { supabase } from "@/lib/supabase.js";
import { config } from "@/core/config/index.js";
import { invalidateSessionCache } from "@/core/middleware/session.js";
import type {
  SeguridadResumen,
  LoginAttempt,
  SesionActiva,
  ActividadSospechosa,
  PaginationMeta,
} from "../../../../shared/types/index.js";

// ──────────────────────────────────────────────
// 1. getResumen
// ──────────────────────────────────────────────

export async function getResumen(): Promise<SeguridadResumen> {
  const jwtOk = config.jwt.secret !== "dev-secret-servicio-local-sts-2026";
  const corsOk = config.cors.origin !== "*" && config.cors.origin !== "";

  let loginTrackingOk = false;
  try {
    const { error } = await supabase
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .limit(1);
    loginTrackingOk = !error;
  } catch {
    loginTrackingOk = false;
  }

  return {
    https: {
      status: config.isDev ? "warning" : "ok",
      detalle: config.isDev ? "Entorno de desarrollo" : "Producción",
    },
    jwt: {
      status: jwtOk ? "ok" : "warning",
      detalle: jwtOk
        ? `Expira en ${config.jwt.expiresIn}`
        : "Usando secret por defecto",
    },
    cors: {
      status: corsOk ? "ok" : "warning",
      detalle: corsOk ? config.cors.origin : "CORS no configurado",
    },
    rls: {
      status: "warning",
      detalle: "Verificar manualmente en panel de Supabase",
    },
    rate_limit: {
      status: "ok",
      detalle: "100 req/min por IP (excluye /auth/login)",
    },
    login_tracking: {
      status: loginTrackingOk ? "ok" : "error",
      detalle: loginTrackingOk
        ? "Activo"
        : "Tabla login_attempts no disponible",
    },
  };
}

// ──────────────────────────────────────────────
// 2. getIntentosFallidos
// ──────────────────────────────────────────────

export async function getIntentosFallidos(
  page: number,
  limit: number,
  desde?: string,
  hasta?: string,
  username?: string
): Promise<{ data: LoginAttempt[]; meta: PaginationMeta }> {
  const offset = (page - 1) * limit;

  let query = supabase
    .from("login_attempts")
    .select(
      `
      *,
      usuarios!login_attempts_usuario_id_fkey (
        usuario_id,
        usuario_nombres,
        usuario_username
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (desde) query = query.gte("created_at", desde);
  if (hasta) query = query.lte("created_at", hasta);
  if (username) query = query.ilike("username_intentado", `%${username}%`);

  const { data, count } = await query.range(offset, offset + limit - 1);

  const mapped: LoginAttempt[] = (data || []).map((r: any) => ({
    id: r.id,
    usuario_id: r.usuario_id,
    username_intentado: r.username_intentado,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    exito: r.exito,
    created_at: r.created_at,
    usuario: r.usuarios
      ? {
          id: r.usuarios.usuario_id,
          nombres: r.usuarios.usuario_nombres,
          username: r.usuarios.usuario_username,
        }
      : null,
  }));

  return {
    data: mapped,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ──────────────────────────────────────────────
// 3. getSesiones
// ──────────────────────────────────────────────

export async function getSesiones(
  page: number,
  limit: number
): Promise<{ data: SesionActiva[]; meta: PaginationMeta }> {
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from("sessions")
    .select(
      `
      *,
      usuarios!sessions_user_id_fkey (
        usuario_id,
        usuario_nombres,
        usuario_username
      )
    `,
      { count: "exact" }
    )
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const mapped: SesionActiva[] = (data || []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    token_jti: r.token_jti,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    created_at: r.created_at,
    expires_at: r.expires_at,
    last_activity: r.last_activity,
    revoked: r.revoked,
    usuario: r.usuarios
      ? {
          id: r.usuarios.usuario_id,
          nombres: r.usuarios.usuario_nombres,
          username: r.usuarios.usuario_username,
        }
      : null,
  }));

  return {
    data: mapped,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ──────────────────────────────────────────────
// 4. revocarSesion
// ──────────────────────────────────────────────

export async function revocarSesion(sessionId: number): Promise<void> {
  // Obtener jti antes de revocar para invalidar caché
  const { data } = await supabase
    .from("sessions")
    .select("token_jti")
    .eq("id", sessionId)
    .limit(1);

  await supabase
    .from("sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Invalidar caché de sesión
  if (data?.[0]?.token_jti) {
    invalidateSessionCache(data[0].token_jti);
  }
}

// ──────────────────────────────────────────────
// 5. getActividadSospechosa
// ──────────────────────────────────────────────

export async function getActividadSospechosa(
  page: number,
  limit: number
): Promise<{ data: ActividadSospechosa[]; meta: PaginationMeta }> {
  const alertas: ActividadSospechosa[] = [];

  // --- Regla 1: Fuerza bruta (>5 fallos/5min misma IP+username) ---
  const cincoMinAtras = new Date(
    Date.now() - 5 * 60 * 1000
  ).toISOString();

  const { data: bruteForceData } = await supabase
    .from("login_attempts")
    .select("username_intentado, ip_address")
    .eq("exito", false)
    .gte("created_at", cincoMinAtras);

  if (bruteForceData && bruteForceData.length > 0) {
    const grupos = new Map<string, { username: string; ip: string; count: number }>();

    for (const r of bruteForceData) {
      const key = `${r.username_intentado}|${r.ip_address || "unknown"}`;
      const existente = grupos.get(key) || {
        username: r.username_intentado,
        ip: r.ip_address || "unknown",
        count: 0,
      };
      existente.count++;
      grupos.set(key, existente);
    }

    for (const grupo of grupos.values()) {
      if (grupo.count > 5) {
        alertas.push({
          id: `brute-force-${grupo.username}-${grupo.ip}`,
          tipo: "brute_force",
          severidad: "critica",
          descripcion: `Posible ataque de fuerza bruta desde ${grupo.ip}: ${grupo.count} intentos fallidos para "${grupo.username}" en los últimos 5 minutos`,
          timestamp: new Date().toISOString(),
          datos: {
            username: grupo.username,
            ip_address: grupo.ip,
            intentos: grupo.count,
            ventana_minutos: 5,
          },
        });
      }
    }
  }

  // --- Regla 2: Fuera de horario (login exitoso entre 22:00-06:00) ---
  const { data: fueraHorarioData } = await supabase
    .from("login_attempts")
    .select("id, username_intentado, ip_address, created_at")
    .eq("exito", true)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (fueraHorarioData) {
    for (const r of fueraHorarioData) {
      const hora = new Date(r.created_at ?? new Date().toISOString()).getHours();
      if (hora < 6 || hora >= 22) {
        alertas.push({
          id: `fuera-horario-${r.id}`,
          tipo: "fuera_horario",
          severidad: "media",
          descripcion: `Inicio de sesión fuera del horario laboral: "${r.username_intentado}" a las ${hora.toString().padStart(2, "0")}:00 desde ${r.ip_address || "IP desconocida"}`,
          timestamp: r.created_at ?? new Date().toISOString(),
          datos: {
            username: r.username_intentado,
            ip_address: r.ip_address,
            hora,
          },
        });
      }
    }
  }

  // --- Regla 3: Escalada de privilegios (cambios de rol en auditoria) ---
  const { data: escaladaData } = await supabase
    .from("auditoria")
    .select(
      `
      auditoria_id,
      usuario_id,
      auditoria_accion,
      auditoria_detalle,
      auditoria_fecha,
      usuarios!auditoria_usuario_id_fkey (
        usuario_nombres,
        usuario_username
      )
    `
    )
    .eq("auditoria_tabla", "usuarios")
    .eq("auditoria_accion", "UPDATE")
    .gte("auditoria_fecha", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("auditoria_id", { ascending: false })
    .limit(50);

  if (escaladaData) {
    for (const r of escaladaData) {
      const detalle = r.auditoria_detalle as Record<string, unknown> | null;
      if (
        detalle &&
        (typeof detalle.rol !== "undefined" ||
          (typeof detalle.campo === "string" &&
            detalle.campo.toLowerCase().includes("rol")) ||
          (typeof detalle.accion === "string" &&
            detalle.accion.toLowerCase().includes("rol")))
      ) {
        alertas.push({
          id: `escalada-${r.auditoria_id}`,
          tipo: "escalada_privilegios",
          severidad: "critica",
          descripcion: `Cambio de rol detectado: ${r.usuarios?.usuario_nombres || `usuario #${r.usuario_id}`} — ${JSON.stringify(detalle)}`,
          timestamp: r.auditoria_fecha,
          datos: {
            usuario_id: r.usuario_id,
            detalle,
          },
        });
      }
    }
  }

  // --- Regla 4: Múltiples IPs (>3 IPs distintas en 1h mismo usuario) ---
  const unaHoraAtras = new Date(
    Date.now() - 60 * 60 * 1000
  ).toISOString();

  const { data: multiIpData } = await supabase
    .from("sessions")
    .select("user_id, ip_address")
    .gte("last_activity", unaHoraAtras);

  if (multiIpData && multiIpData.length > 0) {
    const ipsPorUsuario = new Map<number, Set<string>>();

    for (const r of multiIpData) {
      if (!r.ip_address) continue;
      if (!ipsPorUsuario.has(r.user_id)) {
        ipsPorUsuario.set(r.user_id, new Set());
      }
      ipsPorUsuario.get(r.user_id)!.add(r.ip_address);
    }

    for (const [userId, ips] of ipsPorUsuario.entries()) {
      if (ips.size > 3) {
        alertas.push({
          id: `multi-ip-${userId}`,
          tipo: "multi_ip",
          severidad: "media",
          descripcion: `Usuario #${userId} ha iniciado sesión desde ${ips.size} direcciones IP distintas en la última hora`,
          timestamp: new Date().toISOString(),
          datos: {
            usuario_id: userId,
            ips_distintas: Array.from(ips),
            cantidad: ips.size,
          },
        });
      }
    }
  }

  // Ordenar: críticas primero, luego media, luego informativa
  const ordenSeveridad: Record<string, number> = {
    critica: 0,
    media: 1,
    informativa: 2,
  };
  alertas.sort(
    (a, b) => (ordenSeveridad[a.severidad] ?? 9) - (ordenSeveridad[b.severidad] ?? 9)
  );

  // Paginación simple sobre el array resultante
  const total = alertas.length;
  const offset = (page - 1) * limit;
  const paginated = alertas.slice(offset, offset + limit);

  return {
    data: paginated,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ──────────────────────────────────────────────
// 6. exportarLogs
// ──────────────────────────────────────────────

export async function exportarLogs(
  tipo: string,
  desde?: string,
  hasta?: string
): Promise<Record<string, unknown>[]> {
  if (tipo === "intentos-fallidos" || tipo === "csv") {
    let query = supabase
      .from("login_attempts")
      .select(
        `
        *,
        usuarios!login_attempts_usuario_id_fkey (
          usuario_nombres,
          usuario_username
        )
      `
      )
      .order("created_at", { ascending: false });

    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta);

    const { data } = await query;
    return (data || []).map((r: any) => ({
      id: r.id,
      username: r.username_intentado,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      exito: r.exito,
      created_at: r.created_at,
      usuario_nombre: r.usuarios?.usuario_nombres || null,
    }));
  }

  if (tipo === "sesiones") {
    let query = supabase
      .from("sessions")
      .select(
        `
        *,
        usuarios!sessions_user_id_fkey (
          usuario_nombres,
          usuario_username
        )
      `
      )
      .order("created_at", { ascending: false });

    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta);

    const { data } = await query;
    return (data || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      usuario_nombre: r.usuarios?.usuario_nombres || null,
      usuario_username: r.usuarios?.usuario_username || null,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      created_at: r.created_at,
      expires_at: r.expires_at,
      last_activity: r.last_activity,
      revoked: r.revoked,
    }));
  }

  if (tipo === "actividad-sospechosa") {
    const { data: alertas } = await getActividadSospechosa(1, 1000);
    return alertas.map((a) => ({
      ...a,
    }));
  }

  return [];
}
