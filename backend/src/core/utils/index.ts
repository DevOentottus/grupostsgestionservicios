import { supabase } from "@/lib/supabase.js";
import type { Json } from "@/lib/database.types.js";

/**
 * Inserta un registro de auditoría.
 * NOTA: el primer parámetro `_db` se ignora -- se usa `supabase` directamente.
 * Se mantiene la firma para no romper las llamadas existentes.
 */
export async function auditLog(
  _db: unknown,
  usuario_id: number | null,
  accion: string,
  entidad: string,
  entidad_id: number | null,
  detalle?: Json | null
) {
  const now = new Date();
  await supabase.from("auditoria").insert({
    usuario_id,
    auditoria_accion: accion,
    auditoria_tabla: entidad,
    auditoria_registro_id: entidad_id,
    auditoria_detalle: detalle ?? null,
    auditoria_fecha: now.toISOString().split("T")[0],
    auditoria_hora: now.toTimeString().split(" ")[0],
  });
}

/**
 * Genera un nombre de usuario a partir de nombres y apellidos.
 *
 * 1. Normaliza NFKD (quita diacríticos: ñ, á, é, í, ó, ú, ü → n, a, e, i, o, u, u)
 * 2. Convierte a minúsculas
 * 3. Elimina caracteres no alfanuméricos (excepto puntos)
 * 4. Toma el primer nombre + primer apellido separados por punto
 * 5. Si hay colisión, añade sufijo numérico (ej: jose.garcia.2)
 *
 * @param nombres Nombres completos (ej: "José María")
 * @param apellidos Apellidos completos (ej: "García López")
 * @param existingUsernames Lista de usernames existentes para detectar colisiones
 * @returns Nombre de usuario generado
 */
export function generarUsername(
  nombres: string,
  apellidos: string,
  existingUsernames: string[] = []
): string {
  // Normalizar NFKD y eliminar diacríticos
  const normalize = (s: string): string =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // Elimina combining diacritical marks
      .replace(/ñ/g, "n")
      .replace(/Ñ/g, "N");

  // Limpiar: minúsculas, solo alfanuméricos y espacios
  const clean = (s: string): string =>
    normalize(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const nombresClean = clean(nombres);
  const apellidosClean = clean(apellidos);

  const primerNombre = nombresClean.split(/\s+/)[0] || "usuario";
  const primerApellido = apellidosClean.split(/\s+/)[0] || "sinapellido";

  let base = `${primerNombre}.${primerApellido}`;
  let username = base;
  let counter = 1;

  while (existingUsernames.includes(username)) {
    counter++;
    username = `${base}.${counter}`;
  }

  return username;
}
