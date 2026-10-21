import type { SuggestionSources } from "./suggestion-snapshot";
import { calendarIsFresh, quoteIsFresh, type Copy } from "./live-types";
import { historicalPriceIsEligible } from "./scenario-price";
import { getStudyReference } from "./study-market";
import { newsmakerLevels } from "./newsmaker-levels";
import { SCENARIO_BUDGET, scenarioLots, scenarioContract, validScenarioContract, type ContractProfileId } from "./scenario-contract";
import type { ScenarioSide } from "./scenario-plan";
import { referenceSpacing, selectReferenceZones, type ReferenceLevel } from "./reference-zones";

export type { ReferenceLevel } from "./reference-zones";
export type ReferenceStrategy = "Linear Averaging" | "Martingale";

/** Educational cross-source comparison. No offset, ratio or claim of XUL10 calibration. */
export function technicalReferencePlan(capital: number, sources: SuggestionSources, now: number, side: ScenarioSide, strategy: ReferenceStrategy = "Linear Averaging", profile: ContractProfileId = "regular") {
  const contract = scenarioContract(profile);
  if (!["buy", "sell"].includes(side) || !["Linear Averaging", "Martingale"].includes(strategy)) throw new Error("Arah/strategi tidak valid.");
  if (!Number.isFinite(capital) || capital <= 0 || capital > 1e12) throw new Error("Modal harus positif dan maksimal US$1 triliun.");
  if (!sources.online || !Number.isFinite(now)) throw new Error("Koneksi/waktu evaluasi tidak tersedia. Sambungkan kembali lalu hitung ulang.");
  const quote = sources.quote;
  const historical = sources.priceBasis?.kind === "historical";
  if (!quote || quote.symbol !== "XUL10" || !Number.isFinite(quote.price) || quote.price <= 0 ||
    (historical ? !historicalPriceIsEligible(sources.priceBasis, quote, now, sources.online) : !quoteIsFresh(quote, now))) {
    throw new Error("Acuan harga XUL10 tidak tersedia atau tidak segar. Muat ulang harga lalu hitung; tidak membuat harga pengganti.");
  }
  const spacing = referenceSpacing(sources.context?.history.analysis?.atr14 ?? NaN);
  const a = getStudyReference(sources.context, now, sources.online).analysis;
  if (!a || a.source !== "LGD Daily" || ![a.lastOpen, a.lastHigh, a.lastLow, a.lastClose].every(n => typeof n === "number" && Number.isFinite(n) && n > 0)) {
    throw new Error("OHLC LGD D1 selesai terakhir belum lengkap; tidak memakai angka pengganti.");
  }
  const levels = newsmakerLevels({ open: a.lastOpen!, high: a.lastHigh!, low: a.lastLow!, close: a.lastClose });
  if (a.lastHigh! <= a.lastLow!) throw new Error("Rentang D1 datar; level Pivot/Fibonacci bertumpuk.");
  // Context describes conditions; it does not gate strategies or erase the price map.
  const maxLayers = 3;
  const contextReasons: Copy[] = [];
  const note = (id: string, en: string) => contextReasons.push({ id, en });
  const fresh = (at: string | null | undefined, age: number) => {
    const delta = now - Date.parse(at ?? "");
    return Number.isFinite(delta) && delta >= 0 && delta <= age;
  };
  const calendar = sources.context?.calendar;
  const calendarReady = !!calendar && calendarIsFresh(calendar, now) && calendar.timezone === "Asia/Jakarta";
  let waiting = false;
  if (!calendarReady) note("Kalender belum lengkap/segar; waktu risiko agenda belum dapat dinilai. Rencana ini hanya peta teknikal, bukan saran pasar lengkap.", "Calendar incomplete/stale; event timing risk is unknown. This is a technical map, not a complete market recommendation.");
  else {
    // Inspect the complete snapshot, not the capped presentation of event readings.
    for (const event of calendar.events) {
      if (event.currency !== "USD") continue;
      const minutes = (Date.parse(event.at ?? "") - now) / 60_000;
      if ((event.impact === "high" && !Number.isFinite(minutes)) ||
        (event.impact === "unknown" && (!Number.isFinite(minutes) || (minutes >= -15 && minutes <= 120)))) {
        waiting = true;
        note(`Tunggu kejelasan waktu/dampak agenda USD: ${event.name}. Level tetap ilustratif, bukan instruksi entry.`,
          `Wait for clarity on USD event timing/impact: ${event.name}. Levels remain illustrative, not entry instructions.`);
      }
      if (event.impact === "high" && minutes >= -15 && minutes <= 120) {
        waiting = true;
        note(`Tunggu agenda ${event.name} (${event.at}); jendela 120 menit sebelum–15 menit sesudah. Setelahnya evaluasi ulang, bukan otomatis entry.`,
          `Wait for ${event.name} (${event.at}); from 120 minutes before to 15 minutes after. Reassess afterwards; no automatic entry.`);
      }
    }
    if (!waiting) note("Tidak ditemukan agenda USD high impact di jendela peringatan pada kalender ini; bukan bukti pasar aman atau dampak rilis selesai.", "No high-impact USD event found in this calendar's warning window; not evidence of safety or that release effects have ended.");
  }
  const news = sources.context?.news;
  const f = news?.fundamental;
  const newsReady = news?.status === "ready" && fresh(news.receivedAt, 15 * 60_000);
  const assessed = newsReady && f?.status === "assessed" && fresh(f.evaluatedAt, 15 * 60_000) &&
    f.evidence.length > 0 && f.evidence.every(e =>
      fresh(e.publishedAt, 24 * 3600_000) && fresh(e.reviewedAt, 24 * 3600_000) &&
      Date.parse(e.reviewedAt) >= Date.parse(e.publishedAt) && !!e.excerpt?.trim() && !!e.rationale?.trim() &&
      /^[a-f0-9]{64}$/.test(e.contentHash) && ["covered", "high-uncertainty"].includes(e.tag) && e.reviewMethod !== "ai");
  if (!newsReady) note("Sumber berita belum tersedia/segar; kondisi fundamental belum diketahui. Peta harga tetap tampil tanpa menganggap berita netral.", "News is unavailable/stale; fundamental conditions are unknown. The price map remains visible without treating news as neutral.");
  else if (!assessed) note("Berita tersedia, tetapi dampak belum dinilai dengan bukti redaksi yang valid. Linear dan Martingale tetap ilustrasi, bukan strategi yang dinyatakan layak.", "News is available but impact lacks valid editorial evidence. Linear and Martingale remain illustrations, not strategies declared suitable.");
  else {
    note(`Konteks redaksi mencakup ${f!.evidence.length} artikel terpilih, bukan seluruh berita pasar.`, `Editorial context covers ${f!.evidence.length} selected articles, not the entire market.`);
    if (f!.evidence.some(e => e.tag === "high-uncertainty")) note("Redaksi menandai ketidakpastian tinggi; pertimbangkan menunggu kejelasan dan evaluasi ulang, bukan menambah layer otomatis.", "Editorial evidence marks high uncertainty; consider waiting for clarity and reassessing, not automatically adding layers.");
  }
  note(`Tren referensi LGD D1: ${a.trend}. Bukan prediksi arah XUL10; menyentuh level belum membuktikan pembalikan.`, `LGD D1 reference trend: ${a.trend}. Not an XUL10 direction forecast; touching a level does not confirm a reversal.`);
  if (historical) note("Acuan XUL10 adalah tick terakhir akhir pekan, bukan live atau penutupan resmi. Gap pembukaan dapat mengubah skenario.", "XUL10 uses a last weekend reference tick, not live or an official close. Opening gaps can change the scenario.");
  const pool: ReferenceLevel[] = [];
  const add = (price: number, label: string) => {
    if (!Number.isFinite(price) || price <= 0) return;
    const existing = pool.find(l => l.price.toFixed(2) === price.toFixed(2));
    if (existing) existing.labels.push(label); else pool.push({ price, labels: [label] });
  };
  Object.entries(levels.classic).forEach(([name, price]) => add(price, `Pivot ${name.toUpperCase()}`));
  const fib = side === "buy" ? levels.up : levels.down;
  fib.retracement.forEach(l => add(l.price, `Fibo ${(l.ratio * 100).toFixed(1)}% D1`));
  // These are range anchors, not an inferred multi-day market swing.
  add(a.lastLow!, "Low D1"); add(a.lastHigh!, "High D1");
  const direction = side === "buy" ? 1 : -1;
  const anchor = quote.price;
  const adverse = pool.filter(l => direction * (anchor - l.price) > 0.005)
    .sort((x, y) => direction * (y.price - x.price));
  const zones = selectReferenceZones(adverse, spacing.minimumGap);
  // The stop needs a separate zone too; never invent levels or a synthetic ATR stop.
  const count = Math.min(maxLayers, zones.length - 1);
  if (count < 1) throw new Error("Belum ada zona entry dan batas batal terpisah yang memenuhi jarak D1. Tunggu, jangan memaksakan layer.");
  const entries = zones.slice(0, count).map((l, i) => ({ ...l, index: i + 1 }));
  const stop = zones[count];
  const targets = pool.filter(l => direction * (l.price - entries[0].price) > 0.005)
    .sort((x, y) => direction * (x.price - y.price));
  if (!targets.length) throw new Error("Level TP teknikal yang mendukung skenario belum tersedia.");
  const weights = scenarioLots(strategy, count);
  const unitMargin = weights.reduce((sum, w) => sum + w * contract.marginPerLot, 0);
  const unitLoss = entries.reduce((sum, e, i) => sum + direction * (e.price - stop.price) * weights[i] * contract.dollarsPerPointPerLot, 0);
  const firstLot = Math.floor(Math.min(capital * SCENARIO_BUDGET.marginFraction / unitMargin,
    capital * SCENARIO_BUDGET.stressFraction / unitLoss));
  if (!Number.isSafeInteger(firstLot) || firstLot < 0) throw new Error("Ukuran modal menghasilkan perhitungan lot yang tidak valid.");
  return {
    side, strategy, capital, contract: { ...contract }, evaluatedAt: new Date(now).toISOString(),
    source: "LGD Daily" as const, sourceDate: a.lastDate,
    selectionQuote: { ...quote }, entries, stop, targets, weights,
    spacing, zones,
    previousSelection: { entries: adverse.slice(0, Math.min(3, adverse.length - 1)),
      stop: adverse[Math.min(3, adverse.length - 1)] ?? null },
    firstLot: firstLot >= 1 ? firstLot : null,
    maxLayers, newsUnassessed: !assessed,
    contextStatus: waiting ? "wait" as const : (!calendarReady || !assessed) ? "incomplete" as const : "conditional" as const,
    contextReasons,
  };
}

