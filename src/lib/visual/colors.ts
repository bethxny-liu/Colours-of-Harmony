export function tensionToColor(tension: number): string {
  const t = Math.min(1, Math.max(0, tension));
  const warm = { r: 255, g: 180, b: 120 };
  const cool = { r: 120, g: 170, b: 255 };
  const r = Math.round(warm.r + (cool.r - warm.r) * t);
  const g = Math.round(warm.g + (cool.g - warm.g) * t);
  const b = Math.round(warm.b + (cool.b - warm.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function tensionToGlow(tension: number, alpha = 0.6): string {
  const color = tensionToColor(tension);
  return color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

export function chromaToAngle(chroma: number): number {
  return (chroma / 12) * Math.PI * 2 - Math.PI / 2;
}
