/** Stable SVG number formatting — avoids hydration float mismatches */
export function sv(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
