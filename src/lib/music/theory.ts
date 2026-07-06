import { Chord, Note, Interval } from "tonal";
import { MAIN_OCTAVE, PITCH_CLASSES } from "./constants";
import type { ChordState } from "./types";

export function chromaToName(chroma: number): string {
  return PITCH_CLASSES[((chroma % 12) + 12) % 12];
}

export function nameToChroma(name: string): number {
  const chroma = Note.chroma(name);
  return chroma ?? 0;
}

export function getPitchClasses(pitchClasses: number[]): number[] {
  return [...new Set(pitchClasses.map((c) => ((c % 12) + 12) % 12))].sort(
    (a, b) => a - b
  );
}

export function midisToPitchClasses(midis: number[]): number[] {
  return getPitchClasses(
    midis.map((m) => Note.chroma(Note.fromMidi(m) ?? "") ?? 0)
  );
}

export function midisToNoteNames(midis: number[]): string[] {
  return [...midis]
    .sort((a, b) => a - b)
    .map((m) => Note.fromMidi(m))
    .filter((n): n is string => Boolean(n));
}

export function toggleMidi(midis: number[], midi: number): number[] {
  if (midis.includes(midi)) return midis.filter((m) => m !== midi);
  return [...midis, midi].sort((a, b) => a - b);
}

export function midiForChromaOctave(chroma: number, octave = MAIN_OCTAVE): number | null {
  const name = `${chromaToName(chroma)}${octave}`;
  const m = Note.midi(name);
  return m ?? null;
}

export function buildChord(root: string, type: string): ChordState {
  const symbol = type ? `${root}${type}` : root;
  const chord = Chord.get(symbol);
  const pitchClasses = getPitchClasses(
    (chord.notes.length ? chord.notes : [root]).map(nameToChroma)
  );
  return {
    root,
    type,
    pitchClasses,
    label: chord.empty ? symbol : chord.name,
    notes: voicingFromPitchClasses(pitchClasses, 4),
  };
}

export function addNote(
  pitchClasses: number[],
  chroma: number,
  toggle = true
): number[] {
  const normalized = getPitchClasses(pitchClasses);
  const c = ((chroma % 12) + 12) % 12;
  const exists = normalized.includes(c);
  if (toggle && exists) {
    return normalized.filter((pc) => pc !== c);
  }
  if (!exists) {
    return getPitchClasses([...normalized, c]);
  }
  return normalized;
}

export function intervalVector(pitchClasses: number[]): number[] {
  const vector = [0, 0, 0, 0, 0, 0];
  const pcs = getPitchClasses(pitchClasses);
  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      const diff = Math.abs(pcs[j] - pcs[i]);
      const semitones = Math.min(diff, 12 - diff);
      if (semitones >= 1 && semitones <= 6) {
        vector[semitones - 1]++;
      }
    }
  }
  return vector;
}

export function voiceLeadingDistance(
  pitchClassesA: number[],
  pitchClassesB: number[]
): number {
  const a = getPitchClasses(pitchClassesA);
  const b = getPitchClasses(pitchClassesB);
  if (a.length === 0 || b.length === 0) return 0;

  const voicingA = voicingFromPitchClasses(a, 4);
  const voicingB = voicingFromPitchClasses(b, 4);

  const maxLen = Math.max(voicingA.length, voicingB.length);
  let total = 0;
  let moves = 0;

  for (let i = 0; i < maxLen; i++) {
    const noteA = voicingA[i] ?? voicingA[voicingA.length - 1];
    const noteB = voicingB[i] ?? voicingB[voicingB.length - 1];
    const semitones = Math.abs(Interval.semitones(Interval.distance(noteA, noteB)) ?? 0);
    if (semitones > 0) moves++;
    total += semitones;
  }

  const setPenalty = Math.abs(a.length - b.length) * 2;
  return (total / maxLen + moves * 1.5 + setPenalty) / 12;
}

export function voicingFromPitchClasses(
  pitchClasses: number[],
  octave = 4
): string[] {
  const sorted = getPitchClasses(pitchClasses);
  if (sorted.length === 0) return [];

  const notes: string[] = [];
  let currentOctave = octave;

  for (let i = 0; i < sorted.length; i++) {
    const pc = sorted[i];
    if (i > 0 && pc < sorted[i - 1]) {
      currentOctave++;
    }
    notes.push(`${chromaToName(pc)}${currentOctave}`);
  }
  return notes;
}

export function detectChordLabel(pitchClasses: number[], root: string): string {
  const pcs = getPitchClasses(pitchClasses);
  const names = pcs.map(chromaToName);

  if (pcs.length === 0) return "—";
  if (pcs.length === 1) return names[0];
  if (pcs.length === 12) return "Chromatic cluster";

  const detected = Chord.detect(names, { assumePerfectFifth: true });
  if (detected.length > 0) return detected[0];

  if (pcs.length === 2) {
    const interval = Interval.distance(names[0], names[1]);
    return interval ? `${names[0]} + ${names[1]}` : `${names.join(" + ")}`;
  }

  if (pcs.length >= 7) {
    return `${pcs.length} notes — dense cluster`;
  }

  return names.join(" · ");
}

