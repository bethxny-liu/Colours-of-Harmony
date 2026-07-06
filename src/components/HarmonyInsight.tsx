"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  describeChord,
  describeEffect,
  describeTension,
  describeVoiceLeading,
  intervalQualityLabel,
} from "@/lib/music/insights";
import type { HarmonicEffect } from "@/lib/music/types";
import type { AppMode } from "@/store/harmonyStore";
import { tensionToColor } from "@/lib/visual/colors";
import { suggestProgressions } from "@/lib/music/progressions";

interface HarmonyInsightProps {
  mode?: AppMode;
  chordLabel: string;
  pitchClasses: number[];
  basePitchClasses?: number[];
  hoveredEffect: HarmonicEffect | null;
  tension: number;
  voiceLeading: number;
  onLoadProgression?: (pitchClasses: number[]) => void;
}

export function HarmonyInsight({
  mode = "explore",
  chordLabel,
  pitchClasses,
  hoveredEffect,
  tension,
  voiceLeading,
  onLoadProgression,
}: HarmonyInsightProps) {
  const mainText = hoveredEffect
    ? describeEffect(hoveredEffect, pitchClasses)
    : mode === "song" && pitchClasses.length >= 3
      ? `${chordLabel} — the song's chord is loaded. Hover any other note to preview how it colours the harmony, then click to add it.`
      : describeChord(pitchClasses, chordLabel);

  const intervalPairs =
    pitchClasses.length >= 2
      ? pitchClasses.slice(0, 4).flatMap((pc, i) =>
          pitchClasses.slice(i + 1, 4).map((other) => ({
            key: `${pc}-${other}`,
            label: intervalQualityLabel(pc, other),
          }))
        )
      : [];

  const { keyLabel, chords: progressionChords } = suggestProgressions(pitchClasses);

  return (
    <div className="flex flex-col gap-5 w-full max-w-xs">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">
          What&apos;s happening
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={mainText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm leading-relaxed text-white/70 font-light"
          >
            {mainText}
          </motion.p>
        </AnimatePresence>
      </div>

      {hoveredEffect && !hoveredEffect.isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
            If you add it
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tensionToColor(hoveredEffect.tension) }}
            />
            <span className="text-xs text-white/50">
              {describeTension(hoveredEffect.tension)}
            </span>
          </div>
        </motion.div>
      )}

      {pitchClasses.length >= 2 && !hoveredEffect && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-2">
            Intervals inside
          </p>
          <div className="flex flex-wrap gap-1.5">
            {intervalPairs.map((pair) => (
              <span
                key={pair.key}
                className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-white/40 border border-white/[0.05]"
              >
                {pair.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {pitchClasses.length >= 3 && !hoveredEffect && progressionChords.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-1">
            Key · where to go next
          </p>
          <p className="text-[10px] text-white/40 mb-2">
            Sounds like <span className="text-white/60">{keyLabel}</span> — try
            these chords:
          </p>
          <div className="flex flex-col gap-1">
            {progressionChords.map((c) => (
              <button
                key={c.roman}
                type="button"
                onClick={() => onLoadProgression?.(c.pitchClasses)}
                className="text-left px-2.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] transition-all"
              >
                <span className="text-xs text-white/70">
                  {c.roman} · {c.label}
                </span>
                <span className="block text-[10px] text-white/35 mt-0.5">
                  {c.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InsightOrb
          label="Mood"
          value={describeTension(tension)}
          color={tensionToColor(tension)}
          intensity={tension}
        />
        <InsightOrb
          label="Motion"
          value={describeVoiceLeading(voiceLeading)}
          color="rgba(180,160,255,0.8)"
          intensity={voiceLeading}
        />
      </div>
    </div>
  );
}

function InsightOrb({
  label,
  value,
  color,
  intensity,
}: {
  label: string;
  value: string;
  color: string;
  intensity: number;
}) {
  return (
    <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${color} 0%, transparent 70%)`,
            opacity: 0.12 + intensity * 0.2,
          }}
        />
      <p className="text-[9px] uppercase tracking-wider text-white/30 relative">{label}</p>
      <p className="text-[11px] text-white/55 mt-1 leading-snug relative">{value}</p>
    </div>
  );
}
