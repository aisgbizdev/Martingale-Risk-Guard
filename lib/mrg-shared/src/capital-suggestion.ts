import { calendarIsFresh, quoteIsFresh, type LiveQuote, type MarketContext } from "./live-types";
import { getStudyReference } from "./study-market";
import { historicalPriceIsEligible, type ScenarioPriceBasis } from "./scenario-price";
import { SCENARIO_CONTRACT, SCENARIO_BUDGET, scenarioLots } from "./scenario-contract";

export interface EditorialEvidence {
  slug: string;
  title: string;
  url: string;
  publishedAt: string;
  reviewedAt: string;
  category: string;
  source: string;
  excerpt: string;
  rationale: string;
  contentHash: string;
  tag: "high-uncertainty" | "covered";
  reviewMethod?: "ai" | "editorial";
  model?: string;
  analysisVersion?: string;
  relevance?: "relevant" | "not-relevant";
}

export interface FundamentalAssessment {
  status: "assessed" | "incomplete";
  evaluatedAt: string;
  scope: string;
  evidence: EditorialEvidence[];
  reasons: string[];
  processing?: boolean;
}

export interface Candidate {
  strategy: "Linear Averaging" | "Martingale";
  layers: number;
  lots: number[];
  totalLots: number;
  margin: number;
  stressLoss: number;
  stressEquity: number;
  fundsAfterMargin: number;
  marginPercent: number;
  stressPercent: number;
  passes: boolean;
}

export interface CapitalSuggestion {
  status: "incomplete" | "deferred" | "no-fit" | "offered" | "limited";
  capital: number;
  evaluatedAt: string;
  reasons: string[];
  quote: LiveQuote | null;
  priceBasis?: ScenarioPriceBasis;
  reference: ReturnType<typeof getStudyReference>;
  calendar: MarketContext["calendar"] | null;
  fundamental: FundamentalAssessment | null;
  ruleAnalysis?: import("./market-rules").MarketRuleAnalysis | null;
  target: number | null;
  spacing: number | null;
  candidates: Candidate[];
  selected: Candidate | null;
}

const cents = (n: number) => Math.round(n * 100) / 100;
export function simulateCandidate(capital: number, spacing: number, layers: number, strategy: Candidate["strategy"]): Candidate {
  if (!Number.isFinite(capital) || capital <= 0 || !Number.isFinite(spacing) || spacing <= 0 ||
    !Number.isInteger(layers) || layers < 2 || layers > 3 ||
    !["Linear Averaging", "Martingale"].includes(strategy)) throw new Error("Invalid simulation parameters");
  const lots = scenarioLots(strategy, layers);
  const totalLots = cents(lots.reduce((sum, lot) => sum + lot, 0));
  const margin = cents(SCENARIO_CONTRACT.marginPerLot * totalLots);
  // One spacing beyond the last entry: first layer travels layers * spacing.
  const stressLoss = cents(lots.reduce((sum, lot, i) => sum + (layers - i) * spacing * SCENARIO_CONTRACT.dollarsPerPointPerLot * lot, 0));
  const stressEquity = cents(capital - stressLoss);
  return {
    strategy, layers, lots, totalLots, margin, stressLoss, stressEquity,
    fundsAfterMargin: cents(stressEquity - margin),
    marginPercent: margin / capital * 100, stressPercent: stressLoss / capital * 100,
    passes: margin <= capital * SCENARIO_BUDGET.marginFraction && stressLoss <= capital * SCENARIO_BUDGET.stressFraction,
  };
}

const fresh = (at: string | null | undefined, now: number, max: number) => {
  const age = now - Date.parse(at ?? "");
  return Number.isFinite(age) && age >= 0 && age <= max;
};

