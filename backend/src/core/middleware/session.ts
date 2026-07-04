import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { UnauthorizedError, SessionRevokedError } from "@/core/errors/index.js";

interface CacheEntry {
  revoked: boolean;
  expired: boolean;
  cachedAt: number;
}

/**
 * Cache en memoria para verificación de sesiones.
 * Cada entrada tiene TTL individual de 30 segundos.
 * Límite de 5000 entradas para evitar memory leak.
 *
 * NOTA: revoked y expired se cachean por separado para NO confundir
 * una sesión expirada con una revocada (bug: se cacheaba `revoked || expired`
 * como un solo campo, causando SessionRevokedError en sesiones simplemente expiradas).
 */
const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 segundos
const CACHE_MAX_SIZE = 5000;

/**
 * Invalida una entrada específica del cache de sesión.
 * Útil para llamar después de revocar una sesión.
 */
export function invalidateSessionCache(jti: string): void {
  sessionCache.delete(jti);
}

/**
 * Middleware que verifica que la sesión del usuario no esté revocada ni expirada.
 *
 * - Extrae `jti` de `request.user` (inyectado por JWT verify).
 * - Cache hit (TTL 30s): retorna resultado cacheado.
 * - Cache miss: consulta `sessions` en DB por `revoked` y `expires_at`.
 * - Si `revoked = true`: lanza SessionRevokedError.
 * - Si `expires_at < NOW()`: lanza UnauthorizedError("Sesión expirada").
 * - Si no hay `jti` en el payload (tokens pre-feature): skip (backward compat).
 * - Si falla la consulta a DB: fail open (permite el request).
 */
export async function verifySession(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const user = request.user as { jti?: string } | undefined;

  // Skip si no hay jti (backward compat con tokens anteriores al feature)
  if (!user?.jti) return;

  // Cache hit
  const cached = sessionCache.get(user.jti);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    if (cached.revoked) {
      throw new SessionRevokedError();
    }
    if (cached.expired) {
      throw new UnauthorizedError("Sesión expirada");
    }
    return;
  }

  // Cache miss — consultar DB
  let revoked = false;
  let expired = false;

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("revoked, expires_at")
      .eq("token_jti", user.jti)
      .limit(1);

    if (error) {
      // Fail open: si la consulta falla, permitir acceso
      return;
    }

    if (!data?.[0]) {
      // Sesión no encontrada en DB — permitir (puede ser cleanup TTL)
      return;
    }

    revoked = data[0].revoked ?? false;
    expired = new Date(data[0].expires_at) < new Date();

    // Cache management: evitar crecimiento infinito
    if (sessionCache.size >= CACHE_MAX_SIZE) {
      sessionCache.clear();
    }
    sessionCache.set(user.jti, {
      revoked,
      expired,
      cachedAt: Date.now(),
    });
  } catch {
    // Fail open en errores inesperados
    return;
  }

  if (expired) {
    throw new UnauthorizedError("Sesión expirada");
  }
  if (revoked) {
    throw new SessionRevokedError();
  }
}

/**
 * Verifica que la sesión no esté revocada, ignorando expiración.
 * NO usa el cache compartido con verifySession (que mezcla revoked+expired).
 * Solo se llama desde /auth/refresh, así que no necesita cache agresivo.
 */
export async function checkSessionNotRevoked(
  request: FastifyRequest
): Promise<void> {
  const user = request.user as { jti?: string } | undefined;
  if (!user?.jti) return;

  let revoked = false;
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("revoked")
      .eq("token_jti", user.jti)
      .limit(1);

    if (error || !data?.[0]) return;
    revoked = data[0].revoked ?? false;
  } catch {
    return;
  }

  if (revoked) throw new SessionRevokedError();
}
