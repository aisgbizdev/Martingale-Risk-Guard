import {
  calendarIsFresh, jakartaDate, quoteIsFresh, positionSchema, settingsSchema,
  type Copy, type LiveQuote, type MarketContext, type Position, type PositionSettings,
} from "./live-types";

export interface RiskComponent {
  key: "lots" | "layers" | "adverse" | "volatility" | "calendar";
  max: number;
  points: number | null;
  label: Copy;
  explanation: Copy;
}

export interface PositionSummary {
  totalLots: number;
  layers: number;
  averageEntry: number | null;
}

export interface PositionRisk {
  score: number | null;
  level: "low" | "moderate" | "high" | "unavailable";
  summary: PositionSummary;
  components: RiskComponent[];
  reasons: Copy[];
  warnings: Copy[];
}

export const RISK_MODEL_VERSION = "initial-heuristic-1";
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const copy = (id: string, en: string): Copy => ({ id, en });

export function summarizePositions(positions: Position[]): PositionSummary {
  const parsed = positions.map((p) => positionSchema.parse(p));
  if (parsed.some((p) => p.side !== parsed[0].side || p.symbol !== parsed[0].symbol)) {
    throw new Error("Only same-symbol, same-direction positions can be averaged");
  }
  const totalLots = parsed.reduce((sum, p) => sum + p.lots, 0);
  return {
    totalLots, layers: parsed.length,
    averageEntry: totalLots ? parsed.reduce((sum, p) => sum + p.entry * p.lots, 0) / totalLots : null,
  };
}

export function evaluatePositionRisk(
  positions: Position[], settings: PositionSettings,
  quote: LiveQuote | null, context: MarketContext | null, now = Date.now(),
): PositionRisk {
  settingsSchema.parse(settings);
  const summary = summarizePositions(positions);
  const reasons: Copy[] = [], warnings: Copy[] = [];
  const components: RiskComponent[] = [
    { key: "lots", max: 40, points: null, label: copy("Kapasitas lot", "Lot capacity"),
      explanation: copy("40 × total lot / batas lot; dibatasi maksimum 40.", "40 × total lots / lot limit; capped at 40.") },
    { key: "layers", max: 20, points: null, label: copy("Kapasitas layer", "Layer capacity"),
      explanation: copy("20 × jumlah layer / batas layer; dibatasi maksimum 20.", "20 × layer count / layer limit; capped at 20.") },
    { key: "adverse", max: 15, points: null, label: copy("Tekanan harga", "Adverse price pressure"),
      explanation: copy("15 × jarak harga melawan posisi / (3 × ATR14 harian referensi); maksimum 15.", "15 × adverse distance / (3 × reference daily ATR14); capped at 15.") },
    { key: "volatility", max: 15, points: null, label: copy("Volatilitas harian", "Daily volatility"),
      explanation: copy("0 saat ATR14 ≤ median 20 ATR sebelumnya; naik linear hingga 15 saat ATR14 ≥ 2× median.", "0 when ATR14 ≤ median of previous 20 ATRs; rises linearly to 15 at ≥2× median.") },
    { key: "calendar", max: 10, points: null, label: copy("Agenda ekonomi USD", "USD economic events"),
      explanation: copy("Event USD high impact: 10 poin dari 15 menit sesudah sampai 60 menit sebelum rilis; 5 poin pada 60–120 menit sebelum rilis.", "High-impact USD event: 10 points from 15 minutes after through 60 minutes before release; 5 points 60–120 minutes before.") },
  ];
  const set = (key: RiskComponent["key"], points: number) => {
    components.find((c) => c.key === key)!.points = points;
  };
  if (!positions.length) reasons.push(copy("Belum ada posisi tercatat.", "No recorded positions."));
  if (!settings.maxLots || !settings.maxLayers) {
    reasons.push(copy("Isi batas lot dan layer pilihan Anda untuk menghitung indeks.", "Set your lot and layer limits to calculate the index."));
  }
  if (summary.layers && settings.maxLots && settings.maxLayers) {
    set("lots", 40 * clamp(summary.totalLots / settings.maxLots));
    set("layers", 20 * clamp(summary.layers / settings.maxLayers));
    if (summary.totalLots > settings.maxLots) warnings.push(copy("Total lot melampaui batas pilihan Anda.", "Total lots exceed your chosen limit."));
    if (summary.layers > settings.maxLayers) warnings.push(copy("Jumlah layer melampaui batas pilihan Anda.", "Layer count exceeds your chosen limit."));
  }
  if (!quoteIsFresh(quote, now)) reasons.push(copy("Harga belum tersedia atau timestamp sudah kedaluwarsa.", "Price is unavailable or its timestamp is stale."));
  const analysis = context?.history.status === "ready" ? context.history.analysis : null;
  if (!analysis) {
    reasons.push(copy("Riwayat harian valid belum tersedia.", "Valid daily history is unavailable."));
  } else {
    const historyAge = Date.parse(jakartaDate(now)) - Date.parse(analysis.lastDate);
    if (historyAge < 0 || historyAge > 4 * 86_400_000) {
      reasons.push(copy("Riwayat harian kedaluwarsa.", "Daily history is stale."));
    } else {
      if (quote && quoteIsFresh(quote, now) && summary.averageEntry !== null) {
        const adverse = positions[0].side === "buy"
          ? summary.averageEntry - quote.price : quote.price - summary.averageEntry;
        set("adverse", 15 * clamp(adverse / (3 * analysis.atr14)));
      }
      set("volatility", 15 * clamp(analysis.atr14 / analysis.atrBaseline - 1));
    }
  }
  const calendar = context?.calendar;
  if (!calendarIsFresh(calendar, now)) {
    reasons.push(copy("Kalender belum lengkap atau pembaruannya belum cukup baru.", "Calendar is incomplete or not recently updated enough."));
  } else {
    const today = jakartaDate(now);
    const uncertain = calendar!.events.some((e) => e.currency === "USD" &&
      ((e.impact === "high" && (!e.date || (e.date === today && !e.at))) ||
       (e.impact === "unknown" && (!e.at || Math.abs(Date.parse(e.at) - now) < 120 * 60_000))));
    if (uncertain) {
      reasons.push(copy("Ada agenda USD dengan waktu/dampak belum jelas; skor agenda ditunda.", "Some USD events have unclear time/impact; event scoring is unavailable."));
    } else {
      let pressure = 0;
      for (const event of calendar!.events.filter((e) => e.currency === "USD" && e.impact === "high" && e.at)) {
        const minutes = (Date.parse(event.at!) - now) / 60_000;
        if (minutes >= -15 && minutes <= 60) pressure = 10;
        else if (minutes > 60 && minutes <= 120) pressure = Math.max(pressure, 5);
      }
      set("calendar", pressure);
      if (pressure) warnings.push(copy("Ada agenda USD berdampak tinggi dekat waktu penilaian.", "A high-impact USD event is near the assessment time."));
    }
  }
  const complete = summary.layers > 0 && components.every((c) => c.points !== null) && !reasons.length;
  const score = complete ? Math.round(components.reduce((sum, c) => sum + c.points!, 0)) : null;
  if (score !== null) {
    reasons.push(copy("Indeks memakai batas pribadi dan referensi emas harian; bukan risiko seluruh rekening.", "Index uses personal limits and daily gold reference; not whole-account risk."));
  }
  warnings.push(copy("Indeks heuristik awal, bukan probabilitas rugi. Batas yang besar tidak membuat posisi aman.", "Initial heuristic index, not a loss probability. Larger limits do not make positions safe."));
  return {
    score, level: score === null ? "unavailable" : score <= 35 ? "low" : score <= 60 ? "moderate" : "high",
    summary, components, reasons, warnings,
  };
}

