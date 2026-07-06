import { Note } from "tonal";

const DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6] as const;

export function midiToDiatonicStep(midi: number): number {
  const octave = Math.floor(midi / 12) - 1;
  const chroma = ((midi % 12) + 12) % 12;
  return octave * 7 + DIATONIC[chroma];
}

const TREBLE_BOTTOM = midiToDiatonicStep(64);
const TREBLE_TOP = midiToDiatonicStep(77);
const BASS_BOTTOM = midiToDiatonicStep(43);
const BASS_TOP = midiToDiatonicStep(57);

export type StaffClef = "treble" | "bass";

export function clefForMidi(midi: number): StaffClef {
  return midiToDiatonicStep(midi) < 28 ? "bass" : "treble";
}

export function staffY(
  midi: number,
  clef: StaffClef,
  topY: number,
  halfStep: number
): number {
  const step = midiToDiatonicStep(midi);
  const top = clef === "treble" ? TREBLE_TOP : BASS_TOP;
  return topY + (top - step) * halfStep;
}

export function ledgerLineYs(
  midi: number,
  clef: StaffClef,
  topY: number,
  halfStep: number
): number[] {
  const step = midiToDiatonicStep(midi);
  const bottom = clef === "treble" ? TREBLE_BOTTOM : BASS_BOTTOM;
  const top = clef === "treble" ? TREBLE_TOP : BASS_TOP;
  const lines: number[] = [];
  if (step < bottom) {
    for (let s = bottom - 2; s >= step; s -= 2) {
      lines.push(topY + (top - s) * halfStep);
    }
  }
  if (step > top) {
    for (let s = top + 2; s <= step; s += 2) {
      lines.push(topY + (top - s) * halfStep);
    }
  }
  return lines;
}

export function noteHasAccidental(name: string): boolean {
  return name.includes("#") || name.includes("b");
}

export function accidentalGlyph(name: string): string {
  if (name.includes("#")) return "\u266F";
  if (name.includes("b")) return "\u266D";
  return "";
}
