import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const r = await supabase
  .from("servicios")
  .select("servicio_id, colaborador_id")
  .limit(1);
console.log(
  "colaborador_id:",
  r.error ? `ERROR: ${r.error.message} (${r.error.code})` : "OK"
);
if (r.data) console.log("  ->", JSON.stringify(r.data));

const r2 = await supabase
  .from("servicios")
  .select("servicio_id, tecnico_principal_id")
  .limit(1);
console.log(
  "tecnico_principal_id:",
  r2.error ? `ERROR: ${r2.error.message} (${r2.error.code})` : "OK"
);
if (r2.data) console.log("  ->", JSON.stringify(r2.data));

// Also check the FK name used in select
const r3 = await supabase
  .from("servicios")
  .select("*, usuario_colaborador:usuarios!colaborador_id(usuario_nombres)")
  .limit(1);
console.log(
  "FK colaborador_id:",
  r3.error ? `ERROR: ${r3.error.message}` : "OK"
);

const r4 = await supabase
  .from("servicios")
  .select("*, usuario_colaborador:usuarios!tecnico_principal_id(usuario_nombres)")
  .limit(1);
console.log(
  "FK tecnico_principal_id:",
  r4.error ? `ERROR: ${r4.error.message}` : "OK"
);
