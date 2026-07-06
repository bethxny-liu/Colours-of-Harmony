"use client";

import { create } from "zustand";
import { Note } from "tonal";
import { initAudio, playChord, playSongDemo } from "@/lib/audio/engine";
import {
  DEFAULT_CHORD_TYPE,
  DEFAULT_ROOT,
  KEY_TO_CHROMA,
} from "@/lib/music/constants";
import {
  getActiveSong,
  voicingToMidis,
  type Song,
} from "@/lib/music/songs";
import { computeAllEffects, computeChordMetrics } from "@/lib/music/scoring";
import {
  buildChord,
  chordFromPitchClasses,
  cycleRoot,
  midiForChromaOctave,
  midisToNoteNames,
  midisToPitchClasses,
  voicingFromPitchClasses,
  toggleMidi,
} from "@/lib/music/theory";
import type {
  ChordMetrics,
  ChordState,
  HarmonicEffect,
} from "@/lib/music/types";

export type AppMode = "explore" | "song";

interface HarmonyStore {
  root: string;
  chordType: string;
  activeMidis: number[];
  pitchClasses: number[];
  basePitchClasses: number[];
  previousPitchClasses: number[];
  hoveredMidi: number | null;
  hoveredChroma: number | null;
  previewMidi: number | null;
  audioReady: boolean;
  history: string[];

  mode: AppMode;
  activeSongId: string;
  songMomentIndex: number;

  chord: ChordState;
  effects: HarmonicEffect[];
  metrics: ChordMetrics;

  init: () => Promise<void>;
  toggleMidi: (midi: number, previewOnly?: boolean) => void;
  toggleNote: (chroma: number, previewOnly?: boolean) => void;
  setHoveredMidi: (midi: number | null) => void;
  resetChord: () => void;
  cycleRoot: (direction: 1 | -1) => void;
  setMode: (mode: AppMode) => void;
  selectSong: (songId: string) => void;
  goToMoment: (index: number) => void;
  nextMoment: () => void;
  prevMoment: () => void;
  playPlainDemo: () => void;
  playColorDemo: () => void;
  addChroma: (chroma: number) => void;
  loadProgressionChord: (pitchClasses: number[]) => void;
  handleKey: (key: string, shiftKey: boolean) => void;
}

function deriveState(
  activeMidis: number[],
  previousMidis: number[],
  basePitchClasses: number[],
  root: string,
  chordType: string,
  history: string[]
) {
  const pitchClasses = midisToPitchClasses(activeMidis);
  const previousPitchClasses = midisToPitchClasses(previousMidis);
  const chord = {
    ...chordFromPitchClasses(pitchClasses, root, chordType),
    notes: midisToNoteNames(activeMidis),
  };
  const effects = computeAllEffects(pitchClasses, basePitchClasses, root);
  const metrics = computeChordMetrics(
    pitchClasses,
    previousPitchClasses,
    basePitchClasses
  );
  return { chord, effects, metrics, history, pitchClasses, previousPitchClasses };
}

function loadMoment(song: Song, index: number, root: string, chordType: string) {
  const moment = song.moments[index];
  if (!moment) {
    return {
      songMomentIndex: 0,
      activeMidis: [] as number[],
      basePitchClasses: [] as number[],
      ...deriveState([], [], [], root, chordType, []),
    };
  }
  const midis = voicingToMidis(moment.baseChord.voicing);
  const derived = deriveState(
    midis,
    [],
    moment.baseChord.pitchClasses,
    root,
    chordType,
    [moment.baseChord.label]
  );
  return {
    songMomentIndex: index,
    activeMidis: midis,
    basePitchClasses: moment.baseChord.pitchClasses,
    previewMidi: null,
    ...derived,
  };
}

function initialMidisFromChord(): number[] {
  const chord = buildChord(DEFAULT_ROOT, DEFAULT_CHORD_TYPE);
  return chord.notes
    .map((n) => Note.midi(n))
    .filter((m): m is number => m != null);
}

