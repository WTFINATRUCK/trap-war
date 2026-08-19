import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface MigrationExecutor {
  execute(sql: string): Promise<unknown>;
}

export async function applyMigrations(executor: MigrationExecutor, directory = resolve(import.meta.dirname, "../../migrations")): Promise<void> {
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const escaped = file.replaceAll("'", "''");
    const alreadyApplied = await executor.execute(`SELECT migration_name FROM schema_migrations WHERE migration_name = '${escaped}'`);
    const rows = (alreadyApplied as { rows?: unknown[] }).rows ?? (Array.isArray(alreadyApplied) ? alreadyApplied : []);
    if (rows.length > 0) continue;
    const sql = await readFile(resolve(directory, file), "utf8");
    await executor.execute(`BEGIN;\n${sql}\nINSERT INTO schema_migrations (migration_name) VALUES ('${escaped}');\nCOMMIT;`);
  }
}
