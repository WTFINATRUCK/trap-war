import type { GameState } from "@/lib/game/types";

export interface CloudSave {
  version: 1;
  telegramId: number;
  username?: string;
  firstName?: string;
  referralCode: string;
  referredBy?: string;
  game: GameState | null;
  referralPending: {
    queuedDrip: number;
  };
  walletAddress?: string;
  updatedAt: number;
}