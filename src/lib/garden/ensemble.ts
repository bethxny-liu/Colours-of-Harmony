import { HOME, describe, gardenSeeds, inGarden, neighbors, pitch, position, seedKey, voice, type Fold, type Seed } from "./music";
import type { GardenAudio } from "./audio";

export type GardenMode = "chords" | "melody" | "beat" | "pond" | "home";
export type HomeKey = "C" | "G" | "Am";
export type Phrase = "return" | "away" | null;
export type Ensemble = {
  bpm: number;
  melodyOn: boolean;
  beatOn: boolean;
  pondOn: boolean;
  fullScale: boolean;
  melody: (number | null)[];
  rhythm: boolean[];
  pond: [number, number];
  home: HomeKey;
};
export const DEFAULT_ENSEMBLE: Ensemble = {
  bpm: 84, melodyOn: false, beatOn: false, pondOn: false, fullScale: false,
  melody: [0, 2, 4, 7, 9, 7, 4, null],
  rhythm: [true, false, false, false, true, false, false, false],
  pond: [3, 4], home: "C",
};
export const BEATS = ["1", "&", "2", "&", "3", "&", "4", "&"];
const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const HOMES = {
  C: { root: 0, minor: false, name: "C major" },
  G: { root: 7, minor: false, name: "G major" },
  Am: { root: 9, minor: true, name: "A minor" },
};
const faces: Fold[] = [];
const seen = new Set<string>();
const queue: Fold[] = [HOME];
while (queue.length) {
  const fold = queue.shift()!;
  const key = fold.map(seedKey).sort().join("|");
  if (seen.has(key)) continue;
  seen.add(key); faces.push(fold);
  neighbors(fold).filter(move => move.allowed).forEach(move => queue.push(move.next));
}

export function findChord(root: number, minor: boolean): Fold {
  const matches = faces.filter(fold => {
    const chord = describe(fold);
    return chord.root === ((root % 12) + 12) % 12 && chord.quality === (minor ? "minor" : "major");
  });
  matches.sort((a, b) => center(a).length - center(b).length);
  if (!matches.length) throw new Error("That chord is outside this garden.");
  return matches[0];
}
export function center(fold: Fold) {
  const points = fold.map(position);
  const x = points.reduce((sum, p) => sum + p.x, 0) / 3;
  const z = points.reduce((sum, p) => sum + p.z, 0) / 3;
  return { x, z, length: Math.hypot(x, z) };
}
export function homeFold(key: HomeKey) { const home = HOMES[key]; return findChord(home.root, home.minor); }
export function cadence(key: HomeKey, ending: Exclude<Phrase, null>): Fold[] {
  const home = HOMES[key];
  const path = [homeFold(key), findChord(home.root + 5, home.minor), findChord(home.root + 7, false)];
  return ending === "return" ? [...path, homeFold(key)] : path;
}
export function scale(config: Ensemble) {
  const minor = HOMES[config.home].minor;
  return config.fullScale ? (minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]) : (minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9]);
}
export function melodyName(offset: number | null, home: HomeKey) { return offset === null ? "Rest" : NAMES[(HOMES[home].root + offset) % 12]; }
export function normalizeMelody(config: Ensemble): Ensemble {
  const available = scale(config);
  return { ...config, melody: config.melody.map(note => note === null ? null : available.reduce((a, b) => Math.abs(b - note) < Math.abs(a - note) ? b : a)) };
}
export function flowerFor(offset: number, home: HomeKey): Seed {
  const pc = (HOMES[home].root + offset) % 12;
  return gardenSeeds().filter(seed => pitch(seed) === pc).sort((a, b) => {
    const pa = position(a), pb = position(b);
    return Math.hypot(pa.x, pa.z) - Math.hypot(pb.x, pb.z);
  })[0];
}
export function offsetForFlower(seed: Seed, config: Ensemble) {
  const offset = (pitch(seed) - HOMES[config.home].root + 12) % 12;
  return inGarden(seed) && scale(config).includes(offset) ? offset : null;
}

type ScoreEvent = {
  beat: number;
  kind: "step" | "melody" | "beat" | "chord" | "pond";
  index: number;
  notes?: number[];
};
/** One bar is four quarter notes; melody and chord stones use eighth-note subdivisions. */
export function scoreBar(config: Ensemble, fold: Fold, previous: number[], phrase: Phrase = null) {
  const notes = voice(fold, previous);
  const events: ScoreEvent[] = [];
  for (let i = 0; i < 8; i++) {
    events.push({ beat: i / 2, kind: "step", index: i });
    const offset = config.melody[i];
    if (config.melodyOn && offset !== null && offset !== undefined) events.push({ beat: i / 2, kind: "melody", index: i, notes: [72 + HOMES[config.home].root + offset] });
    const hit = phrase ? i === 0 : config.rhythm[i];
    if (hit && (config.melodyOn || config.beatOn || phrase)) events.push({ beat: i / 2, kind: "chord", index: i, notes });
  }
  if (config.beatOn) for (let i = 0; i < 4; i++) events.push({ beat: i, kind: "beat", index: i });
  if (config.pondOn) config.pond.forEach((count, ring) => {
    for (let i = 0; i < count; i++) events.push({ beat: i * 4 / count, kind: "pond", index: ring, notes: [ring ? 79 : 72] });
  });
  return { notes, events: events.sort((a, b) => a.beat - b.beat) };
}

