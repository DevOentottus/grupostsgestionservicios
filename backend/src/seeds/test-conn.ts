import postgres from "postgres";

const PW = "lacontrasena.P3";
const REF = "soivnjbuhxowucgcprxc";

// Try pooler (transaction mode)
const url1 = `postgres://postgres.${REF}:${encodeURIComponent(PW)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
// Try pooler (session mode)
const url2 = `postgres://postgres.${REF}:${encodeURIComponent(PW)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
// Try direct
const url3 = `postgres://postgres:${encodeURIComponent(PW)}@db.${REF}.supabase.co:5432/postgres`;

async function tryConnect(label: string, url: string) {
  const sql = postgres(url, { max: 1, timeout: 10, idle_timeout: 10 });
  try {
    const r = await sql`SELECT 1 AS ok, current_database() AS db, version() AS ver LIMIT 1`;
    console.log(`✅ ${label}:`, JSON.stringify(r[0]));
    await sql.end();
    return true;
  } catch (e: any) {
    console.log(`❌ ${label}: ${e.message?.slice(0, 120)}`);
    try { await sql.end(); } catch {}
    return false;
  }
}

const results = await Promise.all([
  tryConnect("pooler (transaction)", url1),
  tryConnect("pooler (session)", url2),
  tryConnect("direct", url3),
]);

console.log(`\nResultados: ${results.filter(Boolean).length}/3 exitosos`);
process.exit(0);
