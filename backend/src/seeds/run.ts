import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db/connection.js";

async function seed() {
  console.log("🌱 Sembrando datos...");

  // Admin por defecto
  const adminHash = bcrypt.hashSync("admin123", 10);
  const [admin] = await db
    .insert(schema.usuarios)
    .values({
      username: "admin",
      password_hash: adminHash,
      nombres: "Administrador",
      email: "admin@serviciolocalsts.com",
      rol: "admin",
    })
    .onConflictDoNothing()
    .returning();
  if (admin) console.log("✅ Admin creado: admin / admin123");

  // Usuario de prueba
  const userHash = bcrypt.hashSync("123456", 10);
  const [demo] = await db
    .insert(schema.usuarios)
    .values({
      username: "demo",
      password_hash: userHash,
      nombres: "Usuario Demo",
      email: "demo@serviciolocalsts.com",
      rol: "colaborador",
    })
    .onConflictDoNothing()
    .returning();
  if (demo) console.log("✅ Demo creado: demo / 123456");

  console.log("🎉 Seed completado");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
