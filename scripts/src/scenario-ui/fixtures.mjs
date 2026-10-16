// Synthetic, intentionally fixed test data. Not evidence of a live feed integration.
export const NOW = "2026-10-16T04:54:10.000Z";
export const viewports = [{ width: 1366, height: 950 }, { width: 820, height: 1000 }, { width: 390, height: 844 }];
export function fixture() {
  return {
    quote: { status: "ready", receivedAt: NOW, message: null, quote: {
      symbol: "XUL10", price: 4500, bid: null, ask: null, asOf: NOW, source: "Synthetic UI fixture",
    } },
    context: {
      history: { status: "ready", receivedAt: NOW, message: null, analysis: {
        source: "LGD Daily", timeframe: "D1", basis: "gold-reference", candleCount: 129,
        firstDate: "2026-04-01", lastDate: "2026-10-15",
        lastOpen: 4106.12, lastHigh: 4177.27, lastLow: 4099.94, lastClose: 4170.27,
        ma20: 4201.78, ma50: 4334.38, trend: "down", atr14: 81.74, atrBaseline: 91.89,
        atrPercent: 1.96, support20: 4000, resistance20: 4500,
      } },
      calendar: { status: "ready", complete: true, timezone: "Asia/Jakarta", events: [],
        generatedAt: NOW, receivedAt: NOW, message: null },
      news: { status: "ready", items: [], receivedAt: NOW, message: null, fundamental: {
        status: "incomplete", evaluatedAt: NOW, scope: "Synthetic UI fixture; no editorial impact assessment",
        reasons: ["No editorial tags in this fixture."], evidence: [], processing: false,
      } },
    },
  };
}
export const highImpactEvent = {
  id: "fixture-cpi", name: "USD CPI — UI fixture", currency: "USD", country: "US",
  impact: "high", at: NOW, date: "2026-10-16", time: "11:54",
  previous: null, forecast: null, actual: null, explanation: null, source: "Synthetic UI fixture",
};
