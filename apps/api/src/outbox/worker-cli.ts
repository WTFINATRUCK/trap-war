import "dotenv/config";
import { loadConfig } from "../config.js";
import { createDatabase } from "../database/client.js";
import { OutboxWorker } from "./worker.js";

const config = loadConfig();
const database = createDatabase(config);
let stopping = false;

const worker = new OutboxWorker(database.db, {
  async publish(message) {
    process.stdout.write(`${JSON.stringify({
      level: "info",
      message: "outbox published",
      outboxEventId: message.outboxEventId,
      aggregateType: message.aggregateType,
      aggregateId: message.aggregateId,
      eventType: message.eventType,
      attempts: message.attempts,
    })}\n`);
  },
});

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

try {
  while (!stopping) {
    const result = await worker.pollOnce();
    if (result.claimed === 0) await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
} finally {
  await database.close();
}
