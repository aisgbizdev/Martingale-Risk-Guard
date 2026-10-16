export const now = "2026-10-14T12:00:00.000Z";
export const input = { modal: 200000, targetPoin: "30", strategy: "Linear Averaging", maxLayer: "3", experience: "Pemula", marketCondition: "Sideways" };
export const settings = { capital: 10000, equity: 9000, currency: "USD", maxLots: 10, maxLayers: 5, targetPriceDistance: 30, layerSpacingPrice: 20 };
const position = (side, i) => ({ id: `${side}-${i}`, symbol: "XUL10", side, entry: 2600 + i * 12, lots: 0.5 + i * 0.25, enteredAt: now });
export const portfolios = {
  empty: { version: 1, settings, positions: [] },
  buy: { version: 1, settings, positions: [position("buy", 1)] },
  sell: { version: 1, settings, positions: [position("sell", 1)] },
  both: { version: 1, settings, positions: [position("buy", 1), position("sell", 1)] },
  many: { version: 1, settings, positions: Array.from({ length: 12 }, (_, i) => position(i < 6 ? "buy" : "sell", i + 1)) },
};
export const quote = { status: "ready", quote: { symbol: "XUL10", price: 2605.125, bid: 2605, ask: 2605.25, asOf: now, source: "Newsmaker · fixture visual" }, receivedAt: now, message: null };
const title = "Harga emas menghadapi ketidakpastian kebijakan suku bunga global, perubahan nilai dolar Amerika Serikat dan perkembangan ekonomi menjelang pengumuman inflasi utama";
export const news = Array.from({ length: 4 }, (_, i) => ({ slug: `berita-${i}`, title: `${title} — bagian ${i + 1}`, titleEn: "Gold prices face global interest-rate uncertainty and economic developments before the major inflation release", category: "Market", source: "Newsmaker", publishedAt: now }));
export const context = {
  history: { status: "ready", receivedAt: now, message: null, analysis: { source: "LGD Daily", timeframe: "D1", basis: "gold-reference", candleCount: 90, firstDate: "2026-06-01", lastDate: "2026-10-14", lastClose: 2600, ma20: 2580, ma50: 2540, atr14: 35, atrBaseline: 30, atrPercent: 1.35, support20: 2490, resistance20: 2680, trend: "up" } },
  calendar: { status: "ready", complete: true, generatedAt: now, receivedAt: now, timezone: "Asia/Jakarta", message: null, events: Array.from({ length: 8 }, (_, i) => ({
    id: `event-${i}`, name: `${i % 2 ? "Keputusan suku bunga" : "Indeks harga konsumen dan konferensi pers kebijakan ekonomi"} ${i + 1}`,
    country: i % 2 ? "Japan" : "United States", currency: i % 2 ? "JPY" : "USD", impact: i % 2 ? "medium" : "high",
    date: "2026-10-14", time: "20:00", at: `2026-10-14T${String(13 + i).padStart(2, "0")}:00:00.000Z`,
    previous: "2.9%", forecast: "3.1%", actual: null, explanation: "Agenda ekonomi untuk konteks; bukan sinyal arah atau instruksi transaksi.", source: "Newsmaker",
  })) },
  news: { status: "ready", items: news, receivedAt: now, message: null },
};
export const article = { ...news[0], content: Array(4).fill("Harga emas bergerak menjelang rilis ekonomi. Informasi ini hanya konteks editorial dan bukan rekomendasi transaksi. Perhatikan batas posisi manual serta ketidakpastian data.").join("\n\n"), contentEn: "Editorial context, not trading advice." };
export const viewports = [[390, 844], [768, 1024], [1024, 768], [1440, 900]];
export const scenarios = [
  ...["empty", "buy", "sell", "both", "many"].map(portfolio => ({ name: `positions-${portfolio}`, path: "/positions", portfolio })),
  { name: "positions-details", path: "/positions", portfolio: "many", action: "details" },
  { name: "position-entry", path: "/positions", portfolio: "both", action: "entry" },
  { name: "position-settings", path: "/positions", portfolio: "both", action: "settings" },
  { name: "position-simulator", path: "/positions", portfolio: "both", action: "simulation" },
  ...["empty", "both", "many"].map(portfolio => ({ name: `overview-${portfolio}`, path: "/live", portfolio })),
  { name: "overview-details", path: "/live", portfolio: "both", action: "details" },
  { name: "news-long", path: "/analysis?tab=news" },
  { name: "article-long", path: "/analysis?article=berita-0" },
  { name: "calendar", path: "/analysis?tab=calendar" },
  { name: "calendar-filters", path: "/analysis?tab=calendar", action: "filters" },
  { name: "calendar-no-match", path: "/analysis?tab=calendar", action: "no-match" },
  { name: "basic-simulator", path: "/basic" },
  { name: "basic-result", path: `/result?${new URLSearchParams(input)}` },
  { name: "literasi", path: "/literasi" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "stale-warning", path: "/live", portfolio: "both", stale: true },
];
export const captures = scenario => ["entry", "settings", "simulation"].includes(scenario.action) ? ["top", "quarter", "middle", "three-quarter", "bottom"] : ["page"];
export const imageNames = () => scenarios.flatMap(s => viewports.flatMap(([w, h]) => captures(s).map(part => `${s.name}-${w}x${h}-${part}.png`)));
