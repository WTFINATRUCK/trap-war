import { useCallback, useEffect, useState } from "react";
import type { CloudSave } from "@/types/cloudSave";
import type { GameState } from "@/lib/game/types";
import { generateReferralCode, getReferralData } from "@/lib/referral";
import type { TelegramUser } from "./useTelegram";

const CLOUD_KEY = "game_v1";
const LOCAL_PREFIX = "trapwar_cloud_";
const CLOUD_TIMEOUT_MS = 1500;

function localKey(telegramId: number) {
  return `${LOCAL_PREFIX}${telegramId}`;
}

function readLocal(telegramId: number): CloudSave | null {
  try {
    const raw = localStorage.getItem(localKey(telegramId));
    if (!raw) return null;
    return JSON.parse(raw) as CloudSave;
  } catch {
    return null;
  }
}

function writeLocal(save: CloudSave): void {
  try {
    localStorage.setItem(localKey(save.telegramId), JSON.stringify(save));
  } catch {
    /* quota / private mode */
  }
}

function isTelegramCloudAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Avoid importing SDK at module top — blank screen if it fails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const tg = w.Telegram?.WebApp;
    if (!tg) return false;
    const hasInitData = Boolean(tg.initData && String(tg.initData).length > 0);
    const hasCloudApi = Boolean(tg.CloudStorage?.getItem);
    return hasInitData && hasCloudApi;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function cloudGetItem(): Promise<string | null> {
  if (!isTelegramCloudAvailable()) return Promise.resolve(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CloudStorage = (window as any).Telegram.WebApp.CloudStorage;

  const promise = new Promise<string | null>((resolve) => {
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      CloudStorage.getItem(CLOUD_KEY, (err: unknown, value?: string) => {
        if (err) done(null);
        else done(value ?? null);
      });
    } catch {
      done(null);
    }
  });

  return withTimeout(promise, CLOUD_TIMEOUT_MS, null);
}

function cloudSetItem(value: string): Promise<boolean> {
  if (!isTelegramCloudAvailable()) return Promise.resolve(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CloudStorage = (window as any).Telegram.WebApp.CloudStorage;

  const promise = new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      CloudStorage.setItem(CLOUD_KEY, value, (err: unknown) => done(!err));
    } catch {
      done(false);
    }
  });

  return withTimeout(promise, CLOUD_TIMEOUT_MS, false);
}

export function createEmptySave(user: TelegramUser): CloudSave {
  const ref = getReferralData(user.id);
  return {
    version: 1,
    telegramId: user.id,
    username: user.username,
    firstName: user.firstName,
    referralCode: ref.referralCode,
    referredBy: ref.referredBy ?? undefined,
    game: null,
    referralPending: { queuedDrip: 0 },
    updatedAt: Date.now(),
  };
}

export function useCloudSave(user: TelegramUser | null) {
  const [save, setSave] = useState<CloudSave | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSave(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      let loaded: CloudSave | null = null;

      try {
        const cloudRaw = await cloudGetItem();
        if (cloudRaw) loaded = JSON.parse(cloudRaw) as CloudSave;
      } catch {
        loaded = null;
      }

      if (!loaded) loaded = readLocal(user.id);
      if (!loaded) loaded = createEmptySave(user);

      if (!cancelled) {
        setSave(loaded);
        setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setSave(createEmptySave(user));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = useCallback(async (next: CloudSave) => {
    const withMeta = { ...next, updatedAt: Date.now() };
    setSave(withMeta);
    writeLocal(withMeta);
    await cloudSetItem(JSON.stringify(withMeta));
  }, []);

  const saveGame = useCallback(
    async (game: GameState) => {
      if (!user) return;
      const base = save ?? createEmptySave(user);
      await persist({ ...base, game });
    },
    [save, persist, user]
  );

  const resetGame = useCallback(async () => {
    if (!user) return;
    const next = createEmptySave(user);
    next.referralCode = save?.referralCode ?? generateReferralCode(user.id);
    next.referredBy = save?.referredBy;
    await persist(next);
  }, [user, save, persist]);

  return { save, loading, saveGame, persist, resetGame };
}
