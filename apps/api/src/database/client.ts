import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { ApiConfig } from "../config.js";
import * as schema from "./schema.js";

export type AppDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseConnection {
  db: AppDatabase;
  pool: Pool;
  close: () => Promise<void>;
}

export function createDatabase(config: ApiConfig): DatabaseConnection {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    application_name: "trap-wars-api",
  });
  return {
    db: drizzle(pool, { schema }),
    pool,
    close: () => pool.end(),
  };
}
