"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HarmonicEffect } from "@/lib/music/types";
import { PIANO_KEYS, whiteKeysOnly } from "@/lib/music/pianoKeys";
import { ROLE_COLORS } from "@/lib/visual/nodeColors";
import { tensionToColor } from "@/lib/visual/colors";

interface PianoKeyboardProps {
  activeMidis: number[];
  suggestedChromas?: number[];
  effects: HarmonicEffect[];
  hoveredMidi: number | null;
  history: string[];
  compact?: boolean;
  onHover: (midi: number | null) => void;
  onToggle: (midi: number, previewOnly: boolean) => void;
}

export function PianoKeyboard({
  activeMidis,
  suggestedChromas = [],
  effects,
  hoveredMidi,
  history,
  compact = false,
  onHover,
  onToggle,
}: PianoKeyboardProps) {
  const whiteKeys = useMemo(() => whiteKeysOnly(PIANO_KEYS), []);
  const activeSet = useMemo(() => new Set(activeMidis), [activeMidis]);
  const suggestedSet = useMemo(
    () => new Set(suggestedChromas),
    [suggestedChromas]
  );
  const effectByChroma = useMemo(() => {
    const map = new Map<number, HarmonicEffect>();
    effects.forEach((e) => map.set(e.chroma, e));
    return map;
  }, [effects]);

  const historyItems = history.slice(-6);

  return (
    <div className={`w-full ${compact ? "max-w-2xl" : "max-w-3xl"} mx-auto select-none`}>
      {historyItems.length > 0 && !compact && (
        <div className="flex items-center justify-center gap-1 mb-2 h-6 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {historyItems.map((label, i) => (
              <motion.span
                key={`${label}-${i}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.3 + (i / historyItems.length) * 0.5, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-2 py-0.5 rounded text-[9px] tracking-wide text-white/60 bg-white/[0.04] border border-white/[0.05]"
              >
                {label}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div
        className="relative rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        onPointerLeave={() => onHover(null)}
      >
        <div className="relative flex">
          {whiteKeys.map((key) => {
            const isActive = activeSet.has(key.midi);
            const isSuggested = suggestedSet.has(key.chroma) && !isActive;
            const isHovered = hoveredMidi === key.midi;
            const effect = effectByChroma.get(key.chroma);
            const fill = keyColor(isActive, isSuggested, isHovered, effect);

            return (
              <button
                key={key.midi}
                type="button"
                data-note
                onPointerEnter={() => onHover(key.midi)}
                onClick={(e) => onToggle(key.midi, e.shiftKey)}
                className={`relative z-0 flex-1 min-w-0 ${compact ? "h-[52px]" : "h-[72px] sm:h-[84px]"} rounded-b-md border border-black/20 transition-transform active:translate-y-px`}
                style={{
                  background: isActive || isHovered
                    ? `linear-gradient(180deg, ${fill} 0%, ${fill}88 100%)`
                    : "linear-gradient(180deg, #f4f0ea 0%, #ddd8d0 100%)",
                  boxShadow: isActive
                    ? `0 0 12px ${fill}66, inset 0 -2px 4px rgba(0,0,0,0.1)`
                    : "inset 0 -2px 4px rgba(0,0,0,0.08)",
                }}
              >
                {isSuggested && (
                  <span className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-amber-400/70" />
                )}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] text-black/25 font-medium">
                  {key.name.replace(/\d/, "")}
                </span>
              </button>
            );
          })}

          {PIANO_KEYS.filter((k) => k.isBlack).map((key) => {
            const pos = blackKeyPosition(key, whiteKeys);
            const isActive = activeSet.has(key.midi);
            const isSuggested = suggestedSet.has(key.chroma) && !isActive;
            const isHovered = hoveredMidi === key.midi;
            const effect = effectByChroma.get(key.chroma);
            const fill = keyColor(isActive, isSuggested, isHovered, effect);

            return (
              <button
                key={key.midi}
                type="button"
                data-note
                onPointerEnter={() => onHover(key.midi)}
                onClick={(e) => onToggle(key.midi, e.shiftKey)}
                className="absolute z-10 rounded-b-sm border border-black/40 transition-transform active:translate-y-px"
                style={{
                  left: `${pos}%`,
                  width: `${100 / whiteKeys.length / 1.6}%`,
                  height: "52%",
                  top: 0,
                  transform: "translateX(-50%)",
                  background: isActive || isHovered
                    ? `linear-gradient(180deg, ${fill} 0%, #1a1a1a 100%)`
                    : "linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%)",
                  boxShadow: isActive ? `0 0 10px ${fill}88` : "0 2px 4px rgba(0,0,0,0.5)",
                }}
              />
            );
          })}
        </div>
      </div>

      {!compact && (
      <p className="mt-2 text-center text-[9px] text-white/20 tracking-wider">
        Play here or on the lattice · Shift+click to preview a note
      </p>
      )}
    </div>
  );
}

function keyColor(
  isActive: boolean,
  isSuggested: boolean,
  isHovered: boolean,
  effect?: HarmonicEffect
): string {
  if (isActive && effect?.role && ROLE_COLORS[effect.role]) {
    return ROLE_COLORS[effect.role];
  }
  if ((isHovered || isSuggested) && effect) {
    if (effect.role && ROLE_COLORS[effect.role]) return ROLE_COLORS[effect.role];
    return tensionToColor(effect.tension);
  }
  if (isSuggested) return "rgba(251,191,36,0.7)";
  return "#c8c0b8";
}

function blackKeyPosition(
  key: { chroma: number; octave: number },
  whiteKeys: { chroma: number; octave: number }[]
): number {
  const whiteIndex = whiteKeys.findIndex(
    (w) => w.octave === key.octave && w.chroma === anchorChroma(key.chroma)
  );
  if (whiteIndex < 0) return 0;
  const offset = key.chroma === 1 || key.chroma === 6 ? 0.72 : 0.28;
  return ((whiteIndex + offset) / whiteKeys.length) * 100;
}

function anchorChroma(chroma: number): number {
  const map: Record<number, number> = {
    1: 0,
    3: 2,
    6: 5,
    8: 7,
    10: 9,
  };
  return map[chroma] ?? chroma;
}
