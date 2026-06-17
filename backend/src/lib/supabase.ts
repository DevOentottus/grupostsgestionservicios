import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas en el entorno");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Re-exportado para tipar updates parciales en controllers
export type { TablesUpdate } from "./database.types.js";
