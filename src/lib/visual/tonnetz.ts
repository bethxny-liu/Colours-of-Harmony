import { Note } from "tonal";

/**
 * 3D Tonnetz: fifths + major-thirds plane, octaves extend along depth (Z).
 * Projected with perspective + tilt for a floating network look.
 */

export const MAIN_OCTAVE = 4;
export const PIANO_LOW_MIDI = 21;
export const PIANO_HIGH_MIDI = 108;

const CELL = 68;
const OCTAVE_DEPTH = 64;
const SQ3 = Math.sqrt(3) / 2;

/** Perspective camera */
const PERSPECTIVE = 1400;
const TILT_X = 0.48;
const TILT_Y = -0.14;

export interface TonnetzNote {
  id: string;
  chroma: number;
  octave: number;
  midi: number;
  name: string;
  /** Projected 2D position */
  x: number;
  y: number;
  /** Depth after projection (higher = further, paint first) */
  depth: number;
  /** Perspective scale factor */
  scale: number;
  fifths: number;
  thirds: number;
  isMainOctave: boolean;
}

export interface TonnetzNode {
  chroma: number;
  x: number;
  y: number;
  fifths: number;
  thirds: number;
}

export type LatticeEdge = {
  fromId: string;
  toId: string;
  kind: "fifth" | "majorThird" | "minorThird" | "octave";
};

function latticeXY(fifths: number, thirds: number): { lx: number; ly: number } {
  return {
    lx: fifths * CELL + thirds * CELL * 0.5,
    ly: thirds * CELL * SQ3,
  };
}

function rotateY(x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

function rotateX(x: number, y: number, z: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x, y: y * c - z * s, z: y * s + z * c };
}

