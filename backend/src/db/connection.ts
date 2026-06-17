/**
 * Database connection -- Supabase JS client con service_role key.
 *
 * Todos los módulos importan `{ db }` desde aquí y usan la API de supabase-js:
 *
 *   const { data } = await db.from("usuarios").select("*").eq("usuario_id", id);
 *   const { data } = await db.from("areas").insert({ area_nombre: "..." }).select();
 *   const { data } = await db.from("tareas").update({ tarea_estado: "completado" }).eq("tarea_id", id);
 */

export { supabase as db } from "@/lib/supabase.js";
