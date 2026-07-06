import { Chord, Key, Note } from "tonal";
import { chromaToName, getPitchClasses } from "./theory";

export interface ProgressionChord {
  roman: string;
  label: string;
  pitchClasses: number[];
  hint: string;
}

const MAJOR_SUGGESTIONS = [
  { roman: "I", idx: 0, hint: "Home base" },
  { roman: "IV", idx: 3, hint: "Opens the harmony" },
  { roman: "V", idx: 4, hint: "Pulls back to I" },
  { roman: "vi", idx: 5, hint: "Softer contrast" },
  { roman: "ii", idx: 1, hint: "Leads into V" },
] as const;

const MINOR_SUGGESTIONS = [
  { roman: "i", idx: 0, hint: "Home base" },
  { roman: "VI", idx: 5, hint: "Major lift" },
  { roman: "VII", idx: 6, hint: "Forward motion" },
  { roman: "III", idx: 2, hint: "Bright colour" },
  { roman: "iv", idx: 3, hint: "Darker shade" },
] as const;

function pitchClassSetKey(pcs: number[]): string {
  return [...pcs].sort((a, b) => a - b).join(",");
}

function chordPitchClasses(symbol: string): number[] {
  const chord = Chord.get(symbol);
  if (chord.empty || !chord.notes.length) return [];
  return getPitchClasses(
    chord.notes.map((n) => Note.chroma(n) ?? 0)
  );
}

export function inferKey(pitchClasses: number[]): {
  root: string;
  mode: "major" | "minor";
} {
  const pcs = getPitchClasses(pitchClasses);
  const names = pcs.map(chromaToName);
  const detected = Chord.detect(names, { assumePerfectFifth: true });

  if (detected.length > 0) {
    const match = Chord.get(detected[0]);
    const root = match.tonic ?? chromaToName(pcs[0]);
    const type = match.type ?? "";
    const isMinor =
      type.includes("m") &&
      !type.includes("maj") &&
      !type.includes("dim") &&
      type !== "mM7";
    if (type === "dim" || type === "m7b5") {
      return { root, mode: "minor" };
    }
    return { root, mode: isMinor ? "minor" : "major" };
  }

  return { root: chromaToName(pcs[0]), mode: "major" };
}

export function suggestProgressions(pitchClasses: number[]): {
  keyLabel: string;
  chords: ProgressionChord[];
} {
  const pcs = getPitchClasses(pitchClasses);
  if (pcs.length < 2) {
    return { keyLabel: "—", chords: [] };
  }

  const { root, mode } = inferKey(pcs);
  const keyData =
    mode === "major" ? Key.majorKey(root) : Key.minorKey(root).natural;
  const keyLabel = `${root} ${mode}`;
  const templates = mode === "major" ? MAJOR_SUGGESTIONS : MINOR_SUGGESTIONS;
  const currentKey = pitchClassSetKey(pcs);

  const chords: ProgressionChord[] = [];
  for (const { roman, idx, hint } of templates) {
    const symbol = keyData.triads[idx];
    if (!symbol) continue;
    const triadPcs = chordPitchClasses(symbol);
    if (triadPcs.length < 3) continue;
    if (pitchClassSetKey(triadPcs) === currentKey) continue;
    const label = Chord.get(symbol).name || symbol;
    chords.push({ roman, label, pitchClasses: triadPcs, hint });
  }

  return { keyLabel, chords };
}
