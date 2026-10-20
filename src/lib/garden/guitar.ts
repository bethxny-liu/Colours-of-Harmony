import type { GardenAudio } from "./audio";

export const GUITAR_LANES = [
  { key: "ArrowLeft", arrow: "←", name: "Left" },
  { key: "ArrowDown", arrow: "↓", name: "Down" },
  { key: "ArrowUp", arrow: "↑", name: "Up" },
  { key: "ArrowRight", arrow: "→", name: "Right" },
] as const;
export type GuitarLevel = "stroll" | "offbeats";
export type GuitarGrade = "perfect" | "good" | "miss";
export type GuitarPhase = "ready" | "countin" | "playing" | "paused" | "complete";
export type GuitarNote = { id: number; lane: number; beat: number; midi: number };
export const HIT_WINDOW = .18;
export const PERFECT_WINDOW = .075;
export const GUITAR_LEVELS = {
  stroll: { name: "Sunlit stroll", bpm: 84, description: "A steady note on each beat." },
  offbeats: { name: "Little offbeats", bpm: 96, description: "A few notes fall between the beats." },
};

/** An authored eight-bar melody. Directions always keep their pitch throughout a session. */
export function guitarChart(level: GuitarLevel, root = 0, minor = false) {
  const pitches = (minor ? [0, 3, 7, 10] : [0, 4, 7, 9]).map(offset => 60 + root + offset);
  const bars = [[0, 1, 2, 1], [3, 2, 1, 0], [1, 2, 3, 2], [2, 1, 2, 3], [0, 1, 2, 3], [3, 2, 1, 3], [2, 1, 2, 1], [2, 1, 0, 0]];
  const notes: GuitarNote[] = [];
  bars.forEach((lanes, bar) => {
    lanes.forEach((lane, beat) => notes.push({ id: notes.length, lane, beat: bar * 4 + beat, midi: pitches[lane] }));
    if (level === "offbeats" && bar > 0 && bar < 7) notes.push({ id: notes.length, lane: lanes[2], beat: bar * 4 + 2.5, midi: pitches[lanes[2]] });
  });
  notes.sort((a, b) => a.beat - b.beat).forEach((note, id) => { note.id = id; });
  const majorChords = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
  const minorChords = [[48, 55, 60, 63], [44, 51, 56, 60], [41, 48, 53, 56], [43, 50, 55, 59]];
  return { notes, pitches, chords: (minor ? minorChords : majorChords).map(chord => chord.map(note => note + root)), bpm: GUITAR_LEVELS[level].bpm, beats: 32 };
}
export type GuitarChart = ReturnType<typeof guitarChart>;

/** One four-beat melody bar at concert pitch; E4 is the bottom line of the treble staff. */
export function melodyBar(chart: GuitarChart, elapsed: number) {
  const beats = Math.max(0, elapsed) * chart.bpm / 60 + 1e-8;
  const index = Math.min(Math.ceil(chart.beats / 4) - 1, Math.floor(beats / 4));
  const beat = Math.min(3.99999, beats - index * 4);
  const notes = chart.notes.filter(note => note.beat >= index * 4 && note.beat < (index + 1) * 4);
  const degrees = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  return {
    index, beat,
    notes: notes.map((note, i) => ({
      ...note,
      step: (Math.floor(note.midi / 12) - 1) * 7 + degrees[note.midi % 12] - 30,
      duration: (notes[i + 1]?.beat ?? (index + 1) * 4) - note.beat,
      current: note.beat - index * 4 <= beat && (notes[i + 1]?.beat ?? (index + 1) * 4) - index * 4 > beat,
    })),
  };
}
export type GuitarSnapshot = {
  phase: GuitarPhase; elapsed: number; lead: number; count: number; beat: number; hits: number;
  perfect: number; good: number; misses: number; strays: number; combo: number; best: number; accuracy: number;
  feedback: string; feedbackKind: GuitarGrade | "stray" | "quiet"; revision: number;
};
export const EMPTY_GUITAR: GuitarSnapshot = { phase: "ready", elapsed: 0, lead: 0, count: 4, beat: 0, hits: 0, perfect: 0, good: 0, misses: 0, strays: 0, combo: 0, best: 0, accuracy: 0, feedback: "Find your little rhythm.", feedbackKind: "quiet", revision: 0 };
type SessionAudio = Pick<GardenAudio, "now" | "visualNow" | "pluckAt" | "tapAt" | "stop">;

