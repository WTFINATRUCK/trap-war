import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import {
  parseStartParam,
  readInvitePayloadFromTelegramOnly,
  registerReferral,
} from "@/lib/referral";

export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  isTelegram: boolean;
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Dev-only fake user. NEVER active on production domains
 * (trap-war.com, vercel.app, etc.) — even with ?tg=.
 */
function devUserFromQuery(): TelegramUser | null {
  if (import.meta.env.PROD) return null;
  if (typeof window === "undefined") return null;
  if (!isLocalDevHost() && !import.meta.env.DEV) return null;

  const params = new URLSearchParams(window.location.search);
  const devId = params.get("tg");
  if (devId) {
    const id = parseInt(devId, 10);
    if (!Number.isNaN(id) && id > 0) {
      return { id, username: "dev_player", firstName: "Dev", isTelegram: false };
    }
  }
  if (isLocalDevHost()) {
    return { id: 12345, username: "dev_player", firstName: "Dev", isTelegram: false };
  }
  return null;
}

function userFromTelegram(): TelegramUser | null {
  try {
    const hasInitData = Boolean(WebApp.initData && WebApp.initData.length > 0);
    const tgUser = WebApp.initDataUnsafe?.user;
    if (!tgUser?.id) return null;
    // Production Mini App: require signed initData
    if (!hasInitData && import.meta.env.PROD) return null;
    return {
      id: tgUser.id,
      username: tgUser.username,
      firstName: tgUser.first_name,
      isTelegram: true,
    };
  } catch {
    return null;
  }
}

export function useTelegram() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      try {
        WebApp.setHeaderColor("#07060c");
        WebApp.setBackgroundColor("#07060c");
      } catch {
        /* optional */
      }
    } catch {
      // Outside Telegram
    }

    // Production browsers: only real Telegram sessions enter the game.
    // Everyone else → LandingPage (no local/dev UI).
    const tgUser = userFromTelegram() ?? devUserFromQuery();
    setUser(tgUser);

    if (tgUser) {
      try {
        const refCode = tgUser.isTelegram
          ? parseStartParam(WebApp.initDataUnsafe?.start_param)
          : readInvitePayloadFromTelegramOnly(false);
        if (refCode) registerReferral(tgUser.id, refCode);
      } catch {
        /* optional */
      }
    }

    setReady(true);
  }, []);

  return { user, ready };
}
