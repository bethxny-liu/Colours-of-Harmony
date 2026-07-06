import type { HarmonicEffect } from "./types";
import { isRecognizedChord } from "./theory";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  root: "the foundation — everything else is measured from here",
  "3": "the major 3rd — bright, open major colour",
  b3: "the minor 3rd — darker, more introspective colour",
  "5": "the perfect 5th — strength and stability",
  b5: "the flat 5th — bluesy, unstable edge",
  "7": "the major 7th — shimmer and jazz colour",
  b7: "the flat 7th — relaxed, blues or rock feel",
  "9": "the 9th — opens the chord upward",
  b9: "the flat 9th — sharp tension, often dramatic",
  "11": "the 11th — adds width with mild friction",
  "#11": "the sharp 11th — Lydian lift, dreamy colour",
  "13": "the 13th — rich jazz extension",
  b13: "the flat 13th — dark, altered tension",
};

const CONSONANCE_WORDS = [
  "very tense — rubs hard against the chord",
  "tense — adds friction and bite",
  "mixed — colourful but unstable",
  "consonant — blends smoothly",
  "very consonant — locks in naturally",
];

function consonanceWord(value: number): string {
  const idx = Math.min(4, Math.floor(value * 5));
  return CONSONANCE_WORDS[idx];
}

export function describeEffect(
  effect: HarmonicEffect,
  currentPitchClasses: number[]
): string {
  if (effect.isActive) {
    return `Remove ${effect.pitchClass} — the chord loses its ${effect.role || "note"} and simplifies.`;
  }

  const roleText = ROLE_DESCRIPTIONS[effect.role] ?? `a ${effect.role} interval`;
  const blend = consonanceWord(effect.consonance);

  if (currentPitchClasses.length === 0) {
    return `Start with ${effect.pitchClass} — every chord begins with a single note. Add more to build harmony.`;
  }

  return `Add ${effect.pitchClass} as ${roleText}. It feels ${blend}.`;
}

export function describeChord(pitchClasses: number[], label: string): string {
  const n = pitchClasses.length;

  if (n === 0) {
    return "No notes selected — click any note on the lattice to begin building a chord.";
  }
  if (n === 12) {
    return "All 12 notes at once — a chromatic cluster, not a chord. Every pitch class is fighting every other. Remove notes to hear clearer harmony.";
  }
  if (n >= 7) {
    return `${n} notes selected — too many to read as one chord. This is the sound of stacking random colours. Try resetting and adding one note at a time.`;
  }
  if (n === 1) {
    return `A single note (${label}) — add a 3rd or 5th to hear a full chord take shape.`;
  }
  if (n === 2) {
    return `${label} — two notes form an interval. Add one more to complete a triad on the lattice.`;
  }
  if (n === 3) {
    if (isRecognizedChord(pitchClasses)) {
      return `${label} — a triad! The three notes form a triangle on the Tonnetz. This is the building block of most songs.`;
    }
    return `${label} — three notes, but not a standard triad. Listen for which note feels like home.`;
  }
  if (isRecognizedChord(pitchClasses)) {
    return `${label} — a recognized chord with extra colour. Extensions add personality when you choose them on purpose.`;
  }
  return `${label} — these notes don't spell a standard chord. That's okay — hover each note to hear what it adds, or reset and build from a triad.`;
}

export function describeVoiceLeading(distance: number): string {
  if (distance < 0.15) return "Notes move smoothly — voices barely shift.";
  if (distance < 0.35) return "Small steps — comfortable voice leading.";
  if (distance < 0.55) return "Moderate motion — some notes leap.";
  return "Large jumps — dramatic harmonic shift.";
}

/** Maps tension (0 = stable consonance, 1 = harsh dissonance) to a mood label. */
export function describeTension(tension: number): string {
  if (tension < 0.15) return "Calm and stable";
  if (tension < 0.3) return "Warm and open";
  if (tension < 0.45) return "Mildly coloured";
  if (tension < 0.6) return "Uneasy — leaning forward";
  if (tension < 0.75) return "Tense — unstable harmony";
  return "Harsh clash — needs resolution";
}

export { intervalQualityLabel } from "./theory";