const initialMidis = initialMidisFromChord();
const initialDerived = deriveState(
  initialMidis,
  initialMidis,
  midisToPitchClasses(initialMidis),
  DEFAULT_ROOT,
  DEFAULT_CHORD_TYPE,
  [buildChord(DEFAULT_ROOT, DEFAULT_CHORD_TYPE).label]
);

export const useHarmonyStore = create<HarmonyStore>((set, get) => ({
  root: DEFAULT_ROOT,
  chordType: DEFAULT_CHORD_TYPE,
  activeMidis: initialMidis,
  pitchClasses: initialDerived.pitchClasses,
  basePitchClasses: initialDerived.pitchClasses,
  previousPitchClasses: initialDerived.pitchClasses,
  hoveredMidi: null,
  hoveredChroma: null,
  previewMidi: null,
  audioReady: false,
  history: initialDerived.history,

  mode: "explore",
  activeSongId: "amazing-grace",
  songMomentIndex: 0,

  chord: initialDerived.chord,
  effects: initialDerived.effects,
  metrics: initialDerived.metrics,

  init: async () => {
    const ready = await initAudio();
    set({ audioReady: ready });
  },

  toggleMidi: (midi, previewOnly = false) => {
    const state = get();
    const noteName = Note.fromMidi(midi);
    if (!noteName) return;
    const chroma = Note.chroma(noteName) ?? 0;

    if (previewOnly) {
      set({ previewMidi: midi, hoveredChroma: chroma });
      void playChord([noteName], "preview");
      return;
    }

    const nextMidis = toggleMidi(state.activeMidis, midi);
    const derived = deriveState(
      nextMidis,
      state.activeMidis,
      state.basePitchClasses,
      state.root,
      state.chordType,
      [
        ...state.history.slice(-11),
        chordFromPitchClasses(
          midisToPitchClasses(nextMidis),
          state.root,
          state.chordType
        ).label,
      ]
    );

    set({
      activeMidis: nextMidis,
      previewMidi: null,
      hoveredChroma: chroma,
      ...derived,
    });

    void playChord(derived.chord.notes, "block");
  },

  loadProgressionChord: (targetPcs) => {
    const state = get();
    const pcs = [...targetPcs].sort((a, b) => a - b);
    const detected = chordFromPitchClasses(pcs, state.root, state.chordType);
    const names = voicingFromPitchClasses(pcs, 4);
    const midis = names
      .map((n) => Note.midi(n))
      .filter((m): m is number => m != null);
    const derived = deriveState(
      midis,
      state.activeMidis,
      pcs,
      detected.root,
      detected.type,
      [...state.history.slice(-11), detected.label]
    );
    set({
      root: detected.root,
      chordType: detected.type,
      activeMidis: midis,
      basePitchClasses: pcs,
      previewMidi: null,
      ...derived,
    });
    void playChord(derived.chord.notes, "block");
  },

  toggleNote: (chroma, previewOnly = false) => {
    const midi = midiForChromaOctave(chroma);
    if (midi != null) get().toggleMidi(midi, previewOnly);
  },

  addChroma: (chroma) => {
    const midi = midiForChromaOctave(chroma);
    if (midi == null) return;
    const state = get();
    if (state.activeMidis.some((m) => (Note.chroma(Note.fromMidi(m) ?? "") ?? -1) === chroma)) {
      return;
    }
    get().toggleMidi(midi, false);
  },

  setHoveredMidi: (midi) => {
    if (midi === null) {
      set({ hoveredMidi: null, hoveredChroma: null });
      return;
    }
    const name = Note.fromMidi(midi);
    set({
      hoveredMidi: midi,
      hoveredChroma: name ? (Note.chroma(name) ?? null) : null,
    });
  },

  resetChord: () => {
    const state = get();
    if (state.mode === "song") {
      const song = getActiveSong(state.activeSongId);
      set(loadMoment(song, state.songMomentIndex, state.root, state.chordType));
      return;
    }
    const base = buildChord(state.root, state.chordType);
    const baseMidis = base.notes
      .map((n) => Note.midi(n))
      .filter((m): m is number => m != null);
    const derived = deriveState(
      baseMidis,
      state.activeMidis,
      base.pitchClasses,
      state.root,
      state.chordType,
      [...state.history.slice(-11), base.label]
    );
    set({
      activeMidis: baseMidis,
      basePitchClasses: base.pitchClasses,
      previewMidi: null,
      ...derived,
    });
    void playChord(derived.chord.notes, "block");
  },

  cycleRoot: (direction) => {
    const state = get();
    const newRoot = cycleRoot(state.root, direction);
    const base = buildChord(newRoot, state.chordType);
    const baseMidis = base.notes
      .map((n) => Note.midi(n))
      .filter((m): m is number => m != null);
    const derived = deriveState(
      baseMidis,
      state.activeMidis,
      base.pitchClasses,
      newRoot,
      state.chordType,
      [...state.history.slice(-11), base.label]
    );
    set({
      root: newRoot,
      activeMidis: baseMidis,
      basePitchClasses: base.pitchClasses,
      previewMidi: null,
      ...derived,
    });
    void playChord(derived.chord.notes, "block");
  },

  setMode: (mode) => {
    set({ mode });
    if (mode === "song") {
      get().selectSong(get().activeSongId);
    } else {
      const base = buildChord(get().root, get().chordType);
      const baseMidis = base.notes
        .map((n) => Note.midi(n))
        .filter((m): m is number => m != null);
      const derived = deriveState(
        baseMidis,
        get().activeMidis,
        base.pitchClasses,
        get().root,
        get().chordType,
        get().history
      );
      set({ activeMidis: baseMidis, ...derived });
    }
  },

  playPlainDemo: () => {
    const state = get();
    if (state.mode !== "song") return;
    const song = getActiveSong(state.activeSongId);
    const moment = song.moments[state.songMomentIndex];
    if (!moment) return;
    void playSongDemo(moment.baseChord.voicing, moment.plainMelody, 0.34);
  },

  playColorDemo: () => {
    const state = get();
    if (state.mode !== "song") return;
    const song = getActiveSong(state.activeSongId);
    const moment = song.moments[state.songMomentIndex];
    if (!moment) return;
    void playSongDemo(moment.baseChord.voicing, moment.colourDemo.notes, 0.28);
  },

  selectSong: (songId) => {
    const song = getActiveSong(songId);
    set({
      activeSongId: songId,
      ...loadMoment(song, 0, get().root, get().chordType),
    });
  },

  goToMoment: (index) => {
    const state = get();
    const song = getActiveSong(state.activeSongId);
    if (index < 0 || index >= song.moments.length) return;
    set({
      ...loadMoment(song, index, state.root, state.chordType),
    });
  },

  nextMoment: () => {
    const state = get();
    const song = getActiveSong(state.activeSongId);
    const next = (state.songMomentIndex + 1) % song.moments.length;
    get().goToMoment(next);
  },

  prevMoment: () => {
    const state = get();
    const song = getActiveSong(state.activeSongId);
    const prev =
      (state.songMomentIndex - 1 + song.moments.length) % song.moments.length;
    get().goToMoment(prev);
  },

  handleKey: (key, shiftKey) => {
    if (key === " ") {
      get().resetChord();
      return;
    }
    if (key === "ArrowLeft") {
      if (get().mode === "song") get().prevMoment();
      else get().cycleRoot(-1);
      return;
    }
    if (key === "ArrowRight") {
      if (get().mode === "song") get().nextMoment();
      else get().cycleRoot(1);
      return;
    }
    const chroma = KEY_TO_CHROMA[key.toLowerCase()];
    if (chroma !== undefined) {
      get().toggleNote(chroma, shiftKey);
    }
  },
}));