/** Scheduling, judging, drawing, and pausing all share the audible AudioContext timeline. */
export class GuitarSession {
  readonly results: (GuitarGrade | null)[];
  private state = { ...EMPTY_GUITAR };
  private origin = 0;
  private frozen = 0;
  private nextBeat = 0;
  private seconds: number;
  constructor(readonly chart: GuitarChart, private audio: SessionAudio) {
    this.results = chart.notes.map(() => null);
    this.seconds = 60 / chart.bpm;
  }
  snapshot(): GuitarSnapshot {
    const running = this.state.phase === "playing" || this.state.phase === "countin";
    const elapsed = running && this.state.phase !== "countin" ? Math.max(0, this.audio.visualNow - this.origin) : this.frozen;
    const lead = this.state.phase === "countin" ? Math.max(0, this.origin + this.frozen - this.audio.visualNow) : 0;
    return { ...this.state, elapsed, lead, beat: Math.floor(elapsed / this.seconds) % 4, count: Math.max(1, Math.min(4, Math.ceil(lead / this.seconds))) };
  }
  start(resume = false) {
    this.audio.stop();
    if (!resume || this.state.phase !== "paused") {
      this.results.fill(null); this.frozen = 0;
      this.state = { ...EMPTY_GUITAR, revision: this.state.revision };
    }
    const countStart = this.audio.now + .1;
    const songStart = countStart + 4 * this.seconds;
    this.origin = songStart - this.frozen;
    this.nextBeat = Math.floor(this.frozen / this.seconds);
    // The count-in is separate from the song, including after a pause.
    for (let beat = 0; beat < 4; beat++) this.audio.tapAt(countStart + beat * this.seconds, beat === 0, .7);
    this.state.phase = "countin"; this.state.feedback = "Four beats to settle in.";
    this.state.feedbackKind = "quiet"; this.state.revision++;
  }
  tick() {
    if (this.state.phase !== "playing" && this.state.phase !== "countin") return;
    // On resume, elapsed must stay frozen until the new count-in is over.
    const songStart = this.origin + this.frozen;
    while (this.nextBeat < this.chart.beats && this.origin + this.nextBeat * this.seconds < this.audio.now + .15) {
      const when = this.origin + this.nextBeat * this.seconds;
      if (when >= Math.max(this.audio.now - .025, songStart - .001)) {
        const bar = Math.floor(this.nextBeat / 4), beat = this.nextBeat % 4;
        const chord = this.chart.chords[[0, 1, 2, 3, 0, 1, 3, 0][bar]];
        this.audio.pluckAt(chord[beat], when, beat === 0 ? .65 : .45);
        this.audio.tapAt(when, beat === 0, .24);
      }
      this.nextBeat++;
    }
    if (this.audio.visualNow < songStart) return;
    if (this.state.phase === "countin") { this.state.phase = "playing"; this.state.feedback = "Follow the notes."; this.state.revision++; }
    const elapsed = this.audio.visualNow - this.origin;
    for (const note of this.chart.notes) {
      if (this.results[note.id] === null && elapsed - note.beat * this.seconds > HIT_WINDOW + 1e-8) {
        this.results[note.id] = "miss"; this.state.misses++; this.state.combo = 0;
        this.state.feedback = "A little late. Catch the next one."; this.state.feedbackKind = "miss"; this.state.revision++;
      }
    }
    if (elapsed >= this.chart.beats * this.seconds + .45) {
      this.frozen = this.chart.beats * this.seconds; this.state.phase = "complete";
      this.audio.stop(); this.state.revision++;
    }
    this.accuracy();
  }
  hit(lane: number): { grade: GuitarGrade; note: GuitarNote; offset: number } | null {
    this.tick();
    if (this.state.phase !== "playing" && !(this.state.phase === "countin" && this.origin + this.frozen - this.audio.visualNow <= HIT_WINDOW + 1e-8)) return null;
    const elapsed = this.audio.visualNow - this.origin;
    const candidates = this.chart.notes.filter(note => this.results[note.id] === null && Math.abs(note.beat * this.seconds - elapsed) <= HIT_WINDOW + 1e-8);
    const note = candidates.filter(note => note.lane === lane).sort((a, b) => Math.abs(a.beat * this.seconds - elapsed) - Math.abs(b.beat * this.seconds - elapsed))[0];
    if (!note) {
      this.state.strays++; this.state.combo = 0;
      this.state.feedback = candidates.length ? `Try ${GUITAR_LANES[candidates[0].lane].arrow}.` : "Listen for the next note.";
      this.state.feedbackKind = "stray"; this.state.revision++; this.accuracy(); return null;
    }
    const offset = elapsed - note.beat * this.seconds;
    const grade = Math.abs(offset) <= PERFECT_WINDOW + 1e-8 ? "perfect" : "good";
    this.results[note.id] = grade; this.state[grade]++; this.state.hits++;
    this.state.combo++; this.state.best = Math.max(this.state.best, this.state.combo);
    const timing = Math.abs(offset) < .015 ? "right on time" : `${Math.round(Math.abs(offset) * 1000)} ms ${offset < 0 ? "early" : "late"}`;
    this.state.feedback = `${grade === "perfect" ? "Lovely" : "Good"} · ${timing}`;
    this.state.feedbackKind = grade; this.state.revision++;
    this.audio.pluckAt(note.midi, this.audio.now, .95); this.accuracy();
    return { grade, note, offset };
  }
  pause() {
    if (this.state.phase !== "playing" && this.state.phase !== "countin") return;
    this.tick();
    if (this.snapshot().phase === "complete") return;
    this.frozen = this.state.phase === "countin" ? this.frozen : this.snapshot().elapsed;
    this.state.phase = "paused"; this.state.revision++; this.audio.stop();
  }
  private accuracy() {
    this.state.accuracy = Math.round((this.state.perfect + this.state.good * .65) / (this.chart.notes.length + this.state.strays) * 100);
  }
}
