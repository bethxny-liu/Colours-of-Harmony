import type { HarmonicEffect } from "@/lib/music/types";
import { tensionToColor } from "./colors";

/** Colors by harmonic function — the legend users learn */
export const ROLE_COLORS: Record<string, string> = {
  root: "#f5c542",
  "3": "#2dd4bf",
  b3: "#a78bfa",
  "5": "#60a5fa",
  b5: "#f87171",
  "#5": "#fb7185",
  "7": "#c084fc",
  b7: "#fb923c",
  "9": "#86efac",
  b9: "#ef4444",
  "11": "#94a3b8",
  "#11": "#e879f9",
  "13": "#fcd34d",
  b13: "#dc2626",
  "6M": "#6ee7b7",
  "6m": "#9ca3af",
};

const ROLE_LABELS: Record<string, string> = {
  root: "Root",
  "3": "Major 3rd",
  b3: "Minor 3rd",
  "5": "Perfect 5th",
  b5: "Flat 5th",
  "7": "Major 7th",
  b7: "Flat 7th",
  "9": "9th",
  b9: "Flat 9th",
  "11": "11th",
  "#11": "Sharp 11th",
  "13": "13th",
  b13: "Flat 13th",
};

export function chromaIdleColor(_chroma: number): string {
  return "rgba(255,255,255,0.14)";
}

export function nodeColor(
  effect: HarmonicEffect | undefined,
  isActive: boolean,
  isTarget: boolean,
  isHovered: boolean,
  chroma: number
): string {
  if (isActive && effect?.role) {
    return ROLE_COLORS[effect.role] ?? tensionToColor(effect.tension);
  }
  if (isTarget) return "rgba(255,255,255,0.35)";
  if (isHovered && effect) {
    if (effect.role && ROLE_COLORS[effect.role]) return ROLE_COLORS[effect.role];
    return tensionToColor(effect.tension);
  }
  return chromaIdleColor(chroma);
}

export function nodeEmissive(
  color: string,
  isActive: boolean,
  isHovered: boolean
): string {
  if (isActive) return color;
  if (isHovered) return color;
  return "#000000";
}

export function nodeOpacity(
  octave: number,
  isMain: boolean,
  isActive: boolean,
  isHovered: boolean
): number {
  if (isActive || isHovered) return 1;
  if (isMain) return 0.7;
  const dist = Math.abs(octave - 4);
  return Math.max(0.15, 0.45 - dist * 0.1);
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export const LEGEND_ITEMS = [
  { role: "root", label: "Root" },
  { role: "3", label: "Major 3rd" },
  { role: "b3", label: "Minor 3rd" },
  { role: "5", label: "5th" },
  { role: "7", label: "Maj 7th" },
  { role: "b7", label: "Dom 7th" },
  { role: "b9", label: "Tension" },
] as const;
