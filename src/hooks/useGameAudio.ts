import { useCallback, useEffect, useState } from "react";
import {
  isAudioMuted,
  isAudioUnlocked,
  playSfx,
  setAmbienceCity,
  setAudioMuted,
  subscribeAudio,
  toggleAudioMuted,
  unlockAudio,
  type SfxKind,
} from "@/lib/game/audio";
import { citySlug } from "@/lib/game/cityVisuals";
import type { CityId } from "@/lib/game/constants";

/** Game audio: unlock on gesture, city ambience, SFX */
export function useGameAudio(location: CityId | string | undefined) {
  const [muted, setMuted] = useState(isAudioMuted);
  const [unlocked, setUnlocked] = useState(isAudioUnlocked);

  useEffect(() => {
    return subscribeAudio(() => {
      setMuted(isAudioMuted());
      setUnlocked(isAudioUnlocked());
    });
  }, []);

  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
    };
    // Capture phase so we unlock even if child stops propagation
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("touchstart", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
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
    // Always try unlock first so unmute actually works on first tap
    void unlockAudio().then(() => {
      const next = toggleAudioMuted();
      setMuted(next);
      if (!next) playSfx("tap");
    });
    return muted;
  }, [muted]);

  const enableSound = useCallback(() => {
    void unlockAudio().then((ok) => {
      if (!ok) return;
      setAudioMuted(false);
      setMuted(false);
      setUnlocked(true);
      playSfx("success");
    });
  }, []);

  return { muted, unlocked, toggleMute, enableSound, sfx, unlock: unlockAudio };
}
