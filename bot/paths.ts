import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Persist bot JSON under /tmp on Vercel (ephemeral but works without laptop). */
export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "trapwar-data");
  return path.join(__dirname, "..", "data");
}
