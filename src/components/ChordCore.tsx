"use client";

import { motion, AnimatePresence } from "framer-motion";
import { chromaToName } from "@/lib/music/theory";
import { tensionToColor, tensionToGlow } from "@/lib/visual/colors";

interface ChordCoreProps {
  pitchClasses: number[];
  previousPitchClasses: number[];
  label: string;
  complexity: number;
  tension: number;
  size?: number;
}

export function ChordCore({
  pitchClasses,
  previousPitchClasses,
  label,
  complexity,
  tension,
  size = 200,
}: ChordCoreProps) {
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = 28 + complexity * 22;
  const glow = tensionToGlow(tension, 0.35);
  const accent = tensionToColor(tension);

  const nodePositions = pitchClasses.map((pc, i) => {
    const angle = (i / Math.max(pitchClasses.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const r = baseRadius * 0.55;
    return {
      pc,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] =
    [];
  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      const a = nodePositions[i];
      const b = nodePositions[j];
      lines.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        key: `${a.pc}-${b.pc}`,
      });
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        animate={{ rotate: complexity * 8 }}
        transition={{ type: "spring", stiffness: 40, damping: 12 }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <motion.circle
          cx={cx}
          cy={cy}
          fill="url(#coreGlow)"
          filter="url(#softBlur)"
          animate={{ r: baseRadius + 30 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
        />

        <motion.circle
          cx={cx}
          cy={cy}
          fill="none"
          stroke={accent}
          strokeOpacity={0.25}
          strokeWidth={1}
          animate={{ r: baseRadius }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
        />

        <AnimatePresence>
          {lines.map((line) => (
            <motion.line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={accent}
              strokeOpacity={0.2}
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {nodePositions.map((node) => {
            const wasPresent = previousPitchClasses.includes(node.pc);
            return (
              <motion.g
                key={node.pc}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
              >
                <motion.circle
                  r={10}
                  fill={accent}
                  fillOpacity={0.85}
                  animate={{ cx: node.x, cy: node.y }}
                  transition={{ type: "spring", stiffness: 120, damping: 16 }}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className="fill-white/90 text-[9px] font-medium"
                  style={{ fontSize: 9 }}
                >
                  {chromaToName(node.pc).replace("#", "♯")}
                </text>
                {!wasPresent && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={16}
                    fill="none"
                    stroke={accent}
                    strokeOpacity={0.5}
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  />
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </motion.svg>

      <motion.p
        key={label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-sm font-light tracking-widest text-white/50 uppercase"
      >
        {label}
      </motion.p>
    </div>
  );
}
