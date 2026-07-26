import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { parseStartParam, registerReferral } from "@/lib/referral";

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
    if (!Number.isNaN(id)) {
      return { id, username: "dev_player", firstName: "Dev", isTelegram: false };
    }
  }
  // Localhost always gets a dev player so the app never sits empty
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return { id: 12345, username: "dev_player", firstName: "Dev", isTelegram: false };
  }
  return null;
}

function userFromTelegram(): TelegramUser | null {
  try {
    const tgUser = WebApp.initDataUnsafe?.user;
    if (!tgUser?.id) return null;
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
        /* optional theme */
      }
    } catch {
      // Outside Telegram
    }

    const tgUser = devUserFromQuery() ?? userFromTelegram();
    setUser(tgUser);

    if (tgUser) {
      try {
        const refCode = parseStartParam(WebApp.initDataUnsafe?.start_param);
        if (refCode) registerReferral(tgUser.id, refCode);
      } catch {
        // optional
      }
    }

    setReady(true);
  }, []);

  return { user, ready };
}