export type TechnicalReferencePlan = ReturnType<typeof technicalReferencePlan>;

export function captureReferencePlan(capital: number, sources: SuggestionSources, now: number, side: ScenarioSide, strategy: ReferenceStrategy, profile: ContractProfileId = "regular") {
  const detached = structuredClone(sources);
  return { plan: technicalReferencePlan(capital, detached, now, side, strategy, profile), sources: detached, sourceKey: JSON.stringify(detached) };
}

export function referenceSnapshotState(snapshot: ReturnType<typeof captureReferencePlan>, capital: number, sources: SuggestionSources, now: number, profile: ContractProfileId = "regular") {
  let expired = false;
  try {
    if (!validScenarioContract(snapshot.plan.contract)) throw new Error("Snapshot tanpa profil valid; hitung ulang.");
    const current = technicalReferencePlan(snapshot.plan.capital, snapshot.sources, now, snapshot.plan.side, snapshot.plan.strategy, snapshot.plan.contract.id);
    const { evaluatedAt: _before, ...before } = snapshot.plan;
    const { evaluatedAt: _after, ...after } = current;
    expired = JSON.stringify(before) !== JSON.stringify(after);
  } catch { expired = true; }
  return {
    parametersChanged: capital !== snapshot.plan.capital || profile !== snapshot.plan.contract?.id,
    dataChanged: expired || JSON.stringify(sources) !== snapshot.sourceKey || !sources.online,
  };
}

