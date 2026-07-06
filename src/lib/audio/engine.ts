import * as Tone from "tone";
import type { PlaybackMode } from "../music/types";
import { PIANO_BASE_URL, PIANO_SAMPLE_URLS } from "./pianoSamples";

let sampler: Tone.Sampler | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureAudio(): Promise<void> {
  await Tone.start();

  if (!sampler) {
    const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).toDestination();
    sampler = new Tone.Sampler({
      urls: PIANO_SAMPLE_URLS,
      baseUrl: PIANO_BASE_URL,
      release: 1.2,
      onerror: (err) => console.warn("Piano sample load error:", err),
    }).connect(reverb);

    loadPromise = Tone.loaded();
  }

  if (loadPromise) await loadPromise;
}

export async function initAudio(): Promise<boolean> {
  try {
    await ensureAudio();
    return true;
  } catch {
    return false;
  }
}

export async function playChord(
  notes: string[],
  mode: PlaybackMode = "block"
): Promise<void> {
  if (!notes.length) return;
  await ensureAudio();
  if (!sampler) return;

  sampler.releaseAll();

  if (mode === "block") {
    const now = Tone.now();
    sampler.triggerAttackRelease(notes, "2n", now);
    return;
  }

  if (mode === "preview") {
    const note = notes[notes.length - 1];
    sampler.triggerAttackRelease(note, "8n");
    return;
  }

  const now = Tone.now();
  notes.forEach((note, i) => {
    sampler!.triggerAttackRelease(note, "4n", now + i * 0.11);
  });
}

export async function playNote(note: string): Promise<void> {
  await ensureAudio();
  sampler?.triggerAttackRelease(note, "8n");
}

/** Melody over a sustained chord voicing */
export async function playSongDemo(
  chordNotes: string[],
  melodyNotes: string[],
  beatSec = 0.36
): Promise<void> {
  if (!melodyNotes.length && !chordNotes.length) return;
  await ensureAudio();
  if (!sampler) return;

  sampler.releaseAll();
  const now = Tone.now();

  chordNotes.forEach((note) => sampler!.triggerAttack(note, now));

  melodyNotes.forEach((note, i) => {
    sampler!.triggerAttackRelease(note, "8n", now + 0.06 + i * beatSec);
  });

  const end = now + 0.06 + melodyNotes.length * beatSec + 0.8;
  chordNotes.forEach((note) => sampler!.triggerRelease(note, end));
}

export function stopAll(): void {
  sampler?.releaseAll();
}
