/**
 * Script único: Asigna colaboradores a servicios sin técnico.
 * Distribuye round-robin por área.
 * Ejecutar: npx tsx src/scripts/assign-tecnicos.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log("🔎 Buscando servicios sin técnico...");

  // 1. Servicios sin técnico asignado
  const { data: servicios, error: errServ } = await supabase
    .from("servicios")
    .select("servicio_id, area_id")
    .is("tecnico_principal_id", null);

  if (errServ) throw errServ;
  if (!servicios?.length) {
    console.log("✅ Todos los servicios ya tienen técnico asignado.");
    return;
  }
  console.log(`   → ${servicios.length} servicios sin técnico`);

  // 2. Colaboradores activos por área
  const { data: areaCols, error: errAC } = await supabase
    .from("areacolaboradores")
    .select("area_id, colaborador_id, usuarios!areacolaboradores_colaborador_id_fkey(usuario_rol, usuario_activo)")
    .not("usuarios", "is", null);

  if (errAC) throw errAC;

  // Armar map: area_id → [colaborador_id, ...]
  const colsPorArea = new Map<number, number[]>();
  for (const ac of areaCols || []) {
    const u = ac.usuarios as any;
    if (u?.usuario_rol === "colaborador" && u?.usuario_activo !== false) {
      const list = colsPorArea.get(ac.area_id) || [];
      list.push(ac.colaborador_id);
      colsPorArea.set(ac.area_id, list);
    }
  }

  // Colaboradores sin área específica (fallback global)
  const { data: colsGlobal } = await supabase
    .from("usuarios")
    .select("usuario_id")
    .eq("usuario_rol", "colaborador")
    .eq("usuario_activo", true);

  const globalColIds = (colsGlobal || []).map((c: any) => c.usuario_id);

  console.log(`   → ${colsPorArea.size} áreas con colaboradores`);

  // 3. Asignar round-robin
  const counters = new Map<number, number>(); // area_id → next index
  let asignados = 0;

  for (const sv of servicios) {
    const areaId = sv.area_id;
    const pool = areaId ? colsPorArea.get(areaId) : undefined;

    // Usar pool del área, o fallback global
    const finalPool = (pool && pool.length > 0) ? pool : globalColIds;
    if (!finalPool || finalPool.length === 0) continue;

    const idx = (counters.get(areaId || 0) || 0) % finalPool.length;
    counters.set(areaId || 0, idx + 1);

    const { error: errUpd } = await supabase
      .from("servicios")
      .update({ tecnico_principal_id: finalPool[idx] })
      .eq("servicio_id", sv.servicio_id);

    if (errUpd) {
      console.error(`   ✗ Error en servicio ${sv.servicio_id}:`, errUpd.message);
    } else {
      asignados++;
    }
  }

  console.log(`✅ ${asignados} servicios actualizados con técnico.`);
  console.log(`   ${servicios.length - asignados} no se pudieron asignar (sin colaboradores disponibles).`);
}

main().catch(console.error);
