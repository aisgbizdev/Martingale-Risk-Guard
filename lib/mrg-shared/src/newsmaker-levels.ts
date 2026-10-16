/** Numeric formulas verified against Newsmaker's public Pivot & Fibonacci calculator.
 * Source: https://www.newsmaker.id/id/tools/pivot-fibonacci
 * These are reference levels, NOT entry signals or broker contract specifications.
 */
export function newsmakerLevels(ohlc: { open: number; high: number; low: number; close: number }) {
  const { open: o, high: h, low: l, close: c } = ohlc;
  if (![o, h, l, c].every(n => Number.isFinite(n) && n > 0) ||
    h < l || o > h || o < l || c > h || c < l) throw new Error("OHLC referensi tidak valid.");
  const range = h - l, p = (h + l + c) / 3, w = (h + l + 2 * o) / 4;
  const r2 = p + range, s2 = p - range;
  const wr3 = h + 2 * (w - l), ws3 = l - 2 * (h - w);
  return {
    classic: {
      r4: r2 + 1.618 * range, r3: h + 2 * (p - l), r2, r1: 2 * p - l,
      p, s1: 2 * p - h, s2, s3: l - 2 * (h - p), s4: s2 - 1.618 * range,
    },
    woodie: {
      r4: wr3 + range, r3: wr3, r2: w + range, r1: 2 * w - l,
      p: w, s1: 2 * w - h, s2: w - range, s3: ws3, s4: ws3 - range,
    },
    camarilla: {
      r4: c + 1.1 * range / 2, r3: c + 1.1 * range / 4,
      r2: c + 1.1 * range / 6, r1: c + 1.1 * range / 12,
      p, s1: c - 1.1 * range / 12, s2: c - 1.1 * range / 6,
      s3: c - 1.1 * range / 4, s4: c - 1.1 * range / 2,
    },
    up: {
      retracement: [0.236, 0.382, 0.5, 0.618, 0.786].map(ratio => ({ ratio, price: h - ratio * range })),
      projection: [1.382, 1.5, 1.618, 2, 2.382, 2.618].map(ratio => ({ ratio, price: h + (ratio - 1) * range })),
    },
    down: {
      retracement: [0.786, 0.618, 0.5, 0.382, 0.236].map(ratio => ({ ratio, price: l + ratio * range })),
      projection: [1.382, 1.5, 1.618, 2, 2.382, 2.618].map(ratio => ({ ratio, price: l - (ratio - 1) * range })),
    },
  };
}
