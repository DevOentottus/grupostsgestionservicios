import { supabase } from "../lib/supabase.js";

const LOGIN_ATTEMPTS_TTL_DAYS = 90;
const SESSIONS_TTL_DAYS = 30;

export async function cleanupSeguridad(): Promise<{ login_attempts: number; sessions: number }> {
  const cutoffLogin = new Date();
  cutoffLogin.setDate(cutoffLogin.getDate() - LOGIN_ATTEMPTS_TTL_DAYS);

  const cutoffSessions = new Date();
  cutoffSessions.setDate(cutoffSessions.getDate() - SESSIONS_TTL_DAYS);

  // Eliminar login_attempts más viejos que 90 días
  const { data: deletedLogin } = await supabase
    .from("login_attempts")
    .delete()
    .lt("created_at", cutoffLogin.toISOString())
    .select("id");

  // Eliminar sesiones expiradas más viejas que 30 días
  const { data: deletedSessions } = await supabase
    .from("sessions")
    .delete()
    .lt("expires_at", cutoffSessions.toISOString());

  return {
    login_attempts: deletedLogin?.length || 0,
    sessions: deletedSessions?.length || 0,
  };
}

// Ejecución directa: node dist/scripts/cleanup-seguridad.js
const isMain = process.argv[1]?.includes("cleanup-seguridad");
if (isMain) {
  cleanupSeguridad()
    .then((r) => {
      console.log(
        `Cleanup completado: ${r.login_attempts} login_attempts, ${r.sessions} sessions eliminados`
      );
      process.exit(0);
    })
    .catch((e) => {
      console.error("Error en cleanup:", e);
      process.exit(1);
    });
}
