// Pure geometry helpers for the SVG charts.

/** Maps a domain onto a range linearly. */
export function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** "Nice" rounded tick values covering [min, max] with roughly `count` steps. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** SVG path for a bar with a rounded data-end and a square baseline. */
export function barPath(x: number, y: number, width: number, height: number, r = 4): string {
  if (height <= 0) return "";
  const rr = Math.min(r, width / 2, height);
  return `M${x},${y + height}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + width - rr}Q${x + width},${y} ${x + width},${y + rr}V${y + height}Z`;
}

/** Polyline path through points. */
export function linePath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${round(x)},${round(y)}`).join("");
}

/** Closed area path between an upper and lower series. */
export function bandPath(upper: [number, number][], lower: [number, number][]): string {
  if (!upper.length) return "";
  return `${linePath(upper)}${[...lower].reverse().map(([x, y]) => `L${round(x)},${round(y)}`).join("")}Z`;
}

/** Donut arc segment path between angles (radians, 0 = 12 o'clock). */
export function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${round(cx + r * Math.sin(a))},${round(cy - r * Math.cos(a))}`;
  return `M${p(rOuter, a0)}A${rOuter},${rOuter} 0 ${large} 1 ${p(rOuter, a1)}L${p(rInner, a1)}A${rInner},${rInner} 0 ${large} 0 ${p(rInner, a0)}Z`;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