export function compareSimulation(
  positions: Position[], candidate: Position, settings: PositionSettings,
  quote: LiveQuote | null, context: MarketContext | null, snapshotTime: number,
) {
  positionSchema.parse(candidate);
  if (positions.length && (candidate.side !== positions[0].side || candidate.symbol !== positions[0].symbol)) {
    throw new Error("Simulation must use the same direction and instrument");
  }
  return {
    before: evaluatePositionRisk(positions, settings, quote, context, snapshotTime),
    after: evaluatePositionRisk([...positions, candidate], settings, quote, context, snapshotTime),
    warning: copy("Harga rata-rata yang lebih dekat tidak menghapus peningkatan eksposur lot.", "A closer average entry does not remove the increase in lot exposure."),
  };
}

export function stressScenarios(positions: Position[], price: number, percentages = [0.5, 1, 2]) {
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid stress reference price");
  if (!percentages.length || percentages.length > 10 || percentages.some((n) => !Number.isFinite(n) || n <= 0 || n >= 100)) {
    throw new Error("Stress percentages must be greater than 0 and less than 100");
  }
  const summary = summarizePositions(positions);
  return percentages.map((percent) => {
    const direction = positions[0]?.side === "sell" ? 1 : -1;
    const scenarioPrice = price * (1 + direction * percent / 100);
    const adverseDistance = summary.averageEntry === null ? null :
      direction === -1 ? summary.averageEntry - scenarioPrice : scenarioPrice - summary.averageEntry;
    return { percent, scenarioPrice, adverseDistance: adverseDistance === null ? null : Math.max(0, adverseDistance) };
  });
}
