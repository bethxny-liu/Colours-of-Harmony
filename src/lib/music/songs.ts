import { Note } from "tonal";
import { computeChordMetrics } from "./scoring";
import { describeTension } from "./insights";

export interface SongMoment {
  /** Plain English: what's happening at this point in the song */
  summary: string;
  baseChord: {
    label: string;
    pitchClasses: number[];
    voicing: string[];
  };
  plainMelody: string[];
  /** What the "coloured" demo adds — in simple terms */
  colourDemo: {
    buttonLabel: string;
    whatYouHear: string;
    notes: string[];
  };
  highlightChromas: number[];
}

export interface Song {
  id: string;
  title: string;
  subtitle: string;
  moments: SongMoment[];
}

function part(
  summary: string,
  label: string,
  pitchClasses: number[],
  voicing: string[],
  plainMelody: string[],
  colourDemo: SongMoment["colourDemo"],
  highlightChromas: number[]
): SongMoment {
  return {
    summary,
    baseChord: { label, pitchClasses, voicing },
    plainMelody,
    colourDemo,
    highlightChromas,
  };
}

export const SONGS: Song[] = [
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    subtitle: "Pick a part of the song, hear it, then colour the chord yourself",
    moments: [
      part(
        "The song opens on a C major chord. The melody sits on top while C–E–G holds underneath.",
        "C major",
        [0, 4, 7],
        ["C3", "E3", "G3"],
        ["E4", "D4", "C4", "E4", "G4", "G4", "C5"],
        {
          buttonLabel: "With sliding notes",
          whatYouHear:
            "Same chord, but the melody slides down note-by-note (G → G♭ → F → E…) instead of jumping. That's one way to add colour.",
          notes: ["G4", "Gb4", "F4", "E4", "Eb4", "D4", "Db4", "C4"],
        },
        [11, 2, 5, 9]
      ),
      part(
        "The harmony moves to F major. Three new notes — F, A, and C — become your new home base.",
        "F major",
        [5, 9, 0],
        ["F3", "A3", "C4"],
        ["E5", "E5", "D4", "C4", "A3", "F4", "F4", "D4"],
        {
          buttonLabel: "With sliding notes",
          whatYouHear:
            "The F chord stays put while the top line creeps down chromatically — a smooth, slightly bittersweet effect.",
          notes: ["E5", "Eb5", "D5", "Db5", "C5", "B4", "Bb4", "A4"],
        },
        [11, 1, 4, 6]
      ),
      part(
        "The song passes through G major before heading back to C. G–B–D creates tension that wants to resolve.",
        "G major",
        [7, 11, 2],
        ["G2", "B2", "D3"],
        ["C5", "C5", "G4", "E4", "C4", "G4", "G4", "E4", "C4"],
        {
          buttonLabel: "With sliding notes",
          whatYouHear:
            "Chromatic neighbours around B pull the ear toward C. It's a classic 'leading' moment in the song.",
          notes: ["B4", "Bb4", "A4", "Ab4", "G4", "Gb4", "F4", "E4"],
        },
        [11, 1, 6, 0]
      ),
    ],
  },
];

export function voicingToMidis(voicing: string[]): number[] {
  return voicing
    .map((n) => Note.midi(n))
    .filter((m): m is number => m != null);
}

export function getActiveSong(id: string): Song {
  return SONGS.find((s) => s.id === id) ?? SONGS[0];
}

export function momentTension(pitchClasses: number[]): number {
  return computeChordMetrics(pitchClasses, [], pitchClasses).tension;
}

export function momentEmotion(pitchClasses: number[]): string {
  return describeTension(momentTension(pitchClasses));
}
