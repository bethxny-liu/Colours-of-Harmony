"use client";

import dynamic from "next/dynamic";
import { useEffect, useCallback, useMemo } from "react";
import { HarmonyInsight } from "@/components/HarmonyInsight";
import { SongPanel } from "@/components/SongPanel";
import { ChordStaff } from "@/components/ChordStaff";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import { SONGS } from "@/lib/music/songs";
import { getNoteSuggestions } from "@/lib/music/suggestions";
import { useHarmonyStore } from "@/store/harmonyStore";

const TonnetzGrid = dynamic(
  () => import("@/components/TonnetzGrid").then((m) => m.TonnetzGrid),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[300px] flex items-center justify-center text-white/25 text-sm tracking-wide">
        Loading lattice…
      </div>
    ),
  }
);

export function HarmonyApp() {
  const {
    chord,
    effects,
    metrics,
    activeMidis,
    hoveredMidi,
    hoveredChroma,
    previewMidi,
    previousPitchClasses,
    pitchClasses,
    basePitchClasses,
    audioReady,
    history,
    mode,
    activeSongId,
    songMomentIndex,
    init,
    toggleMidi,
    setHoveredMidi,
    resetChord,
    setMode,
    selectSong,
    playPlainDemo,
    playColorDemo,
    addChroma,
    loadProgressionChord,
    nextMoment,
    prevMoment,
    handleKey,
  } = useHarmonyStore();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        [" ", "ArrowLeft", "ArrowRight"].includes(e.key) ||
        e.key.length === 1
      ) {
        e.preventDefault();
      }
      handleKey(e.key, e.shiftKey);
    },
    [handleKey]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const hoveredEffect =
    hoveredChroma !== null
      ? effects.find((e) => e.chroma === hoveredChroma) ?? null
      : null;

  const song = SONGS.find((s) => s.id === activeSongId);
  const moment = mode === "song" ? song?.moments[songMomentIndex] : undefined;

  const suggestedChromas = useMemo(() => {
    if (mode !== "song" || !moment) return [];
    const root = moment.baseChord.pitchClasses[0];
    const fromPanel = getNoteSuggestions(
      pitchClasses,
      basePitchClasses,
      root,
      4
    ).map((s) => s.chroma);
    return [...new Set([...moment.highlightChromas, ...fromPanel])].filter(
      (c) => !pitchClasses.includes(c)
    );
  }, [mode, moment, pitchClasses, basePitchClasses]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#07070c] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(60,70,130,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.04]">
        <div>
          <h1 className="text-base font-light tracking-[0.3em] uppercase text-white/70">
            Colours of Harmony
          </h1>
          <p className="mt-0.5 text-[10px] text-white/25">
            Add any note to a chord — hear how it feels
          </p>
        </div>
        <button
          onClick={() => void init()}
          className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all border ${
            audioReady
              ? "border-white/10 text-white/40 bg-white/[0.03]"
              : "border-amber-400/30 text-amber-200/70 bg-amber-400/10 hover:bg-amber-400/15"
          }`}
        >
          {audioReady ? "♪ Piano on" : "Enable piano"}
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-stretch gap-3 lg:gap-5 px-3 lg:px-5 py-3 max-w-[1600px] mx-auto w-full min-h-0">
        <aside className="hidden xl:flex flex-col justify-center w-56 shrink-0">
          <HarmonyInsight
            mode={mode}
            chordLabel={chord.label}
            pitchClasses={pitchClasses}
            basePitchClasses={basePitchClasses}
            hoveredEffect={hoveredEffect}
            tension={metrics.tension}
            voiceLeading={metrics.voiceLeading}
            onLoadProgression={(pcs) => {
              if (!audioReady) void init();
              loadProgressionChord(pcs);
            }}
          />
        </aside>

        <div className="flex-1 flex flex-col items-center min-w-0 min-h-0 overflow-y-auto">
          <div className="w-full max-w-2xl shrink-0 sticky top-0 z-20 pt-1 pb-1.5 bg-[#07070c]/92 backdrop-blur-sm border-b border-white/[0.04]">
            <div className="flex flex-col gap-1.5 w-full">
              <ChordStaff
                activeMidis={activeMidis}
                previewMidi={previewMidi}
                hoveredMidi={hoveredMidi}
                effects={effects}
                chordLabel={chord.label}
              />
              <PianoKeyboard
                compact
                activeMidis={activeMidis}
                suggestedChromas={suggestedChromas}
                effects={effects}
                hoveredMidi={hoveredMidi}
                history={history}
                onHover={setHoveredMidi}
                onToggle={(midi, preview) => {
                  if (!audioReady) void init();
                  toggleMidi(midi, preview);
                }}
              />
            </div>
          </div>

          <TonnetzGrid
            effects={effects}
            activeMidis={activeMidis}
            pitchClasses={pitchClasses}
            previousPitchClasses={previousPitchClasses}
            hoveredMidi={hoveredMidi}
            previewMidi={previewMidi}
            suggestedChromas={suggestedChromas}
            onHover={setHoveredMidi}
            onToggle={(midi, preview) => {
              if (!audioReady) void init();
              toggleMidi(midi, preview);
            }}
          />

          <div className="mt-2 text-center">
            <p className="text-lg font-light tracking-widest text-white/60 uppercase">
              {chord.label}
            </p>
            {mode === "song" && moment && (
              <p className="text-xs text-white/35 mt-1 max-w-sm">
                Base: {moment.baseChord.label} — add notes to colour it
              </p>
            )}
            {mode === "explore" && pitchClasses.length <= 3 && (
              <p className="text-xs text-white/30 mt-1">
                Hover the lattice, then click to add a note
              </p>
            )}
          </div>

          <div className="lg:hidden mt-4 w-full max-w-sm space-y-4">
            <SongPanel
              mode={mode}
              activeSongId={activeSongId}
              songMomentIndex={songMomentIndex}
              pitchClasses={pitchClasses}
              basePitchClasses={basePitchClasses}
              onModeChange={setMode}
              onSongSelect={selectSong}
              onPrevMoment={prevMoment}
              onNextMoment={nextMoment}
              onPlayPlain={() => {
                if (!audioReady) void init();
                playPlainDemo();
              }}
              onPlayColor={() => {
                if (!audioReady) void init();
                playColorDemo();
              }}
              onAddChroma={(c) => {
                if (!audioReady) void init();
                addChroma(c);
              }}
            />
            <HarmonyInsight
              mode={mode}
              chordLabel={chord.label}
              pitchClasses={pitchClasses}
              basePitchClasses={basePitchClasses}
              hoveredEffect={hoveredEffect}
              tension={metrics.tension}
              voiceLeading={metrics.voiceLeading}
              onLoadProgression={(pcs) => {
                if (!audioReady) void init();
                loadProgressionChord(pcs);
              }}
            />
          </div>
        </div>

        <aside className="hidden xl:flex flex-col justify-center w-56 shrink-0">
          <SongPanel
            mode={mode}
            activeSongId={activeSongId}
            songMomentIndex={songMomentIndex}
            pitchClasses={pitchClasses}
            basePitchClasses={basePitchClasses}
            onModeChange={setMode}
            onSongSelect={selectSong}
            onPrevMoment={prevMoment}
            onNextMoment={nextMoment}
            onPlayPlain={() => {
              if (!audioReady) void init();
              playPlainDemo();
            }}
            onPlayColor={() => {
              if (!audioReady) void init();
              playColorDemo();
            }}
            onAddChroma={(c) => {
              if (!audioReady) void init();
              addChroma(c);
            }}
          />
        </aside>
      </main>

      <footer className="relative z-10 px-4 sm:px-8 pb-4 flex justify-center">
        <button
          onClick={() => {
            if (!audioReady) void init();
            resetChord();
          }}
          className="text-[10px] text-white/20 tracking-widest uppercase hover:text-white/40 transition-colors"
        >
          {mode === "song" ? "Reset to base chord" : "Reset"}
        </button>
      </footer>
    </div>
  );
}
