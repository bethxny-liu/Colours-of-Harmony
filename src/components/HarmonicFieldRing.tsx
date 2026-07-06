"use client";

import { motion } from "framer-motion";
import type { HarmonicEffect } from "@/lib/music/types";
import {
  chromaToAngle,
  polarToCartesian,
  tensionToColor,
  tensionToGlow,
} from "@/lib/visual/colors";

interface HarmonicFieldRingProps {
  effects: HarmonicEffect[];
  hoveredChroma: number | null;
  previewChroma: number | null;
  onHover: (chroma: number | null) => void;
  onToggle: (chroma: number, previewOnly: boolean) => void;
  size?: number;
}

export function HarmonicFieldRing({
  effects,
  hoveredChroma,
  previewChroma,
  onHover,
  onToggle,
  size = 420,
}: HarmonicFieldRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {effects.map((effect) => {
        const angle = chromaToAngle(effect.chroma);
        const { x, y } = polarToCartesian(cx, cy, radius, angle);
        const isHovered = hoveredChroma === effect.chroma;
        const isPreview = previewChroma === effect.chroma;
        const color = tensionToColor(effect.tension);
        const glow = tensionToGlow(effect.tension, effect.isActive ? 0.7 : 0.35);
        const nodeSize = 14 + effect.consonance * 4;
        const jitter = effect.voiceLeading * 6;

        return (
          <g key={effect.chroma}>
            <motion.circle
              cx={x}
              cy={y}
              r={nodeSize + 8}
              fill={glow}
              filter="url(#nodeGlow)"
              className="pointer-events-none"
              animate={{
                cx: x + (isHovered ? 0 : Math.sin(effect.chroma) * jitter * 0.3),
                cy: y + (isHovered ? 0 : Math.cos(effect.chroma) * jitter * 0.3),
                opacity: effect.isActive ? 1 : 0.6,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: effect.voiceLeading > 0.5 ? 8 : 16,
              }}
            />

            <motion.circle
              cx={x}
              cy={y}
              r={nodeSize}
              fill={color}
              fillOpacity={effect.isActive ? 0.95 : 0.55}
              stroke={isPreview ? "#fff" : isHovered ? color : "transparent"}
              strokeWidth={isPreview ? 2 : 1.5}
              strokeOpacity={0.8}
              className="cursor-pointer"
              style={{ transformOrigin: `${x}px ${y}px` }}
              animate={{
                cx: x,
                cy: y,
                scale: isHovered ? 1.15 : effect.isActive ? 1.05 : 1,
              }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onMouseEnter={() => onHover(effect.chroma)}
              onMouseLeave={() => onHover(null)}
              onClick={(e) => onToggle(effect.chroma, e.shiftKey)}
            />

            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              className="pointer-events-none fill-white/90 text-[10px] font-medium select-none"
              style={{ fontSize: 10 }}
            >
              {effect.pitchClass.replace("#", "♯")}
            </text>

            {(isHovered || effect.isActive) && effect.role && (
              <motion.text
                x={x}
                y={y - nodeSize - 6}
                textAnchor="middle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                className="pointer-events-none fill-white/60 text-[8px] tracking-wide uppercase select-none"
                style={{ fontSize: 8 }}
              >
                {effect.role}
              </motion.text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
