"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { HarmonicEffect } from "@/lib/music/types";
import { ColorLegend } from "@/components/ColorLegend";
import { nodeColor, nodeOpacity } from "@/lib/visual/nodeColors";
import {
  buildLatticeEdges,
  buildPianoTonnetz,
  computeTonnetzBounds,
  DEFAULT_VIEW,
  edgeStroke,
  FOCUS_OCTAVES,
  MAIN_OCTAVE,
  sortByDepth,
  type TonnetzNote,
  type ViewRotation,
} from "@/lib/visual/tonnetz";

interface TonnetzGridProps {
  effects: HarmonicEffect[];
  activeMidis: number[];
  previousPitchClasses: number[];
  pitchClasses: number[];
  hoveredMidi: number | null;
  previewMidi: number | null;
  targetPitchClasses?: number[];
  /** Notes worth trying to add (song mode) */
  suggestedChromas?: number[];
  onHover: (midi: number | null) => void;
  onToggle: (midi: number, previewOnly: boolean) => void;
}

export function TonnetzGrid(props: TonnetzGridProps) {
  const [view, setView] = useState<ViewRotation>(DEFAULT_VIEW);
  const [focusMode, setFocusMode] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-note]") || target.closest("[data-ui]")) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({
      ...v,
      y: v.y + dx * 0.006,
      x: Math.max(-1.2, Math.min(1.2, v.x + dy * 0.006)),
    }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => ({
      ...v,
      zoom: Math.max(0.6, Math.min(2, v.zoom - e.deltaY * 0.001)),
    }));
  }, []);

  return (
    <div
      className="relative w-full touch-none"
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={() => setView(DEFAULT_VIEW)}
    >
      <div className="absolute top-2 left-2 z-20 flex gap-2" data-ui="true">
        <button
          type="button"
          data-ui="true"
          onClick={() => setFocusMode(true)}
          className={`rounded-full px-3 py-1 text-[10px] tracking-wide border transition-colors ${
            focusMode
              ? "bg-white/12 border-white/15 text-white/75"
              : "bg-transparent border-white/8 text-white/35 hover:text-white/55"
          }`}
        >
          Focus
        </button>
        <button
          type="button"
          data-ui="true"
          onClick={() => setFocusMode(false)}
          className={`rounded-full px-3 py-1 text-[10px] tracking-wide border transition-colors ${
            !focusMode
              ? "bg-white/12 border-white/15 text-white/75"
              : "bg-transparent border-white/8 text-white/35 hover:text-white/55"
          }`}
        >
          Full piano
        </button>
      </div>

      <TonnetzGridInner {...props} view={view} focusMode={focusMode} />
      <ColorLegend />
    </div>
  );
}

