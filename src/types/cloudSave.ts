import type { GameState } from "@/lib/game/types";

export interface CloudSave {
  version: 1;
  telegramId: number;
  username?: string;
  firstName?: string;
  referralCode: string;
  referredBy?: string;
  /** How many accounts this user has invited */
  inviteCount?: number;
  /** Telegram IDs (string) of invited users */
  invitedIds?: string[];
  game: GameState | null;
  referralPending: {
    queuedDrip: number;
  };
  walletAddress?: string;
  updatedAt: number;
}
