import "dotenv/config";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./database/client.js";

const config = loadConfig();
const database = createDatabase(config);
const app = buildApp({ db: database.db, config });

app.addHook("onClose", async () => database.close());

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ err: error }, "API startup failed");
  await app.close();
  process.exitCode = 1;
}
