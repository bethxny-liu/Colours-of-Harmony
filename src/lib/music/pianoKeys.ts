import { Note } from "tonal";

export const PIANO_START_OCTAVE = 3;
export const PIANO_END_OCTAVE = 5;

const WHITE = ["C", "D", "E", "F", "G", "A", "B"] as const;
const BLACK_AFTER: Record<string, string> = {
  C: "C#",
  D: "D#",
  F: "F#",
  G: "G#",
  A: "A#",
};

export interface PianoKey {
  midi: number;
  name: string;
  isBlack: boolean;
  octave: number;
  chroma: number;
}

export function buildPianoKeys(
  startOctave = PIANO_START_OCTAVE,
  endOctave = PIANO_END_OCTAVE
): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (const white of WHITE) {
      const name = `${white}${octave}`;
      const midi = Note.midi(name);
      if (midi == null) continue;
      keys.push({
        midi,
        name,
        isBlack: false,
        octave,
        chroma: Note.chroma(name) ?? 0,
      });
      const black = BLACK_AFTER[white];
      if (black) {
        const blackName = `${black}${octave}`;
        const blackMidi = Note.midi(blackName);
        if (blackMidi != null) {
          keys.push({
            midi: blackMidi,
            name: blackName,
            isBlack: true,
            octave,
            chroma: Note.chroma(blackName) ?? 0,
          });
        }
      }
    }
  }
  return keys;
}

export const PIANO_KEYS = buildPianoKeys();

export function whiteKeysOnly(keys: PianoKey[] = PIANO_KEYS): PianoKey[] {
  return keys.filter((k) => !k.isBlack);
}
