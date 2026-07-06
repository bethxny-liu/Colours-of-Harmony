export const PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type PitchClassName = (typeof PITCH_CLASSES)[number];

export const MAIN_OCTAVE = 4;

export const KEY_TO_CHROMA: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
  i: 8,
  j: 9,
  k: 10,
  l: 11,
};

export const DEFAULT_ROOT = "C";
export const DEFAULT_CHORD_TYPE = "maj7";

export const CHORD_TYPES = [
  "maj",
  "min",
  "maj7",
  "min7",
  "7",
  "dim",
  "aug",
  "sus2",
  "sus4",
  "m7b5",
  "dim7",
] as const;