export type PerformanceFrame = {
  running: boolean; bar: number; step: number; phase: number; flight: number;
  previous: Seed | null; landing: Seed | null; next: Seed | null; beatPulse: number;
  pondPhase: [number, number]; pondPulse: [number, number];
};
export const QUIET_FRAME: PerformanceFrame = { running: false, bar: 0, step: -1, phase: 0, flight: 0, previous: null, landing: null, next: null, beatPulse: 0, pondPhase: [0, 0], pondPulse: [0, 0] };

/** Audio is scheduled ahead on the AudioContext clock. Drawing and UI only observe that clock. */
export class GardenTransport {
  private interval: ReturnType<typeof setInterval> | null = null;
  private config = DEFAULT_ENSEMBLE;
  private progression: Fold[] = [HOME];
  private phrase: Phrase = null;
  private origin = 0;
  private nextBar = 0;
  private lastStep = -1;
  private voiced = [60, 67, 64];
  private active = false;
  private once = false;
  private onStep: (frame: PerformanceFrame, fold: Fold) => void;
  private onFinish: () => void;

  constructor(private audio: GardenAudio, onStep: (frame: PerformanceFrame, fold: Fold) => void, onFinish: () => void) {
    this.onStep = onStep; this.onFinish = onFinish;
  }
  start(config: Ensemble, progression: Fold[], phrase: Phrase = null, once = false) {
    this.stop();
    this.config = config;
    this.progression = phrase ? cadence(config.home, phrase) : progression.length ? progression : [HOME];
    this.phrase = phrase; this.once = once || !!phrase; this.origin = this.audio.now + .09;
    this.nextBar = 0; this.lastStep = -1; this.voiced = voice(this.progression[0]); this.active = true;
    this.pump(); this.interval = setInterval(() => this.pump(), 25);
  }
  private pump() {
    if (!this.active) return;
    const seconds = 60 / this.config.bpm;
    const duration = 4 * seconds;
    const now = this.audio.now;
    // A suspended browser must not burst a backlog of notes on its next tick.
    while (this.origin + this.nextBar * duration < now - .15) this.nextBar++;
    while (this.origin + this.nextBar * duration < now + .12 && (!this.once || this.nextBar < this.progression.length)) {
      const start = this.origin + this.nextBar * duration;
      const fold = this.progression[this.nextBar % this.progression.length];
      const score = scoreBar(this.config, fold, this.voiced, this.phrase);
      this.voiced = score.notes;
      for (const event of score.events) {
        const when = start + event.beat * seconds;
        if (when < now - .025) continue;
        if (event.kind === "melody") this.audio.noteAt(event.notes![0], when, .85, .62);
        if (event.kind === "chord") this.audio.chordAt(event.notes!, when, .42);
        if (event.kind === "beat") this.audio.tapAt(when, event.index === 0);
        if (event.kind === "pond") this.audio.noteAt(event.notes![0], when, .3, .36);
      }
      this.nextBar++;
    }
    const elapsed = this.audio.visualNow - this.origin;
    if (elapsed < 0) return;
    if (this.once && elapsed >= this.progression.length * duration) {
      this.active = false;
      if (this.interval) clearInterval(this.interval);
      this.interval = null;
      this.onFinish(); return;
    }
    const step = Math.floor(elapsed / (seconds / 2));
    if (step !== this.lastStep) {
      this.lastStep = step;
      const frame = this.frame();
      this.onStep(frame, this.progression[frame.bar % this.progression.length]);
    }
  }
  frame(): PerformanceFrame {
    if (!this.active) return QUIET_FRAME;
    const seconds = 60 / this.config.bpm;
    const elapsed = this.audio.visualNow - this.origin;
    if (elapsed < 0) return { ...QUIET_FRAME, running: true };
    const halfBeats = elapsed / (seconds / 2);
    const index = Math.floor(halfBeats);
    const step = index % 8;
    const phase = (elapsed / (4 * seconds)) % 1;
    const note = this.config.melody[step];
    let previous: Seed | null = null;
    for (let distance = 1; distance <= Math.min(index, 8); distance++) {
      const offset = this.config.melody[(index - distance) % 8];
      if (offset !== null && offset !== undefined) { previous = flowerFor(offset, this.config.home); break; }
    }
    const pondPhase = this.config.pond.map(count => phase * count % 1) as [number, number];
    return {
      running: true, bar: Math.floor(elapsed / (4 * seconds)), step, phase,
      // Audio lands on the beat; the butterfly travels toward the NEXT landing between onsets.
      flight: halfBeats % 1, previous,
      landing: this.config.melodyOn && note !== null && note !== undefined ? flowerFor(note, this.config.home) : null,
      next: this.config.melodyOn && this.config.melody[(step + 1) % 8] !== null ? flowerFor(this.config.melody[(step + 1) % 8]!, this.config.home) : null,
      beatPulse: this.config.beatOn ? Math.max(0, 1 - (elapsed % seconds) / .18) : 0,
      pondPhase, pondPulse: pondPhase.map((p, i) => this.config.pondOn ? Math.max(0, 1 - p * 4 * seconds / this.config.pond[i] / .25) : 0) as [number, number],
    };
  }
  stop() {
    this.active = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null; this.audio.stop();
  }
  dispose() { this.stop(); }
}
