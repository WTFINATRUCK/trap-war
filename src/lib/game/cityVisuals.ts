import type { CityId } from "./constants";

/** URL-safe city key for CSS data-city attributes */
export function citySlug(city: CityId | string): string {
  return String(city)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export interface CityVisual {
  slug: string;
  label: string;
  /** Short vibe line under city name */
  vibe: string;
  /** Accent for UI chips / HUD */
  accent: string;
}

export const CITY_VISUALS: Record<CityId, CityVisual> = {
  Compton: {
    slug: "compton",
    label: "Compton",
    vibe: "Home block · golden heat",
    accent: "#f59e0b",
  },
  Inglewood: {
    slug: "inglewood",
    label: "Inglewood",
    vibe: "Forum lights · purple night",
    accent: "#a855f7",
  },
  "Long Beach": {
    slug: "long-beach",
    label: "Long Beach",
    vibe: "Harbor mist · cyan coast",
    accent: "#22d3ee",
  },
  "South Central": {
    slug: "south-central",
    label: "South Central",
    vibe: "Crimson block · deep night",
    accent: "#ef4444",
  },
  Watts: {
    slug: "watts",
    label: "Watts",
    vibe: "Towers · acid green edge",
    accent: "#4ade80",
  },
  "East LA": {
    slug: "east-la",
    label: "East LA",
    vibe: "Murals · rose sunset",
    accent: "#fb7185",
  },
};

export function cityVisual(city: CityId | string): CityVisual {
  const c = CITY_VISUALS[city as CityId];
  if (c) return c;
  return {
    slug: citySlug(city),
    label: String(city),
    vibe: "On the map",
    accent: "#a855f7",
  };
}