export function suggestFromCapital(
  capital: number, context: MarketContext | null | undefined, quote: LiveQuote | null,
  now = Date.now(), online = true, allowLimited = false,
  priceBasis?: ScenarioPriceBasis,
): CapitalSuggestion {
  const reference = getStudyReference(context, now, online);
  const fundamental = context?.news.fundamental ?? null;
  const result: CapitalSuggestion = {
    status: "incomplete", capital, evaluatedAt: Number.isFinite(now) ? new Date(now).toISOString() : "",
    reasons: [], quote: quote ? { ...quote } : null, reference,
    ...(priceBasis ? { priceBasis: structuredClone(priceBasis) } : {}),
    calendar: context?.calendar ?? null, fundamental, ruleAnalysis: context?.ruleAnalysis ?? null,
    target: null, spacing: null, candidates: [], selected: null,
  };
  if (!Number.isFinite(capital) || capital <= 0 || capital > 1e12) result.reasons.push("Modal harus positif, terbatas, dan maksimal US$1 triliun.");
  if (!Number.isFinite(now) || !online) result.reasons.push("Koneksi atau waktu evaluasi tidak tersedia.");
  const historical = historicalPriceIsEligible(priceBasis, quote, now, online);
  if (!quote || quote.symbol !== "XUL10" || !Number.isFinite(quote.price) || quote.price <= 0 ||
    (priceBasis?.kind === "historical" ? !historical : !quoteIsFresh(quote, now))) {
    result.reasons.push(priceBasis?.kind === "historical"
      ? "Acuan historis XUL10 tidak valid atau di luar jendela akhir pekan; bukan harga live."
      : "Harga XUL10 wajib tersedia dengan timestamp maksimal 20 detik.");
  }
  if (!reference.analysis) result.reasons.push("Referensi LGD Daily D1 tertutup belum memenuhi pemeriksaan data.");
  const calendar = context?.calendar;
  if (!calendarIsFresh(calendar, now) || calendar?.timezone !== "Asia/Jakarta") result.reasons.push("Kalender wajib lengkap, berzona WIB, dan dibuat maksimal 15 menit.");
  const newsReady = context?.news.status === "ready" && (!allowLimited || fresh(context.news.receivedAt, now, 15 * 60_000));
  if (!newsReady) result.reasons.push("Sumber berita tidak tersedia atau tidak segar; saran pasar tidak dapat dibuat.");
  const assessed = newsReady && !!fundamental && fundamental.status === "assessed" &&
    fresh(fundamental.evaluatedAt, now, 15 * 60_000) && fundamental.evidence.length > 0 &&
    fundamental.evidence.every(e => fresh(e.publishedAt, now, 24 * 3600_000) &&
      fresh(e.reviewedAt, now, 24 * 3600_000) && Date.parse(e.reviewedAt) >= Date.parse(e.publishedAt) &&
      !!e.excerpt?.trim() && !!e.rationale?.trim() && /^[a-f0-9]{64}$/.test(e.contentHash) &&
      ["covered", "high-uncertainty"].includes(e.tag) && (!allowLimited || e.reviewMethod !== "ai"));
  if (!assessed && !allowLimited) {
    result.reasons.push("Fundamental belum lengkap: penandaan redaksi untuk berita relevan ≤24 jam harus memiliki bukti, sumber dan waktu yang valid; bukan netral.");
    if (fundamental) result.reasons.push(...fundamental.reasons);
  }
  if (result.reasons.length) return result;
  for (const event of calendar!.events) {
    if (event.currency !== "USD") continue;
    const minutes = (Date.parse(event.at ?? "") - now) / 60_000;
    if ((event.impact === "high" && !Number.isFinite(minutes)) ||
      (event.impact === "unknown" && (!Number.isFinite(minutes) || (minutes >= -15 && minutes <= 120)))) {
      result.reasons.push(`Waktu/dampak agenda USD belum jelas: ${event.name}.`);
    }
    if (event.impact === "high" && minutes >= -15 && minutes <= 120) {
      result.reasons.push(`Tunda: ${event.name}, ${event.at}; jendela 120 menit sebelum–15 menit sesudah.`);
    }
  }
  if (result.reasons.length) { result.status = "deferred"; return result; }
  const analysis = reference.analysis!;
  const target = Math.floor(0.25 * analysis.atr14);
  const spacing = Math.ceil(0.5 * analysis.atr14);
  if (!(target > 0 && spacing >= target) || spacing * 3 >= quote!.price) {
    result.reasons.push("Target/jarak ATR tidak koheren terhadap harga XUL10; tidak ada angka pengganti.");
    return result;
  }
  const limited = !assessed;
  const restricted = limited || analysis.trend !== "mixed" || fundamental!.evidence.some(e => e.tag === "high-uncertainty");
  result.target = target;
  result.spacing = spacing;
  result.reasons = [
    ...(historical ? ["Simulasi historis akhir pekan memakai tick XUL10 terakhir bertanggal, bukan harga live, penutupan resmi, atau prediksi harga pembukaan. Jadwal sesi belum terverifikasi; gap pembukaan dapat mengubah hasil."] : []),
    ...(limited ? ["Saran terbatas: dampak berita belum dinilai, bukan netral. Hanya Linear Averaging maksimal 2 layer; Martingale dan 3 layer tidak ditawarkan."] : []),
    `Harga XUL10 ${quote!.price} (${quote!.asOf}) menjadi jangkar snapshot, bukan bukti tren atau sinyal entry.`,
    `LGD D1 ${analysis.lastDate}: tren ${analysis.trend}, ATR14 ${analysis.atr14}; T=floor(0,25×ATR), S=ceil(0,5×ATR). Referensi emas, bukan seri XUL10 identik.`,
    limited ? "Pembatasan karena penilaian berita belum lengkap; bukan hasil pembacaan makna isi berita." :
      restricted ? "Tren D1 searah atau penanda ketidakpastian tinggi: maksimal 2 layer, Martingale dikeluarkan." : "Tren mixed bukan bukti Sideways; bandingkan kandidat 2–3 layer.",
    "Kalender lengkap tanpa agenda USD high impact pada jendela penundaan.",
    assessed ? `Fundamental dinilai dari ${fundamental!.evidence.length} artikel dalam cakupan terbatas; bukan seluruh berita pasar.` :
      "Artikel Newsmaker tersedia sebagai konteks. Penandaan dampak redaksi belum valid/lengkap; tidak memakai AI atau mengasumsikan pasar tenang.",
    "Utamakan jumlah layer terbesar yang lolos margin ≤20% dan stress ≤10%; pada jumlah sama pilih paparan lebih kecil.",
  ];
  for (const layers of restricted ? [2] : [3, 2]) {
    for (const strategy of restricted ? ["Linear Averaging"] as const : ["Linear Averaging", "Martingale"] as const) {
      result.candidates.push(simulateCandidate(capital, spacing, layers, strategy));
    }
  }
  result.selected = result.candidates.filter(c => c.passes).sort((a, b) => b.layers - a.layers || a.totalLots - b.totalLots)[0] ?? null;
  result.status = result.selected ? (limited ? "limited" : "offered") : "no-fit";
  if (!result.selected) result.reasons.push("Kandidat minimum 2 layer dengan lot awal 1 tidak lolos batas margin 20% atau stress 10% modal. Lot tidak diperkecil otomatis; jangan memaksa averaging.");
  return result;
}
