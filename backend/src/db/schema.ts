import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  foreignKey,
  jsonb,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Usuarios ──
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  nombres: varchar("nombres", { length: 150 }).notNull(),
  apellidos: varchar("apellidos", { length: 150 }),
  dni: varchar("dni", { length: 20 }),
  // TODO: add UNIQUE constraint manually via SQL: CREATE UNIQUE INDEX usuarios_dni_key ON usuarios(dni) WHERE dni IS NOT NULL;
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 150 }).notNull().unique(),
  rol: varchar("rol", { length: 20 })
    .notNull()
    .$type<"admin" | "encargado" | "colaborador">(),
  activo: boolean("activo").notNull().default(true),
  area_id: integer("area_id"), // FK → areas.id (constraint added in areas table config)
  reset_token: varchar("reset_token", { length: 255 }),
  reset_expires: timestamp("reset_expires"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── Areas ──
export const areas = pgTable(
  "areas",
  {
    id: serial("id").primaryKey(),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    encargado_id: integer("encargado_id"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    encargadoFk: foreignKey({
      columns: [table.encargado_id],
      foreignColumns: [usuarios.id],
    }),
  })
);

// ── Areas-Colaboradores (junction) ──
export const areas_colaboradores = pgTable(
  "areas_colaboradores",
  {
    area_id: integer("area_id")
      .notNull()
      .references(() => areas.id, { onDelete: "cascade" }),
    usuario_id: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.area_id, table.usuario_id] }),
  })
);

// ── Servicios ──
export const servicios = pgTable("servicios", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 250 }).notNull(),
  descripcion: text("descripcion"),
  estado: varchar("estado", { length: 20 })
    .notNull()
    .default("pendiente")
    .$type<
      "pendiente" | "en_progreso" | "completado" | "cancelado" | "bloqueado"
    >(),
  prioridad: varchar("prioridad", { length: 20 })
    .notNull()
    .default("media")
    .$type<"baja" | "media" | "alta" | "urgente">(),
  area_id: integer("area_id").references(() => areas.id),
  cliente_nombre: varchar("cliente_nombre", { length: 200 }).notNull(),
  cliente_email: varchar("cliente_email", { length: 150 }),
  datos_completos: boolean("datos_completos").notNull().default(false),
  consultado_cliente: boolean("consultado_cliente").notNull().default(false),
  tiempo_estimado: integer("tiempo_estimado"), // minutos
  fecha_inicio: timestamp("fecha_inicio"),
  fecha_fin: timestamp("fecha_fin"),
  bloqueado_motivo: text("bloqueado_motivo"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── Servicios-Colaboradores (junction) ──
export const servicios_colaboradores = pgTable(
  "servicios_colaboradores",
  {
    servicio_id: integer("servicio_id")
      .notNull()
      .references(() => servicios.id, { onDelete: "cascade" }),
    usuario_id: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.servicio_id, table.usuario_id] }),
  })
);

// ── Tareas ──
export const tareas = pgTable("tareas", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id")
    .notNull()
    .references(() => servicios.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 250 }).notNull(),
  descripcion: text("descripcion"),
  orden: integer("orden").notNull().default(0),
  completada: boolean("completada").notNull().default(false),
  completada_por: integer("completada_por").references(() => usuarios.id),
  completada_at: timestamp("completada_at"),
  area_id: integer("area_id").references(() => areas.id),
  tiempo_estimado: integer("tiempo_estimado"), // minutos
  asignado_a: integer("asignado_a").references(() => usuarios.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Plantillas de Proceso ──
export const plantillas_proceso = pgTable("plantillas_proceso", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  descripcion: text("descripcion"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── Plantillas Tarea ──
export const plantillas_tarea = pgTable("plantillas_tarea", {
  id: serial("id").primaryKey(),
  plantilla_id: integer("plantilla_id")
    .notNull()
    .references(() => plantillas_proceso.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 250 }).notNull(),
  descripcion: text("descripcion"),
  orden: integer("orden").notNull().default(0),
  asignado_a: integer("asignado_a").references(() => usuarios.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Servicios-Plantillas (junction) ──
export const servicios_plantillas = pgTable(
  "servicios_plantillas",
  {
    servicio_id: integer("servicio_id")
      .notNull()
      .references(() => servicios.id, { onDelete: "cascade" }),
    plantilla_id: integer("plantilla_id")
      .notNull()
      .references(() => plantillas_proceso.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.servicio_id, table.plantilla_id] }),
  })
);

// ── Comentarios ──
export const comentarios = pgTable("comentarios", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id")
    .notNull()
    .references(() => servicios.id, { onDelete: "cascade" }),
  tarea_id: integer("tarea_id").references(() => tareas.id, {
    onDelete: "set null",
  }),
  usuario_id: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  contenido: text("contenido").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Auditoria ──
export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  usuario_id: integer("usuario_id").references(() => usuarios.id),
  accion: varchar("accion", { length: 50 }).notNull(),
  entidad: varchar("entidad", { length: 50 }).notNull(),
  entidad_id: integer("entidad_id"),
  detalle: jsonb("detalle"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Time Tracking ──
export const tiempo_tracking = pgTable("tiempo_tracking", {
  id: serial("id").primaryKey(),
  tarea_id: integer("tarea_id")
    .notNull()
    .references(() => tareas.id, { onDelete: "cascade" }),
  usuario_id: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  inicio: timestamp("inicio").notNull().defaultNow(),
  pausa_at: timestamp("pausa_at"),
  fin: timestamp("fin"),
});

// ── Encuestas ──
export const encuestas = pgTable("encuestas", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id")
    .notNull()
    .references(() => servicios.id, { onDelete: "cascade" }),
  calificacion: integer("calificacion").notNull(),
  comentario: text("comentario"),
  sugerencia: text("sugerencia"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
