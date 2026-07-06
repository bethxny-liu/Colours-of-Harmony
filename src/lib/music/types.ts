export interface ChordState {
  root: string;
  type: string;
  pitchClasses: number[];
  label: string;
  notes: string[];
}

export interface HarmonicEffect {
  chroma: number;
  pitchClass: string;
  tension: number;
  consonance: number;
  setDistance: number;
  voiceLeading: number;
  role: string;
  isActive: boolean;
  isPreview: boolean;
}

export interface ChordMetrics {
  tension: number;
  voiceLeading: number;
  complexity: number;
}

export type PlaybackMode = "block" | "arpeggio" | "preview";