export function isRecognizedChord(pitchClasses: number[]): boolean {
  const pcs = getPitchClasses(pitchClasses);
  if (pcs.length < 3 || pcs.length >= 7) return false;
  const names = pcs.map(chromaToName);
  return Chord.detect(names, { assumePerfectFifth: true }).length > 0;
}

export function chordFromPitchClasses(
  pitchClasses: number[],
  root: string,
  type: string
): ChordState {
  const pcs = getPitchClasses(pitchClasses);
  const names = pcs.map(chromaToName);
  const detected = Chord.detect(names, { assumePerfectFifth: true });

  if (detected.length > 0) {
    const match = Chord.get(detected[0]);
    return {
      root: match.tonic ?? root,
      type: match.aliases[0] ?? type,
      pitchClasses: pcs,
      label: detected[0],
      notes: voicingFromPitchClasses(pcs, 4),
    };
  }

  return {
    root,
    type,
    pitchClasses: pcs,
    label: detectChordLabel(pcs, root),
    notes: voicingFromPitchClasses(pcs, 4),
  };
}

export function getFunctionalRole(
  rootChroma: number,
  noteChroma: number,
  pitchClasses: number[]
): string {
  const root = chromaToName(rootChroma);
  const note = chromaToName(noteChroma);
  const interval = Interval.distance(root, note);
  if (!interval) return "";

  const roleMap: Record<string, string> = {
    "1P": "root",
    "2m": "b9",
    "2M": "9",
    "3m": "b3",
    "3M": "3",
    "4P": "11",
    "4A": "#11",
    "5d": "b5",
    "5P": "5",
    "5A": "#5",
    "6m": "b13",
    "6M": "13",
    "7m": "b7",
    "7M": "7",
  };

  const role = roleMap[interval] ?? interval;
  if (pitchClasses.includes(noteChroma)) return role;
  return role;
}

export function cycleRoot(current: string, direction: 1 | -1): string {
  const chroma = nameToChroma(current);
  return chromaToName(chroma + direction);
}

export function semitoneDistanceBetweenSets(a: number[], b: number[]): number {
  const setA = getPitchClasses(a);
  const setB = getPitchClasses(b);
  if (setA.length === 0 || setB.length === 0) return 0;
  let distance = 0;
  for (const pc of setB) {
    if (!setA.includes(pc)) {
      const nearest = Math.min(
        ...setA.map((existing) => {
          const d = Math.abs(pc - existing);
          return Math.min(d, 12 - d);
        })
      );
      distance += nearest;
    }
  }
  return distance / 12;
}

export function semitonesBetween(pcA: number, pcB: number): number {
  const diff = Math.abs(((pcA % 12) + 12) % 12 - (((pcB % 12) + 12) % 12));
  return Math.min(diff, 12 - diff);
}

/** Psychoacoustic consonance by semitone size (0 = most dissonant). */
const SEMITONE_CONSONANCE: Record<number, number> = {
  0: 1,
  1: 0, // minor 2nd — strongest sensory roughness
  2: 0.2, // major 2nd
  3: 0.85, // minor 3rd
  4: 0.9, // major 3rd
  5: 0.7, // perfect 4th
  6: 0.1, // tritone
  7: 0.95, // perfect 5th
  8: 0.55, // minor 6th
  9: 0.75, // major 6th
  10: 0.3, // minor 7th
  11: 0.25, // major 7th
};

const SEMITONE_NAMES: Record<number, string> = {
  0: "unison",
  1: "minor 2nd",
  2: "major 2nd",
  3: "minor 3rd",
  4: "major 3rd",
  5: "perfect 4th",
  6: "tritone",
  7: "perfect 5th",
  8: "minor 6th",
  9: "major 6th",
  10: "minor 7th",
  11: "major 7th",
};

export function semitoneConsonance(semitones: number): number {
  return SEMITONE_CONSONANCE[semitones] ?? 0.5;
}

export function semitoneIntervalName(semitones: number): string {
  return SEMITONE_NAMES[semitones] ?? `${semitones} semitones`;
}

export function pairDissonance(pcA: number, pcB: number): number {
  return 1 - semitoneConsonance(semitonesBetween(pcA, pcB));
}

export function analyzeChordIntervals(pitchClasses: number[]): {
  meanDissonance: number;
  peakDissonance: number;
  harshPairCount: number;
} {
  const pcs = getPitchClasses(pitchClasses);
  if (pcs.length < 2) {
    return { meanDissonance: 0, peakDissonance: 0, harshPairCount: 0 };
  }

  let total = 0;
  let peak = 0;
  let harsh = 0;
  let pairs = 0;

  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      const d = pairDissonance(pcs[i], pcs[j]);
      total += d;
      peak = Math.max(peak, d);
      if (d >= 0.7) harsh++;
      pairs++;
    }
  }

  return {
    meanDissonance: total / pairs,
    peakDissonance: peak,
    harshPairCount: harsh,
  };
}

export function intervalQualityLabel(pcA: number, pcB: number): string {
  const semitones = semitonesBetween(pcA, pcB);
  const name = semitoneIntervalName(semitones);
  const c = semitoneConsonance(semitones);
  if (c >= 0.75) return `${name} (consonant)`;
  if (c >= 0.45) return `${name} (neutral)`;
  return `${name} (dissonant)`;
}
