import { pgTable, serial, varchar, text, integer, boolean, timestamp, foreignKey, unique } from "drizzle-orm/pg-core";

// ── Usuarios ──
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  nombres: varchar("nombres", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  rol: varchar("rol", { length: 20 }).notNull().$type<"admin" | "encargado" | "colaborador">(),
  activo: boolean("activo").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Servicios ──
export const servicios = pgTable("servicios", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  titulo: varchar("titulo", { length: 250 }).notNull(),
  descripcion: text("descripcion"),
  estado: varchar("estado", { length: 20 }).notNull().default("pendiente").$type<"pendiente" | "en_progreso" | "completado" | "cancelado">(),
  cliente_nombre: varchar("cliente_nombre", { length: 200 }).notNull(),
  cliente_email: varchar("cliente_email", { length: 150 }),
  datos_completos: boolean("datos_completos").notNull().default(false),
  consultado_cliente: boolean("consultado_cliente").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── Tareas ──
export const tareas = pgTable("tareas", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  titulo: varchar("titulo", { length: 250 }).notNull(),
  descripcion: text("descripcion"),
  orden: integer("orden").notNull().default(0),
  completada: boolean("completada").notNull().default(false),
  completada_por: integer("completada_por").references(() => usuarios.id),
  completada_at: timestamp("completada_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Time Tracking ──
export const tiempo_tracking = pgTable("tiempo_tracking", {
  id: serial("id").primaryKey(),
  tarea_id: integer("tarea_id").notNull().references(() => tareas.id, { onDelete: "cascade" }),
  usuario_id: integer("usuario_id").notNull().references(() => usuarios.id),
  inicio: timestamp("inicio").notNull().defaultNow(),
  pausa_at: timestamp("pausa_at"),
  fin: timestamp("fin"),
});

// ── Encuestas ──
export const encuestas = pgTable("encuestas", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id").notNull().references(() => servicios.id, { onDelete: "cascade" }),
  calificacion: integer("calificacion").notNull(),
  comentario: text("comentario"),
  sugerencia: text("sugerencia"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
