import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { ApiConfig } from "../config.js";
import type { AppDatabase } from "../database/client.js";
import { gameSessions, playerIdentities, players } from "../database/schema.js";
import { createOpaqueToken, hashToken } from "../infrastructure/crypto.js";
import { ApiError } from "../http/errors.js";

export interface AuthenticatedPlayer {
  playerId: string;
  sessionId: string;
}

export class AuthService {
  constructor(private readonly db: AppDatabase, private readonly config: ApiConfig) {}

  async createGuest(): Promise<{ accessToken: string; expiresAt: string; player: { playerId: string } }> {
    const playerId = randomUUID();
    const sessionId = randomUUID();
    const identityId = randomUUID();
    const accessToken = createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.config.authSessionTtlSeconds * 1_000);
    await this.db.transaction(async (transaction) => {
      await transaction.insert(players).values({ playerId });
      await transaction.insert(playerIdentities).values({
        identityId,
        playerId,
        provider: "GUEST",
        providerSubject: randomUUID(),
        metadata: {},
      });
      await transaction.insert(gameSessions).values({
        sessionId,
        playerId,
        tokenHash: hashToken(accessToken),
        expiresAt,
      });
    });
    return { accessToken, expiresAt: expiresAt.toISOString(), player: { playerId } };
  }

  async authenticate(authorization: string | undefined): Promise<AuthenticatedPlayer> {
    if (!authorization?.startsWith("Bearer ")) throw new ApiError(401, "AUTH_REQUIRED", "A bearer session token is required.");
    const token = authorization.slice("Bearer ".length).trim();
    if (token.length < 32) throw new ApiError(401, "AUTH_REQUIRED", "The session token is invalid.");
    const rows = await this.db
      .select({ sessionId: gameSessions.sessionId, playerId: gameSessions.playerId, playerStatus: players.status })
      .from(gameSessions)
      .innerJoin(players, eq(players.playerId, gameSessions.playerId))
      .where(and(
        eq(gameSessions.tokenHash, hashToken(token)),
        isNull(gameSessions.revokedAt),
        gt(gameSessions.expiresAt, new Date()),
      ))
      .limit(1);
    const session = rows[0];
    if (!session || session.playerStatus !== "ACTIVE") throw new ApiError(401, "AUTH_REQUIRED", "The session is expired or invalid.");
    return { sessionId: session.sessionId, playerId: session.playerId };
  }
}
