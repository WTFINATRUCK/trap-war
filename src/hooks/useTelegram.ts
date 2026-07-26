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
  if (!devId) return null;
  const id = parseInt(devId, 10);
  if (Number.isNaN(id)) return null;
  return {
    id,
    username: "dev_player",
    firstName: "Dev",
    isTelegram: false,
  };
}

function userFromTelegram(): TelegramUser | null {
  const tgUser = WebApp.initDataUnsafe?.user;
  if (!tgUser?.id) return null;
  return {
    id: tgUser.id,
    username: tgUser.username,
    firstName: tgUser.first_name,
    isTelegram: true,
  };
}

export function useTelegram() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#0a0a0a");
    } catch {
      // Outside Telegram
    }

    const dev = devUserFromQuery();
    const tgUser = dev ?? userFromTelegram();
    setUser(tgUser);

    if (tgUser) {
      try {
        const startParam = WebApp.initDataUnsafe?.start_param;
        const refCode = parseStartParam(startParam);
        if (refCode) {
          registerReferral(tgUser.id, refCode);
        }
      } catch {
        // Referral optional
      }
    }

    setReady(true);
  }, []);

  return { user, ready, WebApp };
}