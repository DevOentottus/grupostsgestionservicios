import postgres from "postgres";

const sql = postgres("postgres://postgres:postgres@localhost:5432/postgres", { max: 1 });

try {
  await sql`CREATE DATABASE servicio_local_sts`;
  console.log("✅ Base de datos creada");
} catch (e) {
  if (e.message.includes("already exists")) {
    console.log("ℹ️  La base de datos ya existe");
  } else {
    console.error("❌ Error:", e.message);
  }
}

await sql.end();
