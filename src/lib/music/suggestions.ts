import { chromaToName, getFunctionalRole } from "./theory";
import { computeHarmonicEffect } from "./scoring";

export type SuggestionCategory =
  | "extension"
  | "chromatic"
  | "neighbor"
  | "chord-tone";

export interface NoteSuggestion {
  chroma: number;
  name: string;
  category: SuggestionCategory;
  reason: string;
  tension: number;
  score: number;
}

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  extension: "Extension",
  chromatic: "Chromatic color",
  neighbor: "Neighbor tone",
  "chord-tone": "Chord tone",
};

export function categoryLabel(cat: SuggestionCategory): string {
  return CATEGORY_LABELS[cat];
}

function categorizeRole(role: string): SuggestionCategory {
  if (role === "root" || role === "3" || role === "b3" || role === "5") {
    return "chord-tone";
  }
  if (role === "9" || role === "7" || role === "b7" || role === "13" || role === "11") {
    return "extension";
  }
  if (role === "b9" || role === "#11" || role === "b5") {
    return "chromatic";
  }
  return "neighbor";
}

function songReason(
  role: string,
  category: SuggestionCategory,
  name: string
): string {
  if (category === "extension") {
    if (role === "7") return `Adds a shimmering major 7th — lush over a simple triad.`;
    if (role === "9") return `Opens the chord upward — airy without fighting the melody.`;
    if (role === "b7") return `A warm, relaxed colour over the triad.`;
    return `Extends the harmony beyond the basic triad.`;
  }
  if (category === "chromatic") {
    return `${name} rubs against the chord — the kind of passing colour Jacob Collier might slip in.`;
  }
  if (category === "neighbor") {
    return `A step away from a chord tone — useful for melodic lines that drift and return.`;
  }
  return `Already in the chord — reinforces the foundation.`;
}

/** Rank notes you could add to a chord, for guided exploration */
export function getNoteSuggestions(
  currentPitchClasses: number[],
  basePitchClasses: number[],
  rootChroma: number,
  limit = 5
): NoteSuggestion[] {
  const suggestions: NoteSuggestion[] = [];

  for (let chroma = 0; chroma < 12; chroma++) {
    if (currentPitchClasses.includes(chroma)) continue;

    const effect = computeHarmonicEffect(
      chroma,
      currentPitchClasses,
      basePitchClasses,
      chromaToName(rootChroma)
    );
    const role = getFunctionalRole(rootChroma, chroma, basePitchClasses);
    const category = categorizeRole(role);

    let score = effect.consonance * 0.4 + (1 - effect.tension) * 0.3;

    if (category === "extension") score += 0.35;
    if (category === "chromatic") score += 0.15;
    if (category === "neighbor") score += 0.1;
    if (category === "chord-tone") score -= 0.5;

    suggestions.push({
      chroma,
      name: chromaToName(chroma),
      category,
      reason: songReason(role, category, chromaToName(chroma)),
      tension: effect.tension,
      score,
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