function TonnetzGridInner({
  effects,
  activeMidis,
  pitchClasses,
  hoveredMidi,
  previewMidi,
  targetPitchClasses = [],
  suggestedChromas = [],
  onHover,
  onToggle,
  view,
  focusMode,
}: TonnetzGridProps & { view: ViewRotation; focusMode: boolean }) {
  const layout = useMemo(() => {
    const allNotes = buildPianoTonnetz(view);
    const notes = focusMode
      ? allNotes.filter((n) => FOCUS_OCTAVES.has(n.octave))
      : allNotes;
    const visibleIds = new Set(notes.map((n) => n.id));

    const edges = buildLatticeEdges(allNotes).filter(
      (e) => visibleIds.has(e.fromId) && visibleIds.has(e.toId)
    );

    const bounds = computeTonnetzBounds(notes, focusMode ? 70 : 90);
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const mainByChroma = new Map(
      notes.filter((n) => n.isMainOctave).map((n) => [n.chroma, n])
    );
    const effectMap = new Map(effects.map((e) => [e.chroma, e]));
    const activeSet = new Set(activeMidis);

    const sortedEdges = sortByDepth(
      edges
        .filter((e) => {
          if (!focusMode) return true;
          const a = noteMap.get(e.fromId);
          const b = noteMap.get(e.toId);
          if (!a || !b) return false;
          if (e.kind === "octave") return true;
          return a.octave === MAIN_OCTAVE && b.octave === MAIN_OCTAVE;
        })
        .map((e) => {
          const a = noteMap.get(e.fromId)!;
          const b = noteMap.get(e.toId)!;
          return {
            ...e,
            depth: (a.depth + b.depth) / 2,
            avgScale: (a.scale + b.scale) / 2,
          };
        })
    );

    return {
      notes: sortByDepth(notes),
      sortedEdges,
      bounds,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      noteMap,
      mainByChroma,
      effectMap,
      activeSet,
    };
  }, [effects, activeMidis, view, focusMode]);

  const { notes, sortedEdges, bounds, width, height, mainByChroma, effectMap, activeSet } =
    layout;

  const tx = (x: number) => x - bounds.minX;
  const ty = (y: number) => y - bounds.minY;

  const activeNotes = notes.filter((n) => activeSet.has(n.midi));
  const chordEdges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let i = 0; i < activeNotes.length; i++) {
    for (let j = i + 1; j < activeNotes.length; j++) {
      const a = activeNotes[i];
      const b = activeNotes[j];
      chordEdges.push({
        x1: tx(a.x),
        y1: ty(a.y),
        x2: tx(b.x),
        y2: ty(b.y),
        key: `${a.midi}-${b.midi}`,
      });
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex justify-center py-1">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible select-none pointer-events-none"
        style={{
          minHeight: focusMode ? 300 : 400,
          maxHeight: focusMode ? "46vh" : "54vh",
          display: "block",
        }}
      >
        <defs>
          <radialGradient id="latticeAmbient" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor="rgba(80,100,180,0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="tzGlow">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#latticeAmbient)" />

        {sortedEdges.map((edge) => {
          const a = layout.noteMap.get(edge.fromId)!;
          const b = layout.noteMap.get(edge.toId)!;
          return (
            <line
              key={`${edge.fromId}-${edge.toId}-${edge.kind}`}
              x1={tx(a.x)}
              y1={ty(a.y)}
              x2={tx(b.x)}
              y2={ty(b.y)}
              stroke={edgeStroke(edge.kind, edge.avgScale * (focusMode ? 0.85 : 1))}
              strokeWidth={edge.kind === "octave" ? 0.8 : 1.2}
            />
          );
        })}

        {targetPitchClasses.length >= 2 &&
          targetPitchClasses.flatMap((pcA, i) =>
            targetPitchClasses.slice(i + 1).map((pcB) => {
              const a = mainByChroma.get(pcA);
              const b = mainByChroma.get(pcB);
              if (!a || !b) return null;
              return (
                <line
                  key={`target-${pcA}-${pcB}`}
                  x1={tx(a.x)}
                  y1={ty(a.y)}
                  x2={tx(b.x)}
                  y2={ty(b.y)}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              );
            })
          )}

        <AnimatePresence>
          {chordEdges.map((edge) => (
            <motion.line
              key={edge.key}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="rgba(255,200,150,0.75)"
              strokeWidth={2.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ))}
        </AnimatePresence>

        {notes.map((node) => {
          const effect = effectMap.get(node.chroma);
          if (!effect) return null;

          const isHovered = hoveredMidi === node.midi;
          const isPreview = previewMidi === node.midi;
          const isSuggested =
            suggestedChromas.includes(node.chroma) && !activeSet.has(node.midi);
          const isTarget =
            targetPitchClasses.includes(node.chroma) && !activeSet.has(node.midi);
          const isActive = activeSet.has(node.midi);
          const showLabel =
            node.isMainOctave || isActive || isHovered || isTarget || isSuggested;

          const fill = nodeColor(effect, isActive, isTarget || isSuggested, isHovered, node.chroma);
          const opacity = nodeOpacity(node.octave, node.isMainOctave, isActive, isHovered);
          const size =
            (node.isMainOctave ? 16 : 8) * node.scale * (isActive ? 1.08 : 0.9);
          const label = node.isMainOctave
            ? node.name.replace(/[0-9]/g, "").replace("#", "♯")
            : node.name.replace("#", "♯");

          return (
            <g
              key={node.id}
              opacity={opacity}
              className="pointer-events-auto"
              data-note="true"
            >
              {isActive && (
                <circle
                  cx={tx(node.x)}
                  cy={ty(node.y)}
                  r={size + 10}
                  fill={fill}
                  fillOpacity={0.2}
                  filter="url(#tzGlow)"
                />
              )}

              {isSuggested && (
                <circle
                  cx={tx(node.x)}
                  cy={ty(node.y)}
                  r={size + 6}
                  fill="none"
                  stroke="rgba(251,191,36,0.55)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}

              {isTarget && !isSuggested && (
                <circle
                  cx={tx(node.x)}
                  cy={ty(node.y)}
                  r={size + 6}
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              <circle
                cx={tx(node.x)}
                cy={ty(node.y)}
                r={size}
                fill={fill}
                fillOpacity={isActive ? 1 : 0.85}
                stroke={
                  isPreview ? "#fff" : isHovered ? "#fff" : "rgba(255,255,255,0.1)"
                }
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer"
                onMouseEnter={() => onHover(node.midi)}
                onMouseLeave={() => onHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.midi, e.shiftKey);
                }}
              />

              {showLabel && (
                <text
                  x={tx(node.x)}
                  y={ty(node.y) + (node.isMainOctave ? 5 : 3)}
                  textAnchor="middle"
                  className="pointer-events-none font-medium"
                  style={{
                    fontSize: node.isMainOctave ? 11 * node.scale : 8 * node.scale,
                    fill: isActive
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  {label}
                </text>
              )}

              {isActive && node.isMainOctave && effect.role && (
                <text
                  x={tx(node.x)}
                  y={ty(node.y) - size - 5}
                  textAnchor="middle"
                  className="uppercase pointer-events-none"
                  style={{
                    fontSize: 8 * node.scale,
                    fill,
                    opacity: 0.9,
                    letterSpacing: "0.05em",
                  }}
                >
                  {effect.role}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
