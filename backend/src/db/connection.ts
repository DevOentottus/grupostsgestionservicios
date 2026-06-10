import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/core/config/index.js";
import * as schema from "./schema.js";

const client = postgres(config.database.url, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
export default db;
