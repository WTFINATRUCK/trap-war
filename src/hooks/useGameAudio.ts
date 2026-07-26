import { useCallback, useEffect, useState } from "react";
import {
  isAudioMuted,
  playSfx,
  setAmbienceCity,
  setAudioMuted,
  toggleAudioMuted,
  unlockAudio,
  type SfxKind,
} from "@/lib/game/audio";
import { citySlug } from "@/lib/game/cityVisuals";
import type { CityId } from "@/lib/game/constants";

/** Game audio: unlock on gesture, city ambience, SFX helpers */
export function useGameAudio(location: CityId | string | undefined) {
  const [muted, setMuted] = useState(isAudioMuted);

  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    setAmbienceCity(citySlug(location));
  }, [location]);

  const sfx = useCallback((kind: SfxKind) => {
    playSfx(kind);
  }, []);

  const toggleMute = useCallback(() => {
    const next = toggleAudioMuted();
    setMuted(next);
    return next;
  }, []);

  const setMute = useCallback((v: boolean) => {
    setAudioMuted(v);
    setMuted(v);
  }, []);

  return { muted, toggleMute, setMute, sfx, unlock: unlockAudio };
}
