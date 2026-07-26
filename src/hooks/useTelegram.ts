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

function devUserFromQuery(): TelegramUser | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const devId = params.get("tg");
  if (devId) {
    const id = parseInt(devId, 10);
    if (!Number.isNaN(id) && id > 0) {
      return { id, username: "dev_player", firstName: "Dev", isTelegram: false };
    }
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return { id: 12345, username: "dev_player", firstName: "Dev", isTelegram: false };
  }
  return null;
}

function userFromTelegram(): TelegramUser | null {
  try {
    // Prefer validated presence of initData (harder to spoof than initDataUnsafe alone)
    const hasInitData = Boolean(WebApp.initData && WebApp.initData.length > 0);
    const tgUser = WebApp.initDataUnsafe?.user;
    if (!tgUser?.id) return null;
    if (!hasInitData && import.meta.env.PROD) {
      // Production: require initData string for Telegram sessions
      return null;
    }
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

    const tgUser = devUserFromQuery() ?? userFromTelegram();
    setUser(tgUser);

    if (tgUser) {
      try {
        /**
         * INVITE-ONLY attribution:
         * - Telegram: only WebApp start_param (from invite deep link / startapp)
         * - Dev: optional ?ref=TRAP-123 for local testing
         * Spoofable free-form query is NOT accepted in Telegram sessions.
         */
        const refCode = tgUser.isTelegram
          ? parseStartParam(WebApp.initDataUnsafe?.start_param)
          : readInvitePayloadFromTelegramOnly(false);

        if (refCode) {
          registerReferral(tgUser.id, refCode);
        }
      } catch {
        // optional
      }
    }

    setReady(true);
  }, []);

  return { user, ready };
}
