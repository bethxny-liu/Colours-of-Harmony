import {
  addNote,
  analyzeChordIntervals,
  chromaToName,
  getFunctionalRole,
  getPitchClasses,
  nameToChroma,
  pairDissonance,
  semitoneDistanceBetweenSets,
  voiceLeadingDistance,
} from "./theory";
import type { ChordMetrics, HarmonicEffect } from "./types";

function chordTension(
  pitchClasses: number[],
  basePitchClasses: number[]
): number {
  const pcs = getPitchClasses(pitchClasses);
  const { meanDissonance, peakDissonance, harshPairCount } =
    analyzeChordIntervals(pcs);
  const complexity = Math.min(1, Math.max(0, (pcs.length - 3) / 6));
  const setDistance = semitoneDistanceBetweenSets(basePitchClasses, pcs);
  const harshRatio =
    pcs.length >= 2 ? harshPairCount / ((pcs.length * (pcs.length - 1)) / 2) : 0;

  // Peak dissonance dominates — one minor 2nd or tritone defines the feel.
  return Math.min(
    1,
    peakDissonance * 0.55 +
      meanDissonance * 0.2 +
      harshRatio * 0.1 +
      complexity * 0.1 +
      setDistance * 0.05
  );
}

export function computeHarmonicEffect(
  chroma: number,
  currentPitchClasses: number[],
  basePitchClasses: number[],
  root: string,
  preview = false
): HarmonicEffect {
  const normalized = getPitchClasses(currentPitchClasses);
  const isActive = normalized.includes(chroma);
  const nextSet = isActive
    ? normalized.filter((pc) => pc !== chroma)
    : addNote(normalized, chroma, false);

  const intervalDissonance =
    normalized.length === 0
      ? 0
      : normalized.includes(chroma)
        ? 0.1
        : Math.max(...normalized.map((pc) => pairDissonance(pc, chroma)));

  const setDistance = semitoneDistanceBetweenSets(basePitchClasses, nextSet);
  const voiceLeading = voiceLeadingDistance(normalized, nextSet);
  const consonance = 1 - intervalDissonance;

  const tension =
    intervalDissonance * 0.55 + setDistance * 0.25 + voiceLeading * 0.2;

  return {
    chroma,
    pitchClass: chromaToName(chroma),
    tension: Math.min(1, Math.max(0, tension)),
    consonance,
    setDistance,
    voiceLeading,
    role: getFunctionalRole(nameToChroma(root), chroma, normalized),
    isActive,
    isPreview: preview,
  };
}

export function computeAllEffects(
  currentPitchClasses: number[],
  basePitchClasses: number[],
  root: string
): HarmonicEffect[] {
  return Array.from({ length: 12 }, (_, chroma) =>
    computeHarmonicEffect(chroma, currentPitchClasses, basePitchClasses, root)
  );
}

export function computeChordMetrics(
  currentPitchClasses: number[],
  previousPitchClasses: number[],
  basePitchClasses: number[]
): ChordMetrics {
  const pcs = getPitchClasses(currentPitchClasses);
  const complexity = Math.min(1, Math.max(0, (pcs.length - 3) / 6));
  const voiceLeading = voiceLeadingDistance(previousPitchClasses, pcs);

  return {
    tension: chordTension(pcs, basePitchClasses),
    voiceLeading: Math.min(1, voiceLeading),
    complexity,
  };
}
