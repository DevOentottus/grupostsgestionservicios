import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const { data, error } = await supabase.from("servicios").select("*").limit(1);
if (error) {
  console.log("ERROR:", error.message, error.code, error.details);
  process.exit(1);
}
if (data && data[0]) {
  console.log("Columnas:", Object.keys(data[0]).join(", "));
} else {
  console.log("Tabla vacía, verificando solo servicio_id...");
  const { data: d2, error: e2 } = await supabase
    .from("servicios")
    .select("servicio_id")
    .limit(1);
  if (e2) console.log("ERROR simple:", e2.message, e2.code);
  else console.log("OK, tabla existe. d2:", JSON.stringify(d2));
}
