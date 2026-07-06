"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Note } from "tonal";
import type { HarmonicEffect } from "@/lib/music/types";
import { ROLE_COLORS } from "@/lib/visual/nodeColors";
import { tensionToColor } from "@/lib/visual/colors";
import {
  accidentalGlyph,
  clefForMidi,
  ledgerLineYs,
  noteHasAccidental,
  staffY,
} from "@/lib/visual/staff";

interface ChordStaffProps {
  activeMidis: number[];
  previewMidi: number | null;
  hoveredMidi: number | null;
  effects: HarmonicEffect[];
  chordLabel: string;
}

const W = 640;
const LINE_GAP = 7;
const HALF = LINE_GAP / 2;
const TREBLE_TOP = 22;
const BASS_TOP = 58;
const STAFF_H = 108;
const STAFF_LEFT = 72;
const CHORD_X = STAFF_LEFT + 88;

interface PlacedNote {
  midi: number;
  name: string;
  x: number;
  y: number;
  clef: "treble" | "bass";
  color: string;
  role: string;
  isPreview: boolean;
  isHovered: boolean;
}

function noteColor(effect: HarmonicEffect | undefined, isPreview: boolean): string {
  if (effect?.role && ROLE_COLORS[effect.role]) return ROLE_COLORS[effect.role];
  if (effect) return tensionToColor(effect.tension);
  return isPreview ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.55)";
}

function layoutNotes(
  midis: number[],
  previewMidi: number | null,
  hoveredMidi: number | null,
  effectMap: Map<number, HarmonicEffect>
): PlacedNote[] {
  const all = [...midis];
  if (previewMidi != null && !midis.includes(previewMidi)) all.push(previewMidi);

  const sorted = [...all].sort((a, b) => a - b);
  const yBuckets = new Map<number, number>();

  return sorted.map((midi) => {
    const name = Note.fromMidi(midi) ?? "C4";
    const chroma = Note.chroma(name) ?? 0;
    const clef = clefForMidi(midi);
    const topY = clef === "treble" ? TREBLE_TOP : BASS_TOP;
    const y = staffY(midi, clef, topY, HALF);
    const yKey = Math.round(y * 10);
    const stack = yBuckets.get(yKey) ?? 0;
    yBuckets.set(yKey, stack + 1);
    const x = CHORD_X + stack * 10;
    const effect = effectMap.get(chroma);
    const isPreview = previewMidi === midi && !midis.includes(midi);

    return {
      midi,
      name,
      x,
      y,
      clef,
      color: noteColor(effect, isPreview),
      role: effect?.role ?? "",
      isPreview,
      isHovered: hoveredMidi === midi,
    };
  });
}

export function ChordStaff({
  activeMidis,
  previewMidi,
  hoveredMidi,
  effects,
  chordLabel,
}: ChordStaffProps) {
  const effectMap = useMemo(() => {
    const m = new Map<number, HarmonicEffect>();
    effects.forEach((e) => m.set(e.chroma, e));
    return m;
  }, [effects]);

  const notes = useMemo(
    () => layoutNotes(activeMidis, previewMidi, hoveredMidi, effectMap),
    [activeMidis, previewMidi, hoveredMidi, effectMap]
  );

  const trebleLines = Array.from({ length: 5 }, (_, i) => TREBLE_TOP + i * LINE_GAP);
  const bassLines = Array.from({ length: 5 }, (_, i) => BASS_TOP + i * LINE_GAP);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-lg border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between mb-0.5 px-1">
          <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">Chord</span>
          <span className="text-[10px] tracking-widest text-white/50 uppercase font-light truncate ml-2">
            {chordLabel}
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${STAFF_H}`} className="w-full h-auto max-h-[88px]" aria-label={`Chord ${chordLabel}`}>
          <defs>
            <filter id="staffGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={`M 52 ${TREBLE_TOP + LINE_GAP * 2} Q 46 ${TREBLE_TOP + LINE_GAP * 2 + 18} 52 ${BASS_TOP + LINE_GAP * 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.2"
          />

          {trebleLines.map((y) => (
            <line key={`t-${y}`} x1={STAFF_LEFT} y1={y} x2={W - 16} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
          ))}
          <text x={STAFF_LEFT - 40} y={TREBLE_TOP + LINE_GAP * 2 + 4} fill="rgba(255,255,255,0.2)" fontSize="22" fontFamily="serif">𝄞</text>

          {bassLines.map((y) => (
            <line key={`b-${y}`} x1={STAFF_LEFT} y1={y} x2={W - 16} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
          ))}
          <text x={STAFF_LEFT - 40} y={BASS_TOP + LINE_GAP * 1.5 + 2} fill="rgba(255,255,255,0.2)" fontSize="18" fontFamily="serif">𝄢</text>

          {notes.flatMap((n) =>
            ledgerLineYs(n.midi, n.clef, n.clef === "treble" ? TREBLE_TOP : BASS_TOP, HALF).map((ly, i) => (
              <line key={`${n.midi}-led-${i}`} x1={n.x - 11} y1={ly} x2={n.x + 11} y2={ly} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
            ))
          )}


          <AnimatePresence>
            {notes.map((n) => (
              <motion.g
                key={n.midi}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: n.isPreview ? 0.45 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                {noteHasAccidental(n.name) && (
                  <text x={n.x - 14} y={n.y + 4} fill={n.color} fontSize="13" opacity={n.isPreview ? 0.5 : 0.85} fontFamily="serif">
                    {accidentalGlyph(n.name)}
                  </text>
                )}
                <ellipse
                  cx={n.x}
                  cy={n.y}
                  rx={n.isHovered ? 7 : 6.2}
                  ry={n.isHovered ? 5 : 4.4}
                  fill="#08080e"
                  fillOpacity={n.isPreview ? 0.5 : 1}
                  stroke={n.color}
                  strokeWidth={n.isHovered ? 2.4 : 2}
                  opacity={n.isPreview ? 0.5 : 1}
                  filter={n.isHovered ? "url(#staffGlow)" : undefined}
                  transform={`rotate(-18 ${n.x} ${n.y})`}
                />
              </motion.g>
            ))}
          </AnimatePresence>

          {activeMidis.length === 0 && (
            <text x={W / 2} y={TREBLE_TOP + LINE_GAP * 2 + 44} textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="11">
              Add notes to see them here
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
