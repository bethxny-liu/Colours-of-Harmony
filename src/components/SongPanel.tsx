"use client";

import { motion } from "framer-motion";
import { SONGS } from "@/lib/music/songs";
import { chromaToName } from "@/lib/music/theory";
import { getNoteSuggestions } from "@/lib/music/suggestions";
import { tensionToColor } from "@/lib/visual/colors";
import type { AppMode } from "@/store/harmonyStore";

interface SongPanelProps {
  mode: AppMode;
  activeSongId: string;
  songMomentIndex: number;
  pitchClasses: number[];
  basePitchClasses: number[];
  onModeChange: (mode: AppMode) => void;
  onSongSelect: (id: string) => void;
  onPrevMoment: () => void;
  onNextMoment: () => void;
  onPlayPlain: () => void;
  onPlayColor: () => void;
  onAddChroma: (chroma: number) => void;
}

export function SongPanel({
  mode,
  activeSongId,
  songMomentIndex,
  pitchClasses,
  basePitchClasses,
  onModeChange,
  onSongSelect,
  onPrevMoment,
  onNextMoment,
  onPlayPlain,
  onPlayColor,
  onAddChroma,
}: SongPanelProps) {
  const song = SONGS.find((s) => s.id === activeSongId) ?? SONGS[0];
  const part = song.moments[songMomentIndex];
  const rootChroma = part?.baseChord.pitchClasses[0] ?? 0;

  const suggestions = part
    ? getNoteSuggestions(pitchClasses, basePitchClasses, rootChroma, 3)
    : [];

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs">
      <div className="flex rounded-full bg-white/[0.04] p-0.5 border border-white/[0.06]">
        {(["explore", "song"] as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all ${
              mode === m
                ? "bg-white/12 text-white/80"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {m === "explore" ? "Explore" : "Learn a Song"}
          </button>
        ))}
      </div>

      {mode === "song" && (
        <>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">
              Pick a song
            </p>
            {SONGS.map((s) => (
              <button
                key={s.id}
                onClick={() => onSongSelect(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all mb-1 ${
                  activeSongId === s.id
                    ? "bg-white/[0.08] text-white/80 border border-white/[0.1]"
                    : "text-white/35 hover:text-white/55 hover:bg-white/[0.03]"
                }`}
              >
                <span className="font-medium">{s.title}</span>
                <span className="block text-[10px] text-white/25 mt-0.5">
                  {s.subtitle}
                </span>
              </button>
            ))}
          </div>

          {part && (
            <motion.div
              key={`${activeSongId}-${songMomentIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-4 space-y-4"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
                  Part {songMomentIndex + 1} of {song.moments.length}
                </p>
                <p className="text-sm leading-relaxed text-white/70">
                  {part.summary}
                </p>
                <p className="mt-2 text-xs text-amber-200/60">
                  Chord: {part.baseChord.label}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  1 · Listen
                </p>
                <button
                  type="button"
                  onClick={onPlayPlain}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                >
                  <span className="text-xs text-white/70">♪ Chord + melody</span>
                  <span className="block text-[10px] text-white/35 mt-0.5">
                    The basic version — {part.baseChord.label} with the tune on top.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onPlayColor}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] hover:bg-amber-400/[0.1] transition-all"
                >
                  <span className="text-xs text-amber-100/80">
                    ♪ {part.colourDemo.buttonLabel}
                  </span>
                  <span className="block text-[10px] text-white/40 mt-0.5">
                    {part.colourDemo.whatYouHear}
                  </span>
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  2 · Play with it
                </p>
                <p className="text-xs leading-relaxed text-white/50">
                  {part.baseChord.label} is already on the staff and piano. Add
                  extra notes and hear how they change the sound.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.chroma}
                      type="button"
                      onClick={() => onAddChroma(s.chroma)}
                      className="px-2.5 py-1 rounded-full text-[10px] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
                      style={{ color: tensionToColor(s.tension) }}
                    >
                      + {chromaToName(s.chroma)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onPrevMoment}
                  disabled={songMomentIndex === 0}
                  className="flex-1 py-1.5 text-[10px] text-white/30 hover:text-white/50 disabled:opacity-30"
                >
                  ← Previous part
                </button>
                <button
                  type="button"
                  onClick={onNextMoment}
                  disabled={songMomentIndex >= song.moments.length - 1}
                  className="flex-1 py-1.5 text-[10px] text-white/30 hover:text-white/50 disabled:opacity-30"
                >
                  Next part →
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {mode === "explore" && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs leading-relaxed text-white/55">
            Build any chord on the piano or lattice. Hover a note to preview it,
            click to add it — colours show whether it fits or clashes.
          </p>
          <p className="text-[10px] text-white/30 leading-relaxed">
            Or switch to <strong className="text-white/45">Learn a Song</strong>{" "}
            to walk through Amazing Grace one chord at a time.
          </p>
        </div>
      )}
    </div>
  );
}
