import { and, asc, eq, inArray, lt, lte } from "drizzle-orm";
import type { AppDatabase } from "../database/client.js";
import { outboxEvents } from "../database/schema.js";

export interface OutboxMessage {
  outboxEventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  attempts: number;
}

export interface OutboxPublisher {
  publish(message: OutboxMessage): Promise<void>;
}

export class OutboxWorker {
  constructor(
    private readonly db: AppDatabase,
    private readonly publisher: OutboxPublisher,
    private readonly batchSize = 50,
  ) {}

  async pollOnce(): Promise<{ claimed: number; published: number; failed: number }> {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const messages = await this.db.transaction(async (transaction) => {
      await transaction.update(outboxEvents).set({
        status: "PENDING",
        lockedAt: null,
        availableAt: new Date(),
      }).where(and(eq(outboxEvents.status, "PROCESSING"), lt(outboxEvents.lockedAt, staleBefore)));

      const claimed = await transaction
        .select()
        .from(outboxEvents)
        .where(and(
          eq(outboxEvents.status, "PENDING"),
          lte(outboxEvents.availableAt, new Date()),
        ))
        .orderBy(asc(outboxEvents.createdAt))
        .limit(this.batchSize)
        .for("update", { skipLocked: true });
      if (claimed.length === 0) return [];
      await transaction.update(outboxEvents).set({
        status: "PROCESSING",
        lockedAt: new Date(),
      }).where(inArray(outboxEvents.outboxEventId, claimed.map((message) => message.outboxEventId)));
      return claimed.map((message) => ({
        outboxEventId: message.outboxEventId,
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        eventType: message.eventType,
        eventPayload: message.eventPayload,
        attempts: message.attempts,
      }));
    });

    let published = 0;
    let failed = 0;
    for (const message of messages) {
      try {
        await this.publisher.publish(message);
        await this.db.update(outboxEvents).set({
          status: "PUBLISHED",
          attempts: message.attempts + 1,
          publishedAt: new Date(),
          lockedAt: null,
          lastError: null,
        }).where(eq(outboxEvents.outboxEventId, message.outboxEventId));
        published += 1;
      } catch (error) {
        const attempts = message.attempts + 1;
        await this.db.update(outboxEvents).set({
          status: attempts >= 10 ? "FAILED" : "PENDING",
          attempts,
          availableAt: new Date(Date.now() + Math.min(60_000, 500 * (2 ** attempts))),
          lockedAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown publish error",
        }).where(eq(outboxEvents.outboxEventId, message.outboxEventId));
        failed += 1;
      }
    }
    return { claimed: messages.length, published, failed };
  }
}
