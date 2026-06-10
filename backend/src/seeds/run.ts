import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";

async function seed() {
  console.log("🌱 Sembrando datos...");

  // ── Admin por defecto ──
  const adminHash = bcrypt.hashSync("admin123", 10);
  const [admin] = await db
    .insert(schema.usuarios)
    .values({
      username: "admin",
      password_hash: adminHash,
      nombres: "Administrador",
      email: "admin@serviciolocalsts.com",
      rol: "admin",
      apellidos: "Sistema",
    })
    .onConflictDoNothing()
    .returning();
  if (admin) console.log("✅ Admin creado: admin / admin123");

  // ── Usuarios de prueba ──
  const userHash = bcrypt.hashSync("123456", 10);

  const usersData = [
    {
      username: "carlos.garcia",
      nombres: "Carlos",
      apellidos: "García Mendoza",
      email: "carlos@serviciolocalsts.com",
      rol: "encargado" as const,
    },
    {
      username: "maria.lopez",
      nombres: "María",
      apellidos: "López Fernández",
      email: "maria@serviciolocalsts.com",
      rol: "encargado" as const,
    },
    {
      username: "jose.ramirez",
      nombres: "José",
      apellidos: "Ramírez Torres",
      email: "jose@serviciolocalsts.com",
      rol: "colaborador" as const,
    },
    {
      username: "ana.martinez",
      nombres: "Ana",
      apellidos: "Martínez Ruiz",
      email: "ana@serviciolocalsts.com",
      rol: "colaborador" as const,
    },
    {
      username: "luis.fernandez",
      nombres: "Luis",
      apellidos: "Fernández Silva",
      email: "luis@serviciolocalsts.com",
      rol: "colaborador" as const,
    },
    {
      username: "demo",
      nombres: "Usuario Demo",
      apellidos: "Demo del Sistema",
      email: "demo@serviciolocalsts.com",
      rol: "colaborador" as const,
    },
  ];

  const createdUsers: any[] = [];
  for (const u of usersData) {
    const [user] = await db
      .insert(schema.usuarios)
      .values({
        username: u.username,
        password_hash: userHash,
        nombres: u.nombres,
        apellidos: u.apellidos,
        email: u.email,
        rol: u.rol,
      })
      .onConflictDoNothing()
      .returning();
    if (user) {
      createdUsers.push(user);
      console.log(`✅ Usuario creado: ${u.username} / 123456`);
    }
  }

  // ── Áreas ──
  const areasData = [
    {
      nombre: "Soporte Técnico",
      encargadoKey: "carlos.garcia",
    },
    {
      nombre: "Instalaciones",
      encargadoKey: "maria.lopez",
    },
    {
      nombre: "Mantenimiento",
      encargadoKey: null,
    },
    {
      nombre: "Desarrollo",
      encargadoKey: null,
    },
  ];

  const createdAreas: any[] = [];
  for (const a of areasData) {
    let encargadoId: number | null = null;
    if (a.encargadoKey) {
      const enc = createdUsers.find((u) => u.username === a.encargadoKey);
      encargadoId = enc?.id ?? null;
    }

    const [area] = await db
      .insert(schema.areas)
      .values({
        nombre: a.nombre,
        encargado_id: encargadoId,
      })
      .onConflictDoNothing()
      .returning();

    if (area) {
      createdAreas.push(area);
      console.log(`✅ Área creada: ${a.nombre}`);
    }
  }

  // ── Asignar colaboradores a áreas ──
  if (createdAreas.length > 0 && createdUsers.length > 0) {
    const soporte = createdAreas.find((a) => a.nombre === "Soporte Técnico");
    const instalaciones = createdAreas.find(
      (a) => a.nombre === "Instalaciones"
    );
    const mantenimiento = createdAreas.find((a) => a.nombre === "Mantenimiento");
    const desarrollo = createdAreas.find((a) => a.nombre === "Desarrollo");

    const jose = createdUsers.find((u) => u.username === "jose.ramirez");
    const ana = createdUsers.find((u) => u.username === "ana.martinez");
    const luis = createdUsers.find((u) => u.username === "luis.fernandez");
    const demo = createdUsers.find((u) => u.username === "demo");

    if (soporte && jose) {
      await db
        .insert(schema.areas_colaboradores)
        .values({ area_id: soporte.id, usuario_id: jose.id })
        .onConflictDoNothing();
      console.log(`  → ${jose.nombres} asignado a ${soporte.nombre}`);
    }
    if (soporte && luis) {
      await db
        .insert(schema.areas_colaboradores)
        .values({ area_id: soporte.id, usuario_id: luis.id })
        .onConflictDoNothing();
      console.log(`  → ${luis.nombres} asignado a ${soporte.nombre}`);
    }
    if (instalaciones && ana) {
      await db
        .insert(schema.areas_colaboradores)
        .values({ area_id: instalaciones.id, usuario_id: ana.id })
        .onConflictDoNothing();
      console.log(`  → ${ana.nombres} asignado a ${instalaciones.nombre}`);
    }
    if (mantenimiento && jose) {
      await db
        .insert(schema.areas_colaboradores)
        .values({ area_id: mantenimiento.id, usuario_id: jose.id })
        .onConflictDoNothing();
      console.log(`  → ${jose.nombres} asignado a ${mantenimiento.nombre}`);
    }
    if (desarrollo && demo) {
      await db
        .insert(schema.areas_colaboradores)
        .values({ area_id: desarrollo.id, usuario_id: demo.id })
        .onConflictDoNothing();
      console.log(`  → ${demo.nombres} asignado a ${desarrollo.nombre}`);
    }
  }

  // ── Actualizar area_id de usuarios según su área ──
  if (createdAreas.length > 0 && createdUsers.length > 0) {
    const soporte = createdAreas.find((a) => a.nombre === "Soporte Técnico");
    const instalaciones = createdAreas.find(
      (a) => a.nombre === "Instalaciones"
    );

    // Asignar encargados a sus áreas
    const carlos = createdUsers.find((u) => u.username === "carlos.garcia");
    if (soporte && carlos) {
      await db
        .update(schema.usuarios)
        .set({ area_id: soporte.id })
        .where(eq(schema.usuarios.id, carlos.id));
    }
    const maria = createdUsers.find((u) => u.username === "maria.lopez");
    if (instalaciones && maria) {
      await db
        .update(schema.usuarios)
        .set({ area_id: instalaciones.id })
        .where(eq(schema.usuarios.id, maria.id));
    }

    // Asignar colaboradores a su área principal
    const jose = createdUsers.find((u) => u.username === "jose.ramirez");
    if (soporte && jose) {
      await db
        .update(schema.usuarios)
        .set({ area_id: soporte.id })
        .where(eq(schema.usuarios.id, jose.id));
    }
    const luis = createdUsers.find((u) => u.username === "luis.fernandez");
    if (soporte && luis) {
      await db
        .update(schema.usuarios)
        .set({ area_id: soporte.id })
        .where(eq(schema.usuarios.id, luis.id));
    }
    const ana = createdUsers.find((u) => u.username === "ana.martinez");
    if (instalaciones && ana) {
      await db
        .update(schema.usuarios)
        .set({ area_id: instalaciones.id })
        .where(eq(schema.usuarios.id, ana.id));
    }
  }

  console.log("🎉 Seed completado");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
