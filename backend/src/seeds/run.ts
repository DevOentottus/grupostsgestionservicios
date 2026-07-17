import "dotenv/config";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";

// --- Date/time helpers ------------------------------------------------

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}
function todayTime(): string {
  return new Date().toTimeString().split(" ")[0];
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// --- Safe insert (handles duplicates gracefully) ----------------------

async function insertSafe(
  table: string,
  values: Record<string, unknown>,
  label: string,
): Promise<any> {
  const { data, error } = await supabase.from(table as any).insert(values as any).select();
  if (error) {
    if (error.code === "23505") {
      console.log(`  ⚠️  ${label} -- ya existe, ignorado`);
      return null;
    }
    console.error(`  ❌ Error al insertar ${label}:`, error.message);
    throw error;
  }
  return data?.[0] ?? null;
}

// --- Main seed ---------------------------------------------------------

async function seed() {
  console.log("🌱 Iniciando seed de ServicioLocalSTS…\n");

  const td = todayDate();
  const tt = todayTime();

  // -- 1. Hash passwords ----------------------------------------------
  console.log("🔑 Generando hashes de contraseñas…");
  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("123456", 10),
  ]);
  console.log("  ✅ Hashes generados\n");

  // -- 2. Usuarios ----------------------------------------------------
  console.log("👤 Insertando usuarios…");

  const usersData = [
    {
      username: "admin",
      hash: adminHash,
      nombres: "Administrador",
      apellido_paterno: "Sistema",
      apellido_materno: null,
      dni: null,
      telefono: null,
      correo: "admin@serviciolocalsts.com",
      rol: "admin",
    },
    {
      username: "sistema",
      hash: adminHash,
      nombres: "Admin del Sistema",
      apellido_paterno: "Sistema",
      apellido_materno: null,
      dni: null,
      telefono: null,
      correo: "sistema@serviciolocalsts.com",
      rol: "sistema",
    },
    {
      username: "carlos.garcia",
      hash: userHash,
      nombres: "Carlos",
      apellido_paterno: "García",
      apellido_materno: "Mendoza",
      dni: "12345678",
      telefono: "987654321",
      correo: "carlos@serviciolocalsts.com",
      rol: "encargado",
    },
    {
      username: "maria.lopez",
      hash: userHash,
      nombres: "María",
      apellido_paterno: "López",
      apellido_materno: "Fernández",
      dni: "23456789",
      telefono: "987654322",
      correo: "maria@serviciolocalsts.com",
      rol: "encargado",
    },
    {
      username: "jose.ramirez",
      hash: userHash,
      nombres: "José",
      apellido_paterno: "Ramírez",
      apellido_materno: "Torres",
      dni: "34567890",
      telefono: "987654323",
      correo: "jose@serviciolocalsts.com",
      rol: "colaborador",
    },
    {
      username: "ana.martinez",
      hash: userHash,
      nombres: "Ana",
      apellido_paterno: "Martínez",
      apellido_materno: "Ruiz",
      dni: "45678901",
      telefono: "987654324",
      correo: "ana@serviciolocalsts.com",
      rol: "colaborador",
    },
    {
      username: "luis.fernandez",
      hash: userHash,
      nombres: "Luis",
      apellido_paterno: "Fernández",
      apellido_materno: "Silva",
      dni: "56789012",
      telefono: "987654325",
      correo: "luis@serviciolocalsts.com",
      rol: "colaborador",
    },
    {
      username: "demo",
      hash: userHash,
      nombres: "Usuario Demo",
      apellido_paterno: "Demo",
      apellido_materno: "del Sistema",
      dni: "67890123",
      telefono: "987654326",
      correo: "demo@serviciolocalsts.com",
      rol: "colaborador",
    },
    {
      username: "roberto.quispe",
      hash: userHash,
      nombres: "Roberto",
      apellido_paterno: "Quispe",
      apellido_materno: "Huamán",
      dni: "78901234",
      telefono: "987654327",
      correo: "roberto@serviciolocalsts.com",
      rol: "colaborador",
    },
    // Colaboradores sin área asignada (disponibles para asignar)
    {
      username: "sofia.vega",
      hash: userHash,
      nombres: "Sofía",
      apellido_paterno: "Vega",
      apellido_materno: "Ríos",
      dni: "89012345",
      telefono: "987654328",
      correo: "sofia@serviciolocalsts.com",
      rol: "colaborador",
    },
    {
      username: "diego.paredes",
      hash: userHash,
      nombres: "Diego",
      apellido_paterno: "Paredes",
      apellido_materno: "Luna",
      dni: "90123456",
      telefono: "987654329",
      correo: "diego@serviciolocalsts.com",
      rol: "colaborador",
    },
  ];

  const userMap = new Map<string, any>();

  const userPromises = usersData.map((u) =>
    insertSafe(
      "usuarios",
      {
        usuario_username: u.username,
        usuario_contrasena: u.hash,
        usuario_nombres: u.nombres,
        usuario_apellido_paterno: u.apellido_paterno,
        usuario_apellido_materno: u.apellido_materno,
        usuario_dni: u.dni,
        usuario_telefono: u.telefono,
        usuario_correo: u.correo,
        usuario_rol: u.rol,
        usuario_activo: true,
        usuario_fecha_creacion: td,
        usuario_hora_creacion: tt,
      },
      `usuario ${u.username}`,
    ).then(async (row) => {
      if (row) {
        userMap.set(u.username, row);
        const pwd = u.username === "admin" ? "admin123" : "123456";
        console.log(`  ✅ Usuario creado: ${u.username} / ${pwd}`);
        return;
      }
      // Duplicate -- fetch existing record so we have the ID
      const { data } = await supabase
        .from("usuarios")
        .select()
        .eq("usuario_username", u.username)
        .single();
      if (data) {
        userMap.set(u.username, data);
        console.log(`  📌 Usuario existente recuperado: ${u.username}`);
      }
    }),
  );

  await Promise.all(userPromises);
  console.log(`  📊 Total usuarios registrados: ${userMap.size}\n`);

  // -- 3. Áreas --------------------------------------------------------
  console.log("🏢 Insertando áreas…");

  const areasData = [
    { nombre: "Computadoras e impresoras", encargadoKey: "carlos.garcia" },
    { nombre: "Televisores", encargadoKey: "maria.lopez" },
  ];

  const areaMap = new Map<string, any>();

  const areaPromises = areasData.map((a) => {
    const encargadoId = a.encargadoKey
      ? userMap.get(a.encargadoKey)?.usuario_id ?? null
      : null;
    return insertSafe(
      "areas",
      {
        area_nombre: a.nombre,
        area_encargado_id: encargadoId,
        area_fecha_creacion: td,
      },
      `área ${a.nombre}`,
    ).then((row) => {
      if (row) {
        areaMap.set(a.nombre, row);
        console.log(`  ✅ Área creada: ${a.nombre}`);
      }
    });
  });

  await Promise.all(areaPromises);
  console.log(`  📊 Total áreas registradas: ${areaMap.size}\n`);

  // -- 4. Area-Colaboradores -------------------------------------------
  console.log("🔗 Asignando colaboradores a áreas…");

  const areaColabData = [
    { area: "Computadoras e impresoras", colaborador: "jose.ramirez" },
    { area: "Computadoras e impresoras", colaborador: "luis.fernandez" },
    { area: "Computadoras e impresoras", colaborador: "roberto.quispe" },
    { area: "Televisores", colaborador: "ana.martinez" },
    { area: "Computadoras e impresoras", colaborador: "demo" },
    { area: "Computadoras e impresoras", colaborador: "sofia.vega" },
    { area: "Televisores", colaborador: "diego.paredes" },
  ];

  const areaColabPromises = areaColabData.map(({ area, colaborador }) => {
    const areaRow = areaMap.get(area);
    const userRow = userMap.get(colaborador);
    if (!areaRow || !userRow) {
      console.log(
        `  ⚠️  Saltando asignación ${colaborador} → ${area} (referencia no encontrada)`,
      );
      return Promise.resolve();
    }
    return insertSafe(
      "areacolaboradores",
      {
        area_id: areaRow.area_id,
        colaborador_id: userRow.usuario_id,
      },
      `asignación ${colaborador} → ${area}`,
    ).then((row) => {
      if (row) console.log(`  ✅ ${colaborador} asignado a ${area}`);
    });
  });

  await Promise.all(areaColabPromises);
  console.log(`  📊 Asignaciones a áreas completadas\n`);

  // -- 5. Clientes -----------------------------------------------------
  console.log("👥 Insertando clientes…");

  const clientesData = [
    {
      nombres: "Juan Carlos",
      apellido_paterno: "García",
      apellido_materno: "Pérez",
      dni: "10123456",
      telefono: "999000001",
    },
    {
      nombres: "María Elena",
      apellido_paterno: "López",
      apellido_materno: "Ramírez",
      dni: "10234567",
      telefono: "999000002",
    },
    {
      nombres: "Pedro Miguel",
      apellido_paterno: "Torres",
      apellido_materno: "Vega",
      dni: "10345678",
      telefono: "999000003",
    },
  ];

  const clienteMap = new Map<string, any>();

  const clientePromises = clientesData.map((c) => {
    const key = `${c.nombres} ${c.apellido_paterno}`;
    return insertSafe(
      "clientes",
      {
        cliente_nombres: c.nombres,
        cliente_apellido_paterno: c.apellido_paterno,
        cliente_apellido_materno: c.apellido_materno,
        cliente_dni: c.dni,
        cliente_telefono: c.telefono,
        cliente_correo: null,
        cliente_direccion: null,
        cliente_fecha_creacion: td,
      },
      `cliente ${key}`,
    ).then(async (row) => {
      if (row) {
        clienteMap.set(key, row);
        console.log(`  ✅ Cliente: ${key}`);
        return;
      }
      // Duplicate -- fetch existing
      const { data } = await supabase
        .from("clientes")
        .select()
        .eq("cliente_dni", c.dni)
        .single();
      if (data) {
        clienteMap.set(key, data);
        console.log(`  📌 Cliente existente recuperado: ${key}`);
      }
    });
  });

  await Promise.all(clientePromises);
  console.log(`  📊 Total clientes registrados: ${clienteMap.size}\n`);

  // -- 6. Servicios ----------------------------------------------------
  console.log("📋 Insertando servicios…");

  const areaComputo = areaMap.get("Computadoras e impresoras")!;
  const areaTv = areaMap.get("Televisores")!;

  const serviciosData = [
    {
      codigo: "SRV-0001",
      nombre: "Instalación de red cliente ABC",
      descripcion:
        "Instalación completa de red para el cliente ABC incluyendo cableado estructurado y configuración de switches.",
      estado: "en_progreso",
      tiempo_estimado: 120,
      area_id: areaComputo.area_id,
      clienteKey: "Juan Carlos García",
      fecha_inicio: daysAgo(1),
      hora_inicio: "09:00:00",
    },
    {
      codigo: "SRV-0002",
      nombre: "Mantenimiento preventivo servidores",
      descripcion:
        "Mantenimiento preventivo programado a servidores principales y de respaldo.",
      estado: "pendiente",
      tiempo_estimado: 180,
      area_id: areaComputo.area_id,
      clienteKey: "María Elena López",
    },
    {
      codigo: "SRV-0003",
      nombre: "Desarrollo módulo facturación",
      descripcion:
        "Desarrollo del nuevo módulo de facturación electrónica para el sistema interno.",
      estado: "pendiente",
      tiempo_estimado: 480,
      area_id: areaComputo.area_id,
      clienteKey: "Juan Carlos García",
    },
    {
      codigo: "SRV-0004",
      nombre: "Soporte urgente - caída de sistema",
      descripcion:
        "Caída del sistema principal de ventas. Se requiere diagnóstico y restauración urgente.",
      estado: "bloqueado",
      tiempo_estimado: 60,
      area_id: areaComputo.area_id,
      clienteKey: "Pedro Miguel Torres",
      fecha_inicio: td,
      hora_inicio: tt,
    },
    {
      codigo: "SRV-0005",
      nombre: "Instalación cámaras seguridad",
      descripcion:
        "Instalación de sistema de cámaras de seguridad para oficinas principales.",
      estado: "completado",
      tiempo_estimado: 240,
      area_id: areaTv.area_id,
      clienteKey: "María Elena López",
      fecha_inicio: daysAgo(3),
      hora_inicio: "08:00:00",
      fecha_fin: daysAgo(1),
      hora_fin: "16:30:00",
    },
    {
      codigo: "SRV-0006",
      nombre: "Actualización software oficina",
      descripcion:
        "Actualización de software de oficina a la última versión disponible.",
      estado: "pendiente",
      tiempo_estimado: 90,
      area_id: areaComputo.area_id,
      clienteKey: "Pedro Miguel Torres",
    },
  ];

  const servicioMap = new Map<string, any>();

  const servicioPromises = serviciosData.map((s) => {
    const cid = clienteMap.get(s.clienteKey)?.cliente_id ?? null;
    const base: Record<string, unknown> = {
      servicio_codigo: s.codigo,
      servicio_nombre: s.nombre,
      servicio_descripcion: s.descripcion,
      servicio_estado: s.estado,
      servicio_tiempo_estimado: s.tiempo_estimado,
      area_id: s.area_id,
      cliente_id: cid,
      tecnico_principal_id: null,
      plantilla_id: null,
      servicio_cliente_reporte: null,
      servicio_diagnostico_inicial: null,
      servicio_descripcion_equipo: null,
      servicio_serie_equipo: null,
      servicio_detalles_equipo: null,
      servicio_descripcion_accesorio: null,
      servicio_detalles_accesorio: null,
      servicio_fecha_creacion: td,
      servicio_hora_creacion: tt,
    };
    if (s.fecha_inicio) base.servicio_fecha_inicio = s.fecha_inicio;
    if (s.hora_inicio) base.servicio_hora_inicio = s.hora_inicio;
    if (s.fecha_fin) base.servicio_fecha_fin = s.fecha_fin;
    if (s.hora_fin) base.servicio_hora_fin = s.hora_fin;

    return insertSafe("servicios", base, `servicio ${s.codigo}`).then(async (row) => {
      if (row) {
        servicioMap.set(s.codigo, row);
        console.log(`  ✅ Servicio creado: ${s.codigo} -- ${s.nombre}`);
        return;
      }
      // Duplicate -- fetch existing
      const { data } = await supabase
        .from("servicios")
        .select()
        .eq("servicio_codigo", s.codigo)
        .single();
      if (data) {
        servicioMap.set(s.codigo, data);
        console.log(`  📌 Servicio existente recuperado: ${s.codigo}`);
      }
    });
  });

  await Promise.all(servicioPromises);
  console.log(`  📊 Total servicios registrados: ${servicioMap.size}\n`);

  // -- 7. Tareas -------------------------------------------------------
  console.log("✅ Insertando tareas…");

  const uid = (username: string): number | null =>
    userMap.get(username)?.usuario_id ?? null;

  const tareasData = [
    // SRV-0001 -- en_progreso
    {
      servicio: "SRV-0001",
      titulo: "Verificar cableado existente",
      orden: 1,
      estado: "completado",
      completado_por: "jose.ramirez",
      fecha_completado: daysAgo(1),
      hora_completado: "11:30:00",
    },
    {
      servicio: "SRV-0001",
      titulo: "Configurar switches",
      orden: 2,
      estado: "pendiente",
    },
    {
      servicio: "SRV-0001",
      titulo: "Probar conectividad",
      orden: 3,
      estado: "pendiente",
    },
    // SRV-0002 -- pendiente
    {
      servicio: "SRV-0002",
      titulo: "Backup de configuración",
      orden: 1,
      estado: "pendiente",
    },
    {
      servicio: "SRV-0002",
      titulo: "Actualizar firmware",
      orden: 2,
      estado: "pendiente",
    },
    // SRV-0003 -- pendiente
    {
      servicio: "SRV-0003",
      titulo: "Análisis de requisitos",
      orden: 1,
      estado: "pendiente",
    },
    {
      servicio: "SRV-0003",
      titulo: "Diseño de base de datos",
      orden: 2,
      estado: "pendiente",
    },
    {
      servicio: "SRV-0003",
      titulo: "Implementación backend",
      orden: 3,
      estado: "pendiente",
    },
    {
      servicio: "SRV-0003",
      titulo: "Pruebas",
      orden: 4,
      estado: "pendiente",
    },
    // SRV-0004 -- bloqueado
    {
      servicio: "SRV-0004",
      titulo: "Diagnóstico inicial",
      orden: 1,
      estado: "completado",
      completado_por: "jose.ramirez",
      fecha_completado: td,
      hora_completado: "10:15:00",
    },
    {
      servicio: "SRV-0004",
      titulo: "Esperando respuesta proveedor",
      orden: 2,
      estado: "pendiente",
    },
    // SRV-0005 -- completado
    {
      servicio: "SRV-0005",
      titulo: "Revisión del sitio",
      orden: 1,
      estado: "completado",
      completado_por: "ana.martinez",
      fecha_completado: daysAgo(3),
      hora_completado: "12:00:00",
    },
    {
      servicio: "SRV-0005",
      titulo: "Instalación de cámaras",
      orden: 2,
      estado: "completado",
      completado_por: "ana.martinez",
      fecha_completado: daysAgo(2),
      hora_completado: "15:00:00",
    },
    {
      servicio: "SRV-0005",
      titulo: "Configuración de software",
      orden: 3,
      estado: "completado",
      completado_por: "ana.martinez",
      fecha_completado: daysAgo(1),
      hora_completado: "14:00:00",
    },
    // SRV-0006 -- pendiente
    {
      servicio: "SRV-0006",
      titulo: "Inventario de equipos",
      orden: 1,
      estado: "pendiente",
    },
  ];

  const allTareas: any[] = [];

  for (const t of tareasData) {
    const servicioRow = servicioMap.get(t.servicio);
    if (!servicioRow) {
      console.log(
        `  ⚠️  Saltando tarea "${t.titulo}" -- servicio ${t.servicio} no encontrado`,
      );
      continue;
    }

    const base: Record<string, unknown> = {
      servicio_id: servicioRow.servicio_id,
      tarea_titulo: t.titulo,
      tarea_orden: t.orden,
      tarea_estado: t.estado,
      tarea_fecha_creacion: td,
      tarea_hora_creacion: tt,
    };

    if (t.estado === "completado" && t.completado_por) {
      base.tarea_completado_por = uid(t.completado_por);
      base.tarea_fecha_completado = t.fecha_completado;
      base.tarea_hora_completado = t.hora_completado;
    }

    const row = await insertSafe("tareas", base, `tarea "${t.titulo}"`);
    if (row) {
      allTareas.push(row);
      const icon = t.estado === "completado" ? "✅" : "⬜";
      console.log(`  ${icon} Tarea: ${t.titulo} (${t.servicio})`);
    }
  }

  console.log(`  📊 Total tareas registradas: ${allTareas.length}\n`);

  // -- 8. Servicio-Colaboradores ---------------------------------------
  console.log("👥 Asignando colaboradores a servicios…");

  const servColabData = [
    { servicio: "SRV-0001", colaborador: "jose.ramirez" },
    { servicio: "SRV-0001", colaborador: "luis.fernandez" },
    { servicio: "SRV-0002", colaborador: "jose.ramirez" },
    { servicio: "SRV-0003", colaborador: "demo" },
    { servicio: "SRV-0004", colaborador: "jose.ramirez" },
    { servicio: "SRV-0004", colaborador: "roberto.quispe" },
    { servicio: "SRV-0005", colaborador: "ana.martinez" },
    { servicio: "SRV-0006", colaborador: "luis.fernandez" },
  ];

  const servColabPromises = servColabData.map(
    ({ servicio, colaborador }) => {
      const serv = servicioMap.get(servicio);
      const usr = userMap.get(colaborador);
      if (!serv || !usr) {
        console.log(
          `  ⚠️  Saltando asignación ${colaborador} → ${servicio} (referencia no encontrada)`,
        );
        return Promise.resolve();
      }
      return supabase
        .from("servicios")
        .update({ colaborador_id: usr.usuario_id } as any)
        .eq("servicio_id", serv.servicio_id)
        .then(({ error }) => {
          if (error) {
            console.log(`  ❌ Error asignando ${colaborador} → ${servicio}: ${error.message}`);
          } else {
            console.log(`  ✅ ${colaborador} asignado a ${servicio}`);
          }
        });
    },
  );

  await Promise.all(servColabPromises);
  console.log(`  📊 Asignaciones servicio-colaborador completadas\n`);

  // -- 9. Plantillas y Plantilla-Tareas --------------------------------
  console.log("📄 Insertando plantillas…");

  const plantillasData = [
    {
      nombre: "Instalación Estándar",
      descripcion: "Plantilla para instalaciones técnicas recurrentes",
      tareas: [
        { titulo: "Revisión de sitio", descripcion: "Evaluar el lugar de instalación.", orden: 1 },
        { titulo: "Instalación de equipos", descripcion: "Instalación física y conexión de los equipos.", orden: 2 },
        { titulo: "Pruebas de funcionamiento", descripcion: "Verificar que todo funcione correctamente.", orden: 3 },
        { titulo: "Capacitación al cliente", descripcion: "Capacitar al cliente en el uso del sistema.", orden: 4 },
      ],
    },
    {
      nombre: "Soporte Técnico",
      descripcion: "Plantilla para casos de soporte técnico",
      tareas: [
        { titulo: "Diagnóstico inicial", descripcion: "Identificar la causa raíz del problema reportado.", orden: 1 },
        { titulo: "Ejecutar solución", descripcion: "Aplicar la solución identificada.", orden: 2 },
        { titulo: "Verificar con cliente", descripcion: "Confirmar con el cliente que el problema está resuelto.", orden: 3 },
        { titulo: "Documentar caso", descripcion: "Registrar el caso y la solución en el sistema.", orden: 4 },
      ],
    },
  ];

  for (const p of plantillasData) {
    const row = await insertSafe(
      "plantillas",
      {
        plantilla_nombre: p.nombre,
        plantilla_descripcion: p.descripcion,
        plantilla_activa: true,
        plantilla_fecha_creacion: td,
      },
      `plantilla "${p.nombre}"`,
    );
    if (!row) {
      console.log(`  ⚠️  No se pudo crear la plantilla "${p.nombre}"`);
      continue;
    }
    console.log(`  ✅ Plantilla creada: ${p.nombre} (ID ${row.plantilla_id})`);

    const tareaPromises = p.tareas.map((t) =>
      insertSafe(
        "plantillatareas",
        {
          plantilla_id: row.plantilla_id,
          plantillatarea_titulo: t.titulo,
          plantillatarea_orden: t.orden,
        },
        `plantillatarea "${t.titulo}"`,
      ).then((r) => {
        if (r) console.log(`    📌 Tarea de plantilla: ${t.titulo}`);
      }),
    );
    await Promise.all(tareaPromises);
  }

  console.log(`  📊 Plantillas completadas\n`);

  // -- 10. Comentarios --------------------------------------------------
  console.log("💬 Insertando comentarios en servicios…");

  const comentariosData = [
    {
      servicio: "SRV-0001",
      usuario: "carlos.garcia",
      contenido:
        "Por favor, informar avance de la instalación de red. El cliente está preguntando.",
    },
    {
      servicio: "SRV-0001",
      usuario: "jose.ramirez",
      contenido:
        "Ya verificamos el cableado. Mañana configuramos los switches y probamos conectividad.",
    },
    {
      servicio: "SRV-0004",
      usuario: "admin",
      contenido:
        "Este caso es prioritario. Por favor darle seguimiento y escalar si es necesario.",
    },
  ];

  const comentPromises = comentariosData.map((c) => {
    const serv = servicioMap.get(c.servicio);
    const usr = userMap.get(c.usuario);
    if (!serv || !usr) {
      console.log(
        `  ⚠️  Saltando comentario de ${c.usuario} en ${c.servicio} (referencia no encontrada)`,
      );
      return Promise.resolve();
    }
    return insertSafe(
      "serviciocomentarios",
      {
        servicio_id: serv.servicio_id,
        usuario_id: usr.usuario_id,
        serviciocomentario_contenido: c.contenido,
        serviciocomentario_fecha: td,
        serviciocomentario_hora: tt,
      },
      `comentario de ${c.usuario}`,
    ).then((r) => {
      if (r) console.log(`  ✅ Comentario de ${c.usuario} en ${c.servicio}`);
    });
  });

  await Promise.all(comentPromises);
  console.log(`  📊 Comentarios insertados\n`);

  // -- 11. Calificaciones ----------------------------------------------
  console.log("⭐ Insertando calificaciones…");

  const srv5 = servicioMap.get("SRV-0005");
  const srv5ClienteKey = "María Elena López";
  const srv5ClienteId = clienteMap.get(srv5ClienteKey)?.cliente_id ?? null;
  if (srv5 && srv5ClienteId) {
    const cal = await insertSafe(
      "calificaciones",
      {
        servicio_id: srv5.servicio_id,
        cliente_id: srv5ClienteId,
        calificacion_puntaje: 5,
        nps_score: 10,
        nps_razon: "Excelente atención al cliente, muy recomendable.",
        calificacion_comentario:
          "Excelente servicio, muy profesionales y puntuales. Las cámaras funcionan perfectamente.",
        calificacion_sugerencia:
          "Podrían ofrecer mantenimiento periódico incluido en el servicio.",
        calificacion_fecha: daysAgo(1),
        calificacion_hora: "17:00:00",
      },
      "calificación SRV-0005",
    );
    if (cal) console.log("  ✅ Calificación 5/5 para SRV-0005");
  }

  console.log(`  📊 Calificaciones insertadas\n`);

  // --- Resumen final --------------------------------------------------
  console.log("═══════════════════════════════════");
  console.log("🎉 Seed completado exitosamente");
  console.log("═══════════════════════════════════");
  console.log(`  👤 Usuarios:     ${userMap.size}`);
  console.log(`  🏢 Áreas:        ${areaMap.size}`);
  console.log(`  👥 Clientes:     ${clienteMap.size}`);
  console.log(`  📋 Servicios:    ${servicioMap.size}`);
  console.log(`  ✅ Tareas:       ${allTareas.length}`);
  console.log(`  📄 Plantillas:   ${plantillasData.length}`);
  console.log("═══════════════════════════════════\n");
}

seed().catch((err) => {
  console.error("\n❌ Error durante el seed:");
  console.error(err);
  process.exit(1);
});
