import "dotenv/config";
import { loadConfig } from "../config.js";
import { createDatabase } from "./client.js";
import { applyMigrations } from "./migrations.js";

const config = loadConfig();
const connection = createDatabase(config);
try {
  await applyMigrations({ execute: (sql) => connection.pool.query(sql) });
  process.stdout.write("Database migrations applied.\n");
} finally {
  await connection.close();
}
