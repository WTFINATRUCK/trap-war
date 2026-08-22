import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../apps/api/src/app.js";
import { loadConfig } from "../apps/api/src/config.js";
import { createDatabase } from "../apps/api/src/database/client.js";

const config = loadConfig();
const database = createDatabase(config);
const app = buildApp({ db: database.db, config });
const ready = app.ready();

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  await ready;
  app.server.emit("request", request, response);
}