export interface ViewRotation {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_VIEW: ViewRotation = { x: 0, y: 0, zoom: 1.05 };

/** Octaves shown in focus mode — less visual noise */
export const FOCUS_OCTAVES = new Set([3, 4, 5]);

export function project3D(
  lx: number,
  ly: number,
  lz: number,
  view: ViewRotation = DEFAULT_VIEW
): { x: number; y: number; depth: number; scale: number } {
  const rotX = TILT_X - view.x;
  const rotY = TILT_Y - view.y;
  let { x, y, z } = { x: lx, y: ly, z: lz };
  ({ x, y, z } = rotateY(x, y, z, rotY));
  ({ x, y, z } = rotateX(x, y, z, rotX));
  const scale = (PERSPECTIVE / (PERSPECTIVE + z)) * view.zoom;
  return {
    x: x * scale,
    y: y * scale,
    depth: z,
    scale,
  };
}

export function chromaToTonnetz(chroma: number): { fifths: number; thirds: number } {
  let best = { fifths: 0, thirds: 0, score: Infinity };
  for (let f = -3; f <= 3; f++) {
    for (let t = -3; t <= 3; t++) {
      const c = (((f * 7 + t * 4) % 12) + 12) % 12;
      if (c === chroma) {
        const score = Math.abs(f) + Math.abs(t);
        if (score < best.score) best = { fifths: f, thirds: t, score };
      }
    }
  }
  return { fifths: best.fifths, thirds: best.thirds };
}

export function depthOpacity(scale: number, isMain: boolean): number {
  const base = Math.min(1, Math.max(0.18, scale * 1.15));
  return isMain ? Math.min(1, base + 0.12) : base;
}

export function getPianoMidiRange(): number[] {
  const midis: number[] = [];
  for (let m = PIANO_LOW_MIDI; m <= PIANO_HIGH_MIDI; m++) midis.push(m);
  return midis;
}

export function buildPianoTonnetz(view: ViewRotation = DEFAULT_VIEW): TonnetzNote[] {
  const notes: TonnetzNote[] = [];

  for (const midi of getPianoMidiRange()) {
    const name = Note.fromMidi(midi);
    if (!name) continue;
    const chroma = Note.chroma(name) ?? 0;
    const octave = Note.octave(name) ?? MAIN_OCTAVE;
    const { fifths, thirds } = chromaToTonnetz(chroma);
    const { lx, ly } = latticeXY(fifths, thirds);
    const lz = (octave - MAIN_OCTAVE) * OCTAVE_DEPTH;
    const projected = project3D(lx, ly, lz, view);

    notes.push({
      id: `n-${midi}`,
      chroma,
      octave,
      midi,
      name,
      x: projected.x,
      y: projected.y,
      depth: projected.depth,
      scale: projected.scale,
      fifths,
      thirds,
      isMainOctave: octave === MAIN_OCTAVE,
    });
  }

  return notes;
}

export function buildTonnetzLattice(cx: number, cy: number): TonnetzNode[] {
  return buildPianoTonnetz()
    .filter((n) => n.isMainOctave)
    .map((n) => ({ chroma: n.chroma, x: n.x + cx, y: n.y + cy, fifths: n.fifths, thirds: n.thirds }));
}

export function buildLatticeEdges(notes: TonnetzNote[]): LatticeEdge[] {
  const edges: LatticeEdge[] = [];
  const seen = new Set<string>();

  const add = (
    a: TonnetzNote | undefined,
    b: TonnetzNote | undefined,
    kind: LatticeEdge["kind"]
  ) => {
    if (!a || !b) return;
    const key = [a.id, b.id].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ fromId: a.id, toId: b.id, kind });
  };

  const byOctave = new Map<number, TonnetzNote[]>();
  for (const n of notes) {
    const list = byOctave.get(n.octave) ?? [];
    list.push(n);
    byOctave.set(n.octave, list);
  }

  for (const layer of byOctave.values()) {
    const byKey = new Map(layer.map((n) => [`${n.fifths},${n.thirds}`, n]));
    for (const n of layer) {
      add(byKey.get(`${n.fifths},${n.thirds}`), byKey.get(`${n.fifths + 1},${n.thirds}`), "fifth");
      add(byKey.get(`${n.fifths},${n.thirds}`), byKey.get(`${n.fifths},${n.thirds + 1}`), "majorThird");
      add(byKey.get(`${n.fifths},${n.thirds}`), byKey.get(`${n.fifths + 1},${n.thirds - 1}`), "minorThird");
    }
  }

  const byChroma = new Map<number, TonnetzNote[]>();
  for (const n of notes) {
    const list = byChroma.get(n.chroma) ?? [];
    list.push(n);
    byChroma.set(n.chroma, list);
  }

  for (const group of byChroma.values()) {
    const sorted = [...group].sort((a, b) => a.octave - b.octave);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1].octave - sorted[i].octave === 1) {
        add(sorted[i], sorted[i + 1], "octave");
      }
    }
  }

  return edges;
}

export function getOctaveLayers(notes: TonnetzNote[]): number[] {
  return [...new Set(notes.map((n) => n.octave))].sort((a, b) => a - b);
}

export const EDGE_COLORS: Record<LatticeEdge["kind"], string> = {
  fifth: "120, 180, 255",
  majorThird: "255, 180, 120",
  minorThird: "180, 140, 255",
  octave: "180, 190, 220",
};

export function edgeStroke(
  kind: LatticeEdge["kind"],
  avgScale: number
): string {
  const base = EDGE_COLORS[kind];
  const opacity =
    (kind === "octave" ? 0.22 : 0.16) * Math.min(1, Math.max(0.12, avgScale));
  return `rgba(${base}, ${opacity})`;
}

export function computeTonnetzBounds(notes: TonnetzNote[], padding = 80) {
  const xs = notes.map((n) => n.x);
  const ys = notes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

/** Faint slice outline for one octave layer in 3D */
export function buildOctaveSlicePath(
  notes: TonnetzNote[],
  octave: number,
  bounds: ReturnType<typeof computeTonnetzBounds>
): string | null {
  const layer = notes.filter((n) => n.octave === octave);
  if (layer.length < 3) return null;
  const tx = (x: number) => x - bounds.minX;
  const ty = (y: number) => y - bounds.minY;
  const hull = convexHull(layer.map((n) => ({ x: n.x, y: n.y })));
  if (hull.length < 3) return null;
  return hull.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x)} ${ty(p.y)}`).join(" ") + " Z";
}

function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: { x: number; y: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function sortByDepth<T extends { depth: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.depth - a.depth);
}
