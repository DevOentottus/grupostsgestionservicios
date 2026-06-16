import "dotenv/config";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";

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

function randomTime(): string {
  const h = String(6 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const m = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return `${h}:${m}:00`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function insertSafe(
  table: string,
  values: Record<string, unknown>,
  label: string,
): Promise<any> {
  const { data, error } = await supabase.from(table).insert(values).select();
  if (error) {
    if (error.code === "23505") {
      return null;
    }
    console.error(`  ❌ Error al insertar ${label}:`, error.message);
    throw error;
  }
  return data?.[0] ?? null;
}

async function seedMassive() {
  console.log("🌱 Seed masivo de ServicioLocalSTS…\n");

  const td = todayDate();
  const tt = todayTime();

  console.log("🔑 Generando hashes…");
  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("123456", 10),
  ]);
  console.log("  ✅ Hashes generados\n");

  // ─── 1. USUARIOS ───────────────────────────────────────────────
  console.log("👤 Insertando usuarios…");

  const usersData = [
    { username: "admin", hash: adminHash, nombres: "Administrador", apellido_paterno: "Sistema", apellido_materno: null, dni: null, telefono: null, correo: "admin@serviciolocalsts.com", rol: "admin" },
    { username: "sistema", hash: adminHash, nombres: "Admin del Sistema", apellido_paterno: "Sistema", apellido_materno: null, dni: null, telefono: null, correo: "sistema@serviciolocalsts.com", rol: "sistema" },
    { username: "carlos.garcia", hash: userHash, nombres: "Carlos", apellido_paterno: "García", apellido_materno: "Mendoza", dni: "12345678", telefono: "987654321", correo: "carlos@serviciolocalsts.com", rol: "encargado" },
    { username: "maria.lopez", hash: userHash, nombres: "María", apellido_paterno: "López", apellido_materno: "Fernández", dni: "23456789", telefono: "987654322", correo: "maria@serviciolocalsts.com", rol: "encargado" },
    { username: "jose.ramirez", hash: userHash, nombres: "José", apellido_paterno: "Ramírez", apellido_materno: "Torres", dni: "34567890", telefono: "987654323", correo: "jose@serviciolocalsts.com", rol: "colaborador" },
    { username: "ana.martinez", hash: userHash, nombres: "Ana", apellido_paterno: "Martínez", apellido_materno: "Ruiz", dni: "45678901", telefono: "987654324", correo: "ana@serviciolocalsts.com", rol: "colaborador" },
    { username: "luis.fernandez", hash: userHash, nombres: "Luis", apellido_paterno: "Fernández", apellido_materno: "Silva", dni: "56789012", telefono: "987654325", correo: "luis@serviciolocalsts.com", rol: "colaborador" },
    { username: "demo", hash: userHash, nombres: "Usuario Demo", apellido_paterno: "Demo", apellido_materno: "del Sistema", dni: "67890123", telefono: "987654326", correo: "demo@serviciolocalsts.com", rol: "colaborador" },
    { username: "roberto.quispe", hash: userHash, nombres: "Roberto", apellido_paterno: "Quispe", apellido_materno: "Huamán", dni: "78901234", telefono: "987654327", correo: "roberto@serviciolocalsts.com", rol: "colaborador" },
    { username: "sofia.vega", hash: userHash, nombres: "Sofía", apellido_paterno: "Vega", apellido_materno: "Ríos", dni: "89012345", telefono: "987654328", correo: "sofia@serviciolocalsts.com", rol: "colaborador" },
    { username: "diego.paredes", hash: userHash, nombres: "Diego", apellido_paterno: "Paredes", apellido_materno: "Luna", dni: "90123456", telefono: "987654329", correo: "diego@serviciolocalsts.com", rol: "colaborador" },
    // Colaboradores extra para el seed masivo
    { username: "laura.morales", hash: userHash, nombres: "Laura", apellido_paterno: "Morales", apellido_materno: "Castro", dni: "11111111", telefono: "987654401", correo: "laura@serviciolocalsts.com", rol: "colaborador" },
    { username: "pablo.navarro", hash: userHash, nombres: "Pablo", apellido_paterno: "Navarro", apellido_materno: "Díaz", dni: "22222222", telefono: "987654402", correo: "pablo@serviciolocalsts.com", rol: "colaborador" },
    { username: "carmen.silva", hash: userHash, nombres: "Carmen", apellido_paterno: "Silva", apellido_materno: "Ortiz", dni: "33333333", telefono: "987654403", correo: "carmen@serviciolocalsts.com", rol: "colaborador" },
    { username: "andres.molina", hash: userHash, nombres: "Andrés", apellido_paterno: "Molina", apellido_materno: "Rivas", dni: "44444444", telefono: "987654404", correo: "andres@serviciolocalsts.com", rol: "colaborador" },
    { username: "valentina.cruz", hash: userHash, nombres: "Valentina", apellido_paterno: "Cruz", apellido_materno: "Peña", dni: "55555555", telefono: "987654405", correo: "valentina@serviciolocalsts.com", rol: "colaborador" },
    { username: "matias.reyes", hash: userHash, nombres: "Matías", apellido_paterno: "Reyes", apellido_materno: "Soto", dni: "66666666", telefono: "987654406", correo: "matias@serviciolocalsts.com", rol: "colaborador" },
    { username: "fernanda.guerra", hash: userHash, nombres: "Fernanda", apellido_paterno: "Guerra", apellido_materno: "Mora", dni: "77777777", telefono: "987654407", correo: "fernanda@serviciolocalsts.com", rol: "colaborador" },
    { username: "sebastian.rojas", hash: userHash, nombres: "Sebastián", apellido_paterno: "Rojas", apellido_materno: "Campos", dni: "88888888", telefono: "987654408", correo: "sebastian@serviciolocalsts.com", rol: "colaborador" },
    { username: "camila.nieto", hash: userHash, nombres: "Camila", apellido_paterno: "Nieto", apellido_materno: "Vidal", dni: "99999999", telefono: "987654409", correo: "camila@serviciolocalsts.com", rol: "colaborador" },
    { username: "nicolas.fuentes", hash: userHash, nombres: "Nicolás", apellido_paterno: "Fuentes", apellido_materno: "Pizarro", dni: "10101010", telefono: "987654410", correo: "nicolas@serviciolocalsts.com", rol: "colaborador" },
  ];

  const userMap = new Map<string, any>();

  await Promise.all(
    usersData.map((u) =>
      insertSafe("usuarios", {
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
      }, `usuario ${u.username}`).then(async (row) => {
        if (row) {
          userMap.set(u.username, row);
          console.log(`  ✅ Usuario creado: ${u.username} / 123456`);
          return;
        }
        const { data } = await supabase.from("usuarios").select().eq("usuario_username", u.username).single();
        if (data) {
          userMap.set(u.username, data);
        }
      })
    )
  );
  console.log(`  📊 Total usuarios: ${userMap.size}\n`);

  // ─── 2. ÁREAS ──────────────────────────────────────────────────
  console.log("🏢 Insertando áreas…");

  const areasData = [
    { nombre: "Computadoras e impresoras", encargadoKey: "carlos.garcia" },
    { nombre: "Televisores", encargadoKey: "maria.lopez" },
  ];

  const areaMap = new Map<string, any>();

  await Promise.all(
    areasData.map((a) => {
      const encargadoId = a.encargadoKey ? userMap.get(a.encargadoKey)?.usuario_id ?? null : null;
      return insertSafe("areas", {
        area_nombre: a.nombre,
        area_encargado_id: encargadoId,
        area_fecha_creacion: td,
      }, `área ${a.nombre}`).then((row) => {
        if (row) {
          areaMap.set(a.nombre, row);
          console.log(`  ✅ Área creada: ${a.nombre}`);
        }
      });
    })
  );
  console.log(`  📊 Total áreas: ${areaMap.size}\n`);

  // ─── 3. AREA-COLABORADORES ─────────────────────────────────────
  console.log("🔗 Asignando colaboradores a áreas…");

  const colabUsers = [...userMap.entries()].filter(([, u]) => u.usuario_rol === "colaborador");
  const areaNames = [...areaMap.keys()];

  for (const [username, user] of colabUsers) {
    const areaName = pick(areaNames);
    const areaRow = areaMap.get(areaName);
    if (!areaRow) continue;
    await insertSafe("areacolaboradores", {
      area_id: areaRow.area_id,
      colaborador_id: user.usuario_id,
    }, `${username} → ${areaName}`);
  }
  console.log(`  📊 Asignaciones a áreas completadas\n`);

  // ─── 4. CLIENTES ───────────────────────────────────────────────
  console.log("👥 Insertando clientes…");

  const rawClientes = [
    { nombres: "Juan Carlos", paterno: "García", materno: "Pérez", dni: "10123456", telefono: "999000001" },
    { nombres: "María Elena", paterno: "López", materno: "Ramírez", dni: "10234567", telefono: "999000002" },
    { nombres: "Pedro Miguel", paterno: "Torres", materno: "Vega", dni: "10345678", telefono: "999000003" },
    { nombres: "Ana Belén", paterno: "Castillo", materno: "Flores", dni: "10456789", telefono: "999000004" },
    { nombres: "Luis Alberto", paterno: "Rivera", materno: "Méndez", dni: "10567890", telefono: "999000005" },
    { nombres: "Claudia", paterno: "Medina", materno: "Rivas", dni: "10678901", telefono: "999000006" },
    { nombres: "Ricardo", paterno: "Delgado", materno: "Paredes", dni: "10789012", telefono: "999000007" },
    { nombres: "Gabriela", paterno: "Herrera", materno: "Córdova", dni: "10890123", telefono: "999000008" },
    { nombres: "Fernando", paterno: "Campos", materno: "Zúñiga", dni: "10901234", telefono: "999000009" },
    { nombres: "Daniela", paterno: "Montes", materno: "Escobar", dni: "11012345", telefono: "999000010" },
    { nombres: "Jorge", paterno: "Peña", materno: "Gallardo", dni: "11123456", telefono: "999000011" },
    { nombres: "Verónica", paterno: "Ramos", materno: "Sánchez", dni: "11234567", telefono: "999000012" },
    { nombres: "Héctor", paterno: "Muñoz", materno: "Contreras", dni: "11345678", telefono: "999000013" },
    { nombres: "Patricia", paterno: "Álvarez", materno: "Guzmán", dni: "11456789", telefono: "999000014" },
    { nombres: "Miguel Ángel", paterno: "Vargas", materno: "Guerrero", dni: "11567890", telefono: "999000015" },
    { nombres: "Andrea", paterno: "Figueroa", materno: "Cáceres", dni: "11678901", telefono: "999000016" },
    { nombres: "Rodrigo", paterno: "Espinoza", materno: "Valenzuela", dni: "11789012", telefono: "999000017" },
    { nombres: "Carolina", paterno: "Bravo", materno: "Orellana", dni: "11890123", telefono: "999000018" },
    { nombres: "Francisco", paterno: "Tapia", materno: "León", dni: "11901234", telefono: "999000019" },
    { nombres: "Paola", paterno: "Gutiérrez", materno: "Fuentes", dni: "12012345", telefono: "999000020" },
    { nombres: "Esteban", paterno: "Cortés", materno: "Arias", dni: "12123456", telefono: "999000021" },
    { nombres: "Marisol", paterno: "Vera", materno: "Sandoval", dni: "12234567", telefono: "999000022" },
    { nombres: "Alejandro", paterno: "Maldonado", materno: "Ríos", dni: "12345678", telefono: "999000023" },
    { nombres: "Beatriz", paterno: "Zambrano", materno: "Lara", dni: "12456789", telefono: "999000024" },
    { nombres: "Iván", paterno: "Carrasco", materno: "Núñez", dni: "12567890", telefono: "999000025" },
  ];

  const clienteMap = new Map<string, any>();

  await Promise.all(
    rawClientes.map((c) => {
      const key = `${c.nombres} ${c.paterno}`;
      return insertSafe("clientes", {
        cliente_nombres: c.nombres,
        cliente_apellido_paterno: c.paterno,
        cliente_apellido_materno: c.materno,
        cliente_dni: c.dni,
        cliente_telefono: c.telefono,
        cliente_correo: null,
        cliente_direccion: null,
        cliente_fecha_creacion: td,
      }, `cliente ${key}`).then(async (row) => {
        if (row) { clienteMap.set(key, row); return; }
        const { data } = await supabase.from("clientes").select().eq("cliente_dni", c.dni).single();
        if (data) clienteMap.set(key, data);
      });
    })
  );
  console.log(`  📊 Total clientes: ${clienteMap.size}\n`);

  // ─── 5. SERVICIOS (30+) ────────────────────────────────────────
  console.log("📋 Insertando servicios…");

  const allAreas = [...areaMap.values()];
  const allClientes = [...clienteMap.values()];
  const estados = ["pendiente", "en_progreso", "completado", "bloqueado", "cancelado"];
  const srvCodigos: string[] = [];
  const servicioMap = new Map<string, any>();

  const serviciosExtra = [
    // Completados con datos completos
    { codigo: "SRV-0010", nombre: "Configuración firewall corporativo", descripcion: "Configuración de reglas de firewall para la nueva sucursal.", estado: "completado", tiempo: 180, fechaInicio: daysAgo(10), fechaFin: daysAgo(7) },
    { codigo: "SRV-0011", nombre: "Migración de servidor correo", descripcion: "Migración completa del servidor de correo a la nueva plataforma cloud.", estado: "completado", tiempo: 480, fechaInicio: daysAgo(15), fechaFin: daysAgo(11) },
    { codigo: "SRV-0012", nombre: "Instalación red WiFi oficina norte", descripcion: "Instalación de puntos de acceso y controlador WiFi para la nueva oficina.", estado: "completado", tiempo: 240, fechaInicio: daysAgo(20), fechaFin: daysAgo(18) },
    { codigo: "SRV-0013", nombre: "Actualización ERP versión 5.0", descripcion: "Actualización del sistema ERP a la versión 5.0 con nuevos módulos.", estado: "completado", tiempo: 600, fechaInicio: daysAgo(30), fechaFin: daysAgo(25) },
    { codigo: "SRV-0014", nombre: "Diagnóstico de red área sur", descripcion: "Diagnóstico completo de la red en el área sur para detectar cuellos de botella.", estado: "completado", tiempo: 120, fechaInicio: daysAgo(5), fechaFin: daysAgo(4) },
    { codigo: "SRV-0015", nombre: "Instalación CCTV almacén central", descripcion: "Instalación de 12 cámaras de seguridad en el almacén central.", estado: "completado", tiempo: 360, fechaInicio: daysAgo(14), fechaFin: daysAgo(12) },
    // En progreso
    { codigo: "SRV-0016", nombre: "Desarrollo app inventarios", descripcion: "Desarrollo de aplicación interna para gestión de inventarios en tiempo real.", estado: "en_progreso", tiempo: 720, fechaInicio: daysAgo(3) },
    { codigo: "SRV-0017", nombre: "Refuerzo seguridad perimetral", descripcion: "Implementación de medidas de seguridad perimetral en la red corporativa.", estado: "en_progreso", tiempo: 300, fechaInicio: daysAgo(2) },
    { codigo: "SRV-0018", nombre: "Mantenimiento correctivo servidor BD", descripcion: "Corrección de errores en el servidor de base de datos principal.", estado: "en_progreso", tiempo: 240, fechaInicio: daysAgo(1) },
    { codigo: "SRV-0019", nombre: "Cableado estructurado piso 4", descripcion: "Instalación de cableado estructurado para el piso 4 del edificio corporativo.", estado: "en_progreso", tiempo: 480, fechaInicio: daysAgo(1) },
    { codigo: "SRV-0020", nombre: "Implementación reglas RLS", descripcion: "Configuración de políticas de seguridad a nivel de fila en la base de datos.", estado: "en_progreso", tiempo: 120, fechaInicio: td },
    // Pendientes
    { codigo: "SRV-0021", nombre: "Renovación certificados SSL", descripcion: "Renovación de certificados SSL para todos los dominios corporativos.", estado: "pendiente", tiempo: 60 },
    { codigo: "SRV-0022", nombre: "Auditoría de seguridad externa", descripcion: "Auditoría de seguridad contratada con empresa externa especializada.", estado: "pendiente", tiempo: 480 },
    { codigo: "SRV-0023", nombre: "Optimización consultas SQL", descripcion: "Optimización de consultas lentas en el módulo de reportes.", estado: "pendiente", tiempo: 180 },
    { codigo: "SRV-0024", nombre: "Capacitación equipo soporte", descripcion: "Capacitación al equipo de soporte sobre el nuevo sistema de tickets.", estado: "pendiente", tiempo: 240 },
    { codigo: "SRV-0025", nombre: "Instalación UPS sala servidores", descripcion: "Instalación de nuevo sistema UPS para la sala de servidores.", estado: "pendiente", tiempo: 180 },
    { codigo: "SRV-0026", nombre: "Configuración VPN remotos", descripcion: "Configuración de acceso VPN para 15 nuevos usuarios remotos.", estado: "pendiente", tiempo: 120 },
    { codigo: "SRV-0027", nombre: "Migración datos a nuevo NAS", descripcion: "Migración de datos del almacenamiento local al nuevo NAS corporativo.", estado: "pendiente", tiempo: 360 },
    { codigo: "SRV-0028", nombre: "Implementación respaldo automático", descripcion: "Configuración de respaldo automático diario para servidores críticos.", estado: "pendiente", tiempo: 120 },
    { codigo: "SRV-0029", nombre: "Desarrollo API integración", descripcion: "Desarrollo de API REST para integración con sistema contable.", estado: "pendiente", tiempo: 600 },
    { codigo: "SRV-0030", nombre: "Monitoreo infraestructura crítica", descripcion: "Implementación de sistema de monitoreo para servidores críticos.", estado: "pendiente", tiempo: 240 },
    // Bloqueados
    { codigo: "SRV-0031", nombre: "Instalación fibra óptica sucursal", descripcion: "Instalación de fibra óptica en la nueva sucursal — pendiente permiso municipal.", estado: "bloqueado", tiempo: 480, fechaInicio: daysAgo(5) },
    { codigo: "SRV-0032", nombre: "Actualización licencias Microsoft", descripcion: "Actualización de licencias Microsoft — en espera de aprobación de presupuesto.", estado: "bloqueado", tiempo: 120, fechaInicio: daysAgo(8) },
    { codigo: "SRV-0033", nombre: "Implementación módulo RH", descripcion: "Módulo de recursos humanos — esperando definición de requerimientos.", estado: "bloqueado", tiempo: 360, fechaInicio: daysAgo(12) },
    // Cancelados
    { codigo: "SRV-0034", nombre: "Contratación nuevo ISP", descripcion: "Contratación de nuevo proveedor de internet — cancelado por decisión de gerencia.", estado: "cancelado", tiempo: 0 },
    { codigo: "SRV-0035", nombre: "Compra servidor adicional", descripcion: "Adquisición de servidor adicional — proyecto cancelado, se optó por cloud.", estado: "cancelado", tiempo: 0 },
  ];

  const allServicioData = [
    // Originales (existentes)
    { codigo: "SRV-0001", nombre: "Instalación de red cliente ABC", descripcion: "Instalación completa de red para el cliente ABC.", estado: "en_progreso", tiempo: 120 },
    { codigo: "SRV-0002", nombre: "Mantenimiento preventivo servidores", descripcion: "Mantenimiento preventivo programado a servidores.", estado: "pendiente", tiempo: 180 },
    { codigo: "SRV-0003", nombre: "Desarrollo módulo facturación", descripcion: "Desarrollo del nuevo módulo de facturación electrónica.", estado: "pendiente", tiempo: 480 },
    { codigo: "SRV-0004", nombre: "Soporte urgente - caída de sistema", descripcion: "Caída del sistema principal de ventas.", estado: "bloqueado", tiempo: 60 },
    { codigo: "SRV-0005", nombre: "Instalación cámaras seguridad", descripcion: "Instalación de sistema de cámaras de seguridad.", estado: "completado", tiempo: 240 },
    { codigo: "SRV-0006", nombre: "Actualización software oficina", descripcion: "Actualización de software de oficina.", estado: "pendiente", tiempo: 90 },
    ...serviciosExtra,
  ];

  for (const s of allServicioData) {
    const area = pick(allAreas);
    const cliente = pick(allClientes);
    const base: Record<string, unknown> = {
      servicio_codigo: s.codigo,
      servicio_nombre: s.nombre,
      servicio_descripcion: s.descripcion,
      servicio_estado: s.estado,
      servicio_tiempo_estimado: s.tiempo,
      area_id: area.area_id,
      cliente_id: cliente.cliente_id,
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
    if ((s as any).fechaInicio) base.servicio_fecha_inicio = (s as any).fechaInicio;
    if ((s as any).fechaFin) base.servicio_fecha_fin = (s as any).fechaFin;

    const row = await insertSafe("servicios", base, `servicio ${s.codigo}`);
    if (row) {
      servicioMap.set(s.codigo, row);
      console.log(`  ✅ Servicio: ${s.codigo} — ${s.nombre}`);
      srvCodigos.push(s.codigo);
    } else {
      // Recuperar existente
      const { data } = await supabase.from("servicios").select().eq("servicio_codigo", s.codigo).single();
      if (data) {
        servicioMap.set(s.codigo, data);
        srvCodigos.push(s.codigo);
      }
    }
  }
  console.log(`  📊 Total servicios: ${servicioMap.size}\n`);

  // ─── 6. TAREAS (masivas) ───────────────────────────────────────
  console.log("✅ Insertando tareas…");

  const allServicioCodes = [...servicioMap.keys()];
  const allColabUsers = colabUsers.map(([, u]) => u);

  for (const codigo of allServicioCodes) {
    const svc = servicioMap.get(codigo);
    if (!svc) continue;
    const numTareas = 2 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= numTareas; i++) {
      const completada = svc.servicio_estado === "completado" && i <= Math.ceil(numTareas / 2);
      const tareaEstado = completada ? "completado" : "pendiente";
      const tarea: Record<string, unknown> = {
        servicio_id: svc.servicio_id,
        tarea_titulo: `Tarea #${i} de ${codigo}`,
        tarea_orden: i,
        tarea_estado: tareaEstado,
        tarea_fecha_creacion: td,
        tarea_hora_creacion: tt,
      };
      if (completada) {
        const colab = pick(allColabUsers);
        tarea.tarea_completado_por = colab.usuario_id;
        tarea.tarea_fecha_completado = daysAgo(Math.floor(Math.random() * 5));
        tarea.tarea_hora_completado = randomTime();
      }
      await insertSafe("tareas", tarea, `tarea ${codigo}#${i}`);
    }
  }
  console.log(`  📊 Tareas insertadas\n`);

  // ─── 7. ASIGNAR COLABORADOR A SERVICIOS ────────────────────────
  console.log("👥 Asignando colaborador a cada servicio…");

  for (const codigo of allServicioCodes) {
    const svc = servicioMap.get(codigo);
    if (!svc) continue;
    // Asignar un colaborador aleatorio
    const colab = allColabUsers[Math.floor(Math.random() * allColabUsers.length)];
    const { error } = await supabase
      .from("servicios")
      .update({ colaborador_id: colab.usuario_id })
      .eq("servicio_id", svc.servicio_id);
    if (error) {
      console.log(`  ❌ Error asignando ${colab.usuario_username} → ${codigo}: ${error.message}`);
    } else {
      console.log(`  ✅ ${colab.usuario_username} → ${codigo}`);
    }
  }
  console.log(`  📊 Asignaciones servicio-colaborador completadas\n`);

  // ─── 8. PLANTILLAS ─────────────────────────────────────────────
  console.log("📄 Insertando plantillas…");

  const plantillaTareasMap: Record<string, string[]> = {
    "Mantenimiento Preventivo": ["Inspección inicial de equipos", "Limpieza de componentes", "Verificación de conexiones", "Pruebas de funcionamiento", "Informe técnico"],
    "Instalación de Equipos": ["Recepción y verificación de equipos", "Preparación del área", "Instalación física", "Configuración y puesta en marcha", "Pruebas de aceptación"],
    "Diagnóstico y Reparación": ["Diagnóstico inicial", "Cotización", "Reparación", "Pruebas de calidad", "Entrega al cliente"],
    "Calibración": ["Recepción de instrumentos", "Verificación pre-calibración", "Proceso de calibración", "Verificación post-calibración", "Emisión de certificados"],
    "Primera configuración": ["Quitar cintas azules", "Colocar tintas", "Conectar a la energía electrica", "Configuración de red WiFi", "Prueba de impresión", "Verificación final"],
    "Instalación Estándar": ["Revisión de sitio", "Instalación de equipos", "Pruebas de funcionamiento", "Capacitación al cliente"],
    "Soporte Técnico": ["Diagnóstico inicial", "Ejecutar solución", "Verificar con cliente", "Documentar caso"],
    "Escaneo de vulnerabilidades": ["Preparación del área", "Instalación física", "Configuración inicial", "Pruebas de aceptación"],
  };

  for (const [nombrePlantilla, tareasPlantilla] of Object.entries(plantillaTareasMap)) {
    const pRow = await insertSafe("plantillas", {
      plantilla_nombre: nombrePlantilla,
      plantilla_descripcion: `Plantilla para ${nombrePlantilla.toLowerCase()}`,
      plantilla_activa: true,
      plantilla_fecha_creacion: td,
    }, `plantilla ${nombrePlantilla}`);

    if (pRow) {
      console.log(`  ✅ Plantilla: ${nombrePlantilla}`);
      for (let i = 0; i < tareasPlantilla.length; i++) {
        await insertSafe("plantillatareas", {
          plantilla_id: pRow.plantilla_id,
          plantillatarea_titulo: tareasPlantilla[i],
          plantillatarea_orden: i + 1,
        }, `tarea plantilla: ${tareasPlantilla[i]}`);
      }
    }
  }
  console.log(`  📊 Plantillas insertadas\n`);

  // ─── 9. COMENTARIOS ────────────────────────────────────────────
  console.log("💬 Insertando comentarios…");

  const frases = [
    "El cliente reportó que el problema persiste.",
    "Se realizó la visita técnica programada.",
    "Queda pendiente la aprobación del presupuesto.",
    "El equipo respondió bien después del mantenimiento.",
    "Se requiere repuesto adicional para completar.",
    "El cliente está satisfecho con el avance.",
    "Coordinando con proveedor externo la reparación.",
    "Se actualizó el firmware del equipo.",
    "La solución implementada resolvió el problema.",
    "Pendiente de confirmación del cliente para continuar.",
  ];
  const allUsuarios = [...userMap.values()];

  for (const codigo of allServicioCodes.slice(0, 15)) {
    const svc = servicioMap.get(codigo);
    if (!svc) continue;
    const numComentarios = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numComentarios; i++) {
      const autor = pick(allUsuarios);
      await insertSafe("serviciocomentarios", {
        servicio_id: svc.servicio_id,
        usuario_id: autor.usuario_id,
        serviciocomentario_contenido: pick(frases),
        serviciocomentario_fecha: daysAgo(Math.floor(Math.random() * 5)),
        serviciocomentario_hora: randomTime(),
      }, `comentario en ${codigo} por ${autor.usuario_username}`);
    }
  }
  console.log(`  📊 Comentarios insertados\n`);

  // ─── 10. SOLICITUDES INTERNAS ──────────────────────────────────
  try {
    console.log("📝 Insertando solicitudes internas…");
    const tiposSolicitud = ["apoyo", "herramienta", "equipo"];
    const estadosSolicitud = ["pendiente", "en_proceso", "completado", "rechazado"];
    const solicitudesMotivos = [
      "Necesito acceso al servidor de base de datos.",
      "Solicito nuevo monitor para mi estación.",
      "Permiso para capacitación externa la próxima semana.",
      "Reporto que la impresora del piso 3 no funciona.",
      "Solicito licencia de software para desarrollo.",
      "Necesito un teclado y mouse nuevos.",
      "Permiso para trabajar remoto el viernes.",
      "Solicito revisión del aire acondicionado del servidor.",
      "Requiero una extensión de corriente para el área.",
      "Necesito que me habiliten usuario en el sistema.",
    ];
    for (let i = 0; i < 10; i++) {
      const autor = pick(allUsuarios);
      await insertSafe("solicitudesinternas", {
        usuario_id: autor.usuario_id,
        solicitud_tipo: pick(tiposSolicitud),
        solicitud_descripcion: pick(solicitudesMotivos),
        solicitud_estado: pick(estadosSolicitud),
        solicitud_fecha_creacion: daysAgo(Math.floor(Math.random() * 15)),
        solicitud_hora_creacion: randomTime(),
      }, `solicitud ${i + 1}`);
    }
    console.log(`  📊 Solicitudes insertadas\n`);
  } catch {
    console.log(`  ⚠️  Solicitudes omitidas (tabla no disponible)\n`);
  }

  // ─── 11. ANUNCIOS ──────────────────────────────────────────────
  try {
    console.log("📢 Insertando anuncios…");
    const anuncios = [
      { titulo: "Mantenimiento programado", contenido: "El sistema estará fuera de línea el sábado de 2 a 6 AM.", tipo: "mantenimiento" },
      { titulo: "Nuevo colaborador", contenido: "Damos la bienvenida a Laura Morales, nueva colaboradora de Soporte Técnico.", tipo: "info" },
      { titulo: "Recordatorio cursos", contenido: "Recuerden inscribirse a los cursos de actualización antes del viernes.", tipo: "info" },
      { titulo: "Actualización importante", contenido: "Se implementó la versión 2.1 del sistema. Revisar cambios en el manual.", tipo: "actualizacion" },
      { titulo: "Feriado pendiente", contenido: "Se recuerda que el lunes próximo es feriado. Coordinar guardias.", tipo: "info" },
    ];
    for (const a of anuncios) {
        await insertSafe("anuncios", {
          usuario_id: userMap.get("admin")?.usuario_id ?? null,
          anuncio_titulo: a.titulo,
          anuncio_contenido: a.contenido,
          anuncio_activo: true,
          anuncio_fecha_publicacion: daysAgo(Math.floor(Math.random() * 7)),
          anuncio_hora_publicacion: randomTime(),
        }, `anuncio: ${a.titulo}`);
    }
    console.log(`  📊 Anuncios insertados\n`);
  } catch {
    console.log(`  ⚠️  Anuncios omitidos (tabla no disponible)\n`);
  }

  // ─── 12. CALIFICACIONES ────────────────────────────────────────
  try {
    console.log("⭐ Insertando calificaciones…");
    for (const codigo of allServicioCodes) {
      const svc = servicioMap.get(codigo);
      if (!svc || svc.servicio_estado !== "completado") continue;
      await insertSafe("calificaciones", {
        servicio_id: svc.servicio_id,
        cliente_id: svc.cliente_id,
        calificacion_puntaje: 3 + Math.floor(Math.random() * 3),
        calificacion_comentario: pick(["Excelente servicio", "Buen trabajo", "Cumplió con lo esperado", "Podría mejorar", "Muy satisfecho"]),
        calificacion_sugerencia: pick(["", "", "Agregar más personal", "Mejorar tiempos de respuesta", "Más comunicación con el cliente"]),
        calificacion_fecha: daysAgo(Math.floor(Math.random() * 3)),
        calificacion_hora: randomTime(),
      }, `calificación ${codigo}`);
    }
    console.log(`  📊 Calificaciones insertadas\n`);
  } catch {
    console.log(`  ⚠️  Calificaciones omitidas\n`);
  }

  // ─── RESUMEN ───────────────────────────────────────────────────
  console.log("═══════════════════════════════════");
  console.log("🎉 Seed masivo completado exitosamente");
  console.log("═══════════════════════════════════");
  console.log(`  👤 Usuarios:     ${userMap.size}`);
  console.log(`  🏢 Áreas:        ${areaMap.size}`);
  console.log(`  👥 Clientes:     ${clienteMap.size}`);
  console.log(`  📋 Servicios:    ${servicioMap.size}`);
  console.log("═══════════════════════════════════\n");
}

seedMassive().catch((err) => {
  console.error("\n❌ Seed masivo falló:", err);
  process.exit(1);
});