export function referenceFillStage(plan: TechnicalReferencePlan, filled: number) {
  if (!validScenarioContract(plan.contract)) throw new Error("Snapshot tanpa profil valid; hitung ulang.");
  const contract = plan.contract;
  if (!Number.isInteger(filled) || filled < 1 || filled > plan.entries.length) throw new RangeError("Tahap layer tidak valid.");
  const entries = plan.entries.slice(0, filled);
  const weights = plan.weights.slice(0, filled);
  const weight = weights.reduce((s, n) => s + n, 0);
  const average = entries.reduce((s, e, i) => s + e.price * weights[i], 0) / weight;
  const direction = plan.side === "buy" ? 1 : -1;
  const target = plan.targets.find(l => direction * (l.price - average) > 0.005);
  if (!target) throw new Error("TP teknikal belum tersedia untuk tahap ini.");
  // Full-plan sizing and stop stay frozen when exploring a partial fill.
  const totalLots = plan.firstLot === null ? null : weight * plan.firstLot;
  const margin = totalLots === null ? null : totalLots * contract.marginPerLot;
  const lossAtStop = totalLots === null ? null : direction * (average - plan.stop.price) * totalLots * contract.dollarsPerPointPerLot;
  const profitAtTarget = totalLots === null ? null : direction * (target.price - average) * totalLots * contract.dollarsPerPointPerLot;
  return { filled, average, target, totalLots, margin, lossAtStop, profitAtTarget };
}
