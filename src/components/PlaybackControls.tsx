"use client";

import type { PlaybackMode } from "@/lib/music/types";

interface PlaybackControlsProps {
  mode: PlaybackMode;
  audioReady: boolean;
  onModeChange: (mode: PlaybackMode) => void;
  onInit: () => void;
}

const MODES: { id: PlaybackMode; label: string }[] = [
  { id: "block", label: "Block" },
  { id: "arpeggio", label: "Arp" },
  { id: "preview", label: "Preview" },
];

export function PlaybackControls({
  mode,
  audioReady,
  onModeChange,
  onInit,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {!audioReady && (
        <button
          onClick={onInit}
          className="px-3 py-1.5 rounded-full text-xs tracking-wide bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
        >
          Enable sound
        </button>
      )}
      <div className="flex rounded-full bg-white/[0.04] p-0.5 border border-white/[0.06]">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all ${
              mode === m.id
                ? "bg-white/12 text-white/80"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
