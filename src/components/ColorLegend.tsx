"use client";

import { useState } from "react";
import { LEGEND_ITEMS, ROLE_COLORS } from "@/lib/visual/nodeColors";

export function ColorLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 right-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-md px-3 py-1 text-[10px] text-white/45 hover:text-white/65 transition-colors"
      >
        {open ? "Hide colours" : "Colour key"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-white/[0.08] bg-black/55 backdrop-blur-md px-3 py-2.5 max-w-[160px]">
          <div className="flex flex-col gap-1">
            {LEGEND_ITEMS.slice(0, 5).map(({ role, label }) => (
              <div key={role} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[role] }}
                />
                <span className="text-[10px] text-white/50">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/25 mt-2 leading-snug">
            Drag to spin · scroll zoom · double-click reset
          </p>
        </div>
      )}
    </div>
  );
}
