import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { BarChart3, Maximize2 } from "lucide-react";
import { AdaptivePanel } from "@/components/live/adaptive-panel";
import { buildScenario, type ScenarioSide } from "@shared/scenario-plan";
import { captureReferencePlan, referenceFillStage, referenceSnapshotState, type ReferenceStrategy } from "@shared/technical-reference-plan";
import { TechnicalReferenceResult } from "@/components/technical-reference-result";
import { quoteIsFresh } from "@shared/live-types";
import { resolveScenarioPrice, samePriceQuote } from "@shared/scenario-price";
import { SCENARIO_BUDGET, CONTRACT_PROFILES, scenarioContract, type ContractProfileId } from "@shared/scenario-contract";
import type { MarketHook } from "@/hooks/use-market";
import { useLanguage } from "@/lib/language-context";
import { useStudy } from "@/lib/study-context";
import { Button } from "@/components/ui/button";
import { TradingViewChart } from "@/components/live/tradingview-chart";
import { NewsmakerReferenceLevels } from "@/components/newsmaker-reference-levels";
import { MarketRuleSummary } from "@/components/market-rule-summary";
import { GuideLink } from "@/components/guide-link";

type Scenario = ReturnType<typeof buildScenario>;
type Controls = { side: ScenarioSide | null; strategy: "Linear Averaging" | "Martingale"; layers: number; target: number; spacing: number };
const DEFAULTS: Omit<Controls, "side"> = { strategy: "Linear Averaging", layers: 3, target: 30, spacing: 30 };
const keyOf = (c: Controls, capital: number) => [c.side, c.strategy, c.layers, c.target, c.spacing, capital].join("|");

function LevelDiagram({ plan, t, filledLayers = plan.layers }: { plan: Scenario; t: (id: string, en: string) => string; filledLayers?: number }) {
  const W = 560, H = 340, top = 28, bottom = 28, axisX = 96;
  const levels = [
    ...plan.entries.map(e => ({ price: e.price, label: `L${e.index} · ${e.lots} lot`, kind: e.index <= filledLayers ? "entry" as const : "pending" as const })),
    { price: plan.average, label: t("Rata-rata basket", "Basket average"), kind: "avg" as const },
    { price: plan.tp, label: "TP", kind: "tp" as const },
    { price: plan.stressPrice, label: t("Stress", "Stress"), kind: "stress" as const },
  ];
  const prices = levels.map(l => l.price);
  const hi = Math.max(...prices), lo = Math.min(...prices), span = hi - lo || 1;
  const y = (p: number) => top + ((hi - p) / span) * (H - top - bottom);
  // Nudge labels so they never overlap.
  const sorted = [...levels].sort((a, b) => y(a.price) - y(b.price));
  let last = -99;
  const placed = sorted.map(l => { const ly = Math.max(y(l.price), last + 15); last = ly; return { ...l, ly }; });
  const color = { entry: "hsl(210 83% 39%)", pending: "hsl(215 18% 43%)", avg: "hsl(216 47% 18%)", tp: "hsl(160 55% 32%)", stress: "hsl(2 59% 46%)" };
  return (
    <svg viewBox={`0 0 ${W} ${Math.max(H, last + 20)}`} role="img" className="w-full h-auto" data-testid="scenario-diagram"
      aria-label={t("Diagram level harga skenario XUL10. Sumbu vertikal adalah harga, bukan waktu.", "XUL10 scenario price-level diagram. The vertical axis is price, not time.")}>
      <line x1={axisX} x2={axisX} y1={top - 10} y2={H - bottom + 10} stroke="hsl(212 24% 70%)" />
      {placed.map((l, i) => (
        <g key={i}>
          <line x1={axisX - 6} x2={W - 150} y1={y(l.price)} y2={y(l.price)} stroke={color[l.kind]} strokeWidth={l.kind === "entry" ? 1.5 : 2} strokeDasharray={l.kind === "entry" ? undefined : l.kind === "pending" ? "4 4" : l.kind === "avg" ? "6 3" : "2 4"} />
          <text x={axisX - 10} y={y(l.price) + 4} textAnchor="end" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="hsl(216 47% 18%)">{l.price.toFixed(2)}</text>
          <text x={W - 142} y={l.ly + 4} fontSize="11.5" fontWeight={l.kind === "entry" ? 500 : 700} fill={color[l.kind]}>{l.label}</text>
        </g>
      ))}
      <text x={axisX} y={12} textAnchor="middle" fontSize="10" fill="hsl(215 18% 43%)">{t("Harga XUL10", "XUL10 price")}</text>
    </svg>
  );
}

export type StudyControls = { strategy: "Linear Averaging" | "Martingale"; targetPoin: string; maxLayer: string; experience: string };
export type StudySlot = {
  fields: ReactNode; result: ReactNode; summary?: ReactNode; glance: ReactNode;
  values: StudyControls; defaults: StudyControls;
  onChange: (patch: Partial<StudyControls>) => void;
  submit: (override?: Partial<StudyControls>) => boolean;
};
export function ScenarioWorkspace({ capital, market, study, capitalField, initialMode = "market", onModeChange }: { capital: string; capitalField?: (profile: ContractProfileId) => ReactNode; market: MarketHook; study?: StudySlot; initialMode?: "market" | "manual"; onModeChange?: (m: "market" | "manual") => void }) {
  const { t, language } = useLanguage();
  const { calculatorDraft, setCalculatorDraft } = useStudy();
  const [c, setC] = useState<Controls>(() => calculatorDraft?.controls ?? { side: null, ...DEFAULTS });
  const [inputMode, setInputMode] = useState<"market" | "manual">(() => calculatorDraft?.mode ?? initialMode);
  const [contractProfile, setContractProfile] = useState<ContractProfileId>(() => calculatorDraft?.contractProfile ?? "regular");
  const [profileInvalidated, setProfileInvalidated] = useState(false);
  useEffect(() => { onModeChange?.(inputMode); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // Manual studies always use Regular assumptions, so capital presets follow the profile actually applied.
  const capitalProfile: ContractProfileId = inputMode === "market" ? contractProfile : "regular";
  // Keep unsaved inputs during in-app navigation, never restore a live-result snapshot.
  useEffect(() => {
    setCalculatorDraft({ controls: c, mode: inputMode, contractProfile });
  }, [c, inputMode, contractProfile, setCalculatorDraft]);
  const pickMode = (m: "market" | "manual") => {
    if (m === inputMode) return;
    setInputMode(m); setErr(null); onModeChange?.(m);
    // A plan from the other mode must not be shown as this mode's result.
    setSnap(null); setTechnical(null); setSourceInvalidated(false); setDirectionInvalidated(false); setProfileInvalidated(false);
  };
  const [snap, setSnap] = useState<{ plan: Scenario; key: string } | null>(null);
  const [technical, setTechnical] = useState<ReturnType<typeof captureReferencePlan> | null>(null);
  const [referenceStrategy, setReferenceStrategy] = useState<ReferenceStrategy>("Linear Averaging");
  const [sourceInvalidated, setSourceInvalidated] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [directionInvalidated, setDirectionInvalidated] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const money = (n: number) => n.toLocaleString(language === "id" ? "id-ID" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const cap = Number(capital);
  const quote = market.usableQuote && quoteIsFresh(market.usableQuote, market.now) ? market.usableQuote : null;
  const providerReady = market.online && !market.quotes.isError && market.quotes.data?.status === "ready";
  const priceBasis = resolveScenarioPrice(market.quotes.data?.quote, market.now, providerReady);
  const scenarioQuote = priceBasis?.quote ?? null;
  const historical = priceBasis?.kind === "historical";
  const priceTime = scenarioQuote?.asOf ? new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Jakarta",
  }).format(new Date(scenarioQuote.asOf)) + " WIB" : "";
  const capOk = capital.trim() !== "" && Number.isFinite(cap) && cap > 0;
  const sources = {
    quote: scenarioQuote, context: market.context.isError ? null : market.context.data,
    online: market.online, connectionRevision: market.connectionRevision,
    ...(historical ? { priceBasis: priceBasis! } : {}),
  };
  const marketState = technical ? referenceSnapshotState(technical, cap, sources, market.now, contractProfile) : null;
  const contract = scenarioContract(contractProfile);
  const profileName = (id: ContractProfileId) => id === "regular" ? t("Reguler", "Regular") : id === "micro" ? t("Mikro", "Micro") : "Mini";
  useEffect(() => {
    if (marketState?.dataChanged) setSourceInvalidated(true);
  }, [marketState?.dataChanged]);
  const upd = (p: Partial<Controls>) => {
    setErr(null);
    if (p.side && p.side !== c.side && (snap || technical)) setDirectionInvalidated(true);
    setC(prev => ({ ...prev, ...p }));
  };

  // In manual mode strategy/target/layers come from the single shared study draft.
  const eff: Controls = study && inputMode === "manual"
    ? { ...c, strategy: study.values.strategy, target: Number(study.values.targetPoin), layers: Number(study.values.maxLayer) }
    : c;
  const calculate = (next: Controls) => {
    const basis = resolveScenarioPrice(market.quotes.data?.quote, Date.now(), providerReady);
    const q = basis?.quote;
    if (!q) return setErr(t("Acuan XUL10 tidak tersedia atau tidak memenuhi syarat. Studi manual tetap tersedia.", "No eligible XUL10 price basis. Manual study remains available."));
    if (!next.side) return setErr(t("Pilih arah Buy atau Sell lebih dulu.", "Choose Buy or Sell first."));
    if (!capOk) return setErr(t("Isi modal positif pada kolom Modal.", "Enter a positive capital in the Capital field."));
    try {
      const plan = buildScenario({ side: next.side, capital: cap, entry: q.price, spacing: next.spacing, target: next.target, layers: next.layers, strategy: next.strategy, asOf: q.asOf!, mode: "manual", priceBasis: basis! });
      setSnap({ plan, key: keyOf(next, cap) });
      setDetailOpen(true);
      setSourceInvalidated(false);
      setDirectionInvalidated(false);
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : t("Input tidak valid.", "Invalid input.")); }
  };
  const suggest = () => {
    setTechnical(null); setSnap(null);
    if (!c.side) return setErr(t("Pilih arah Buy atau Sell lebih dulu.", "Choose Buy or Sell first."));
    if (!capOk) return setErr(t("Isi modal positif pada kolom Modal.", "Enter positive capital in the Capital field."));
    const basis = resolveScenarioPrice(market.quotes.data?.quote, Date.now(), providerReady);
    try {
      setTechnical(captureReferencePlan(cap, {
        ...sources, quote: basis?.quote ?? null,
        priceBasis: basis?.kind === "historical" ? basis : undefined,
      }, Date.now(), c.side, referenceStrategy, contractProfile));
      setDetailOpen(true);
      setDirectionInvalidated(false);
      setSourceInvalidated(false);
      setProfileInvalidated(false);
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : t("Saran tidak valid.", "Invalid suggestion.")); }
  };
  const manualAction = () => {
    if (study && !study.submit()) return;
    setDetailOpen(true);
    if (!scenarioQuote) { setSnap(null); setErr(null); return; }
    calculate(eff);
  };
  const useDefault = () => {
    const n: Controls = { ...c, ...DEFAULTS };
    setC(n);
    if (study) {
      study.onChange(study.defaults);
      if (!study.submit(study.defaults)) return;
      setDetailOpen(true);
    }
    if (scenarioQuote) calculate(n); else { setSnap(null); setErr(null); }
  };

  const plan = snap?.plan;
  const changed = !!snap && snap.key !== keyOf(eff, cap);
  const sideChanged = !!plan && (directionInvalidated || plan.side !== c.side);
  const technicalInvalid = !!technical && (directionInvalidated || technical.plan.side !== c.side);
  const hasDetail = (inputMode === "market" && !!technical && !technicalInvalid) || (inputMode === "manual" && (!!study?.summary || (!!plan && !sideChanged)));
  let technicalStage: ReturnType<typeof referenceFillStage> | null = null;
  try { if (technical?.plan.stop) technicalStage = referenceFillStage(technical.plan, technical.plan.entries.length); } catch { /* the full result explains a missing stage */ }
  const planLevels = (plan: Scenario) => <>
            {plan.mode === "market" && <div className="rounded-lg border border-border p-3" data-testid="market-sizing-summary">
              <strong>{t("Lot awal hasil hitung", "Calculated first lot")}: {plan.entries[0].lots} lot</strong>
              <p className="live-small mt-1">{t("Ukuran seluruh basket dibatasi margin 20% dan stress 10% modal, dibulatkan ke bawah per 1 lot. Bukan jaminan aman; modal berbeda bisa menghasilkan lot sama.", "The entire basket is capped at 20% capital margin and 10% stress, rounded down in 1-lot increments. Not a safety guarantee; different capital can produce the same lot size.")}</p>
              <p className="live-small mt-1">{t("L1 adalah harga acuan snapshot XUL10, bukan perintah entry sekarang. Layer berikutnya memakai jarak ATR referensi D1; bukan timing intraday atau level Pivot/Fibo XUL10.", "L1 is the XUL10 snapshot reference, not an instruction to enter now. Later layers use D1 reference ATR spacing, not intraday timing or XUL10 Pivot/Fibo levels.")}</p>
            </div>}
            <div className={changed ? "opacity-60" : ""}><LevelDiagram plan={plan} t={t} /></div>
            <div className="overflow-x-auto"><table className="text-xs w-full" data-testid="table-scenario">
              <caption className="text-left live-small pb-1">{t("Level skenario, basis XUL10. Sumbu adalah harga, bukan waktu.", "Scenario levels, XUL10 basis. The axis is price, not time.")}</caption>
              <thead><tr><th className="text-left">{t("Level", "Level")}</th><th className="text-right">{t("Harga", "Price")}</th><th className="text-right">Lot</th></tr></thead>
              <tbody>
                {plan.entries.map(e => <tr key={e.index}><td>Layer {e.index}</td><td className="text-right live-mono">{e.price.toFixed(2)}</td><td className="text-right live-mono">{e.lots}</td></tr>)}
                <tr><td>{t("Rata-rata basket", "Basket average")}</td><td className="text-right live-mono">{plan.average.toFixed(2)}</td><td className="text-right live-mono">{plan.totalLots}</td></tr>
                <tr><td>TP</td><td className="text-right live-mono">{plan.tp.toFixed(2)}</td><td /></tr>
                <tr><td>{t("Titik stress", "Stress point")}</td><td className="text-right live-mono">{plan.stressPrice.toFixed(2)}</td><td /></tr>
              </tbody></table></div>
  </>;
  const planMoney = (plan: Scenario) => <>
            <dl className="text-sm grid grid-cols-2 gap-2">
              <dt>{t("Margin", "Margin")}</dt><dd>{money(plan.margin)} ({plan.marginPercent.toFixed(1)}%)</dd>
              <dt>{t("Rugi stress", "Stress loss")}</dt><dd>{money(plan.stressLoss)} ({plan.stressPercent.toFixed(1)}%)</dd>
              <dt>{t("Profit di TP", "Profit at TP")}</dt><dd>{money(plan.targetProfit)}</dd>
            </dl>
  </>;
  const planNotes = (plan: Scenario) => <>
            {comparison.length > 0 && <details className="live-details" data-testid="manual-strategy-comparison">
              <summary>{t("Bandingkan Linear dan Martingale", "Compare Linear and Martingale")}</summary>
              <p className="live-small mt-2">{t("Modal, arah, harga awal, jarak, target dan jumlah layer sama. Hanya pola lot yang berbeda; ini bukan saran strategi.", "Same capital, direction, starting price, spacing, target and layer count. Only lot sizing differs; this is not a strategy recommendation.")}</p>
              <div className="overflow-x-auto mt-2"><table className="w-full text-xs">
                <thead><tr><th className="text-left">{t("Strategi", "Strategy")}</th><th className="text-right">Lot</th><th className="text-right">Margin</th><th className="text-right">{t("Rugi stress", "Stress loss")}</th></tr></thead>
                <tbody>{comparison.map(item => <tr key={item.strategy}>
                  <th className="text-left">{item.strategy === "Linear Averaging" ? "Linear" : "Martingale"}</th>
                  <td className="text-right">{item.totalLots}</td><td className="text-right whitespace-nowrap">{money(item.margin)}</td><td className="text-right whitespace-nowrap">{money(item.stressLoss)}</td>
                </tr>)}</tbody>
              </table></div>
              <p className="live-small mt-2">{t("Margin bukan batas rugi; stress bukan kerugian maksimum. Batas simulasi tetap margin 20% dan stress 10% modal.", "Margin is not a loss limit; stress is not maximum loss. Simulation limits remain 20% capital margin and 10% stress loss.")}</p>
            </details>}
            {plan.mode === "manual" && comparison.length === 0 && <p role="status" className="live-small">{t("Perbandingan strategi tidak tersedia: parameter menghasilkan level harga alternatif yang tidak valid.", "Strategy comparison unavailable: these parameters produce invalid alternative price levels.")}</p>}
            {(plan.marginPercent > SCENARIO_BUDGET.marginFraction * 100 || plan.stressPercent > SCENARIO_BUDGET.stressFraction * 100) && <p role="alert" className="live-error" data-testid="scenario-budget-warning">{t("Melewati batas simulasi: margin 20% atau rugi stress 10% modal. Contoh ini tidak lolos saringan MRG.", "Exceeds simulation limits: 20% capital margin or 10% stress loss. This example does not pass MRG filters.")}</p>}
            <p className="live-small">{plan.mode === "market"
              ? t("TP mengikuti asumsi layer terisi yang Anda pilih, bukan target order otomatis. Margin bukan batas kerugian; stress bukan kerugian maksimum. Biaya dan spread belum dihitung.", "TP follows your chosen assumed filled layers, not an automatic order target. Margin is not a loss limit; stress is not maximum loss. Fees and spread are excluded.")
              : t("TP mengasumsikan semua layer terisi. Margin bukan batas kerugian; stress bukan kerugian maksimum. Biaya dan spread belum dihitung.", "TP assumes all layers filled. Margin is not a loss limit; stress is not maximum loss. Fees and spread are excluded.")}</p>
  </>;
  // Manual study and plan detail sit side by side in the wide result panel.
  const splitDetail = inputMode === "manual" && !!study?.summary && !!plan && !sideChanged;
  const formatTime = (iso: string) => new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso)) + " WIB";
  const openDetailButton = <Button type="button" variant="outline" className="w-full min-h-[44px] gap-2" onClick={() => setDetailOpen(true)} data-testid="button-open-scenario-result">
    <Maximize2 className="w-4 h-4" aria-hidden="true" />{t("Lihat hasil lengkap", "View full result")}
  </Button>;
  const moved = useMemo(() => (plan && quote ? quote.price - plan.entry : null), [plan, quote]);
  const comparison = useMemo(() => {
    if (!plan || plan.mode !== "manual") return [];
    try {
      return (["Linear Averaging", "Martingale"] as const).map(strategy =>
        buildScenario({ ...plan, strategy }));
    } catch {
      // A valid selected strategy can still have invalid alternative price geometry.
      return [];
    }
  }, [plan]);
  const num = "w-full min-h-[44px] rounded-[10px] border border-input bg-background px-3";
  const seg = (active: boolean) => `min-h-[44px] flex-1 rounded-md px-3 text-sm font-bold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`;
  const segGroup = "mrg-segmented flex gap-1 rounded-lg border border-border bg-muted/60 p-1";

  return (
    <section aria-label={t("Kalkulator skenario MRG", "MRG scenario calculator")} data-testid="scenario-workspace" className="mb-4">
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="live-card mrg-workspace-market min-w-0 lg:col-start-1 lg:row-start-1 lg:self-stretch" data-testid="workspace-market">
          <h2>{t("Grafik pasar", "Market chart")}</h2>
          <p className="mrg-chart-warning mt-2" data-testid="text-chart-source">
            {t("OANDA:XAUUSD · TradingView · bukan harga XUL10", "OANDA:XAUUSD · TradingView · not XUL10 prices")} <GuideLink topic="sumber" compact />
          </p>
          <div className="min-w-0 mt-3"><TradingViewChart online={market.online} /></div>
          <div className="flex flex-wrap gap-2 mt-3" aria-label={t("Buka bahan analisis", "Open analysis resources")}>
            {(["technical", "calendar", "news"] as const).map(tab => <Link key={tab} href={`/analysis?tab=${tab}`} className="live-button">
              {tab === "technical" ? t("Teknikal", "Technical") : tab === "calendar" ? t("Kalender", "Calendar") : t("Berita", "News")}
            </Link>)}
          </div>
          <details className="live-details mt-3">
            <summary>{t("Konteks pasar", "Market context")}</summary>
            <div className="min-w-0 mt-3">
            {study?.glance}
            </div>
          </details>
          <NewsmakerReferenceLevels market={market} />
        </div>

        <div className="min-w-0 grid gap-4 lg:contents">
        <div className="live-card min-w-0 lg:col-start-2 lg:row-start-1 lg:self-stretch">
          <div className="flex justify-between items-center gap-2"><h2>{t("Kalkulator skenario", "Scenario calculator")}</h2><GuideLink compact /></div>
          <div className={`${segGroup} mt-3`} role="group" aria-label={t("Cara mengisi", "Input method")}>
            <button type="button" className={seg(inputMode === "market")} aria-pressed={inputMode === "market"} onClick={() => pickMode("market")} data-testid="mode-market">{t("Saran MRG", "MRG suggestion")}</button>
            <button type="button" className={seg(inputMode === "manual")} aria-pressed={inputMode === "manual"} onClick={() => pickMode("manual")} data-testid="mode-manual">{t("Isi Manual", "Manual input")}</button>
          </div>
          <div className="live-stack mt-3">
            <div className="rounded-lg bg-muted/70 p-3" data-testid="scenario-price">
              <span className="live-label">{historical ? t("Harga XUL10 terakhir · bukan live", "Last XUL10 price · not live") : t("Harga XUL10 (polling)", "XUL10 price (polling)")}</span>
              <div className="live-mono text-2xl font-medium">{scenarioQuote ? scenarioQuote.price.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</div>
              <span className="live-small">{scenarioQuote ? `${historical ? t("Acuan historis akhir pekan", "Weekend historical reference") : t("segar", "fresh")} · ${priceTime} · ${scenarioQuote.source}` : t("Harga tidak tersedia atau tidak memenuhi syarat. Studi manual tetap tersedia.", "No eligible price available. Manual study remains available.")}</span>
              {historical && <p className="live-small mt-2" data-testid="historical-price-disclosure">{t("Bukan penutupan resmi. Jadwal sesi belum terverifikasi; ini tidak menyatakan market pasti tutup. Harga pembukaan dapat gap.", "Not an official close. Session hours are unverified; this does not confirm market closure. Opening prices can gap.")}</p>}
            </div>
            {inputMode === "market" ? <div className="space-y-2">
              <span className="live-label">{t("Jenis simulasi", "Simulation type")}</span>
              <div role="group" aria-label={t("Jenis simulasi", "Simulation type")} className={segGroup}>
                {(Object.keys(CONTRACT_PROFILES) as ContractProfileId[]).map(id => <button key={id} type="button"
                  className={seg(contractProfile === id)} aria-pressed={contractProfile === id} data-testid={`profile-${id}`}
                  onClick={() => {
                    if (id === contractProfile) return;
                    if (technical) setProfileInvalidated(true);
                    setContractProfile(id); setErr(null);
                  }}>{profileName(id)}</button>)}
              </div>
              <p className="live-small" data-testid="profile-assumptions">{profileName(contractProfile)} · {t("margin", "margin")} {money(contract.marginPerLot)}/lot · {money(contract.dollarsPerPointPerLot)}/{t("poin", "point")}/lot <GuideLink topic="modal-risiko" compact /></p>
            </div> : <p className="live-small" data-testid="manual-profile-note">{t("Manual · Reguler · margin US$1.000/lot · US$100/poin/lot", "Manual · Regular · margin US$1,000/lot · US$100/point/lot")}</p>}
            {capitalField?.(capitalProfile)}
            <div className="space-y-2">
              <span className="live-label">{t("Arah posisi", "Direction")}</span>
              <div role="group" aria-label={t("Arah pilihan Anda", "Your chosen direction")} className={segGroup}>
                <button type="button" className={seg(c.side === "buy")} aria-pressed={c.side === "buy"} onClick={() => upd({ side: "buy" })} data-testid="button-side-buy">Buy</button>
                <button type="button" className={seg(c.side === "sell")} aria-pressed={c.side === "sell"} onClick={() => upd({ side: "sell" })} data-testid="button-side-sell">Sell</button>
              </div>
            </div>
            {inputMode === "market" && <div className="space-y-2">
              <span className="live-label">{t("Pola penambahan lot", "Lot progression")}</span>
              <div className={segGroup} role="group" aria-label={t("Pola penambahan lot", "Lot progression")}>
              {(["Linear Averaging", "Martingale"] as const).map(strategy => <button type="button" key={strategy}
                className={seg(referenceStrategy === strategy)} aria-pressed={referenceStrategy === strategy}
                data-testid={strategy === "Martingale" ? "reference-strategy-martingale" : "reference-strategy-linear"}
                onClick={() => { setReferenceStrategy(strategy); setTechnical(null); setErr(null); }}>
                {strategy === "Martingale" ? "Martingale · 1:2:4" : "Linear · 1:2:3"}
              </button>)}
              </div>
            </div>}
            {inputMode === "manual" && study?.fields}
            {inputMode === "manual" && <div className="live-field">
              <label htmlFor="sc-spacing">{t("Jarak layer skenario (poin)", "Scenario layer spacing (points)")}</label>
              <input id="sc-spacing" className={num} type="number" min="1" step="any" value={c.spacing} onChange={e => upd({ spacing: Number(e.target.value) })} data-testid="input-sc-spacing" />
            </div>}
            {err && <p role="alert" className="live-error" data-testid="text-scenario-error">{err}</p>}
            <div className="flex gap-2 flex-wrap">
              <Button type="button" className="flex-1 min-h-[48px] text-base shadow-sm" disabled={inputMode === "market" ? (!scenarioQuote || market.context.isPending) : false} onClick={() => inputMode === "market" ? suggest() : manualAction()} data-testid="button-calculate-scenario">{historical ? t("Hitung simulasi historis", "Calculate historical simulation") : inputMode === "market" ? t("Lihat Saran MRG", "View MRG suggestion") : t("Hitung", "Calculate")}</Button>
              {inputMode === "manual" && <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={useDefault} data-testid="button-default-simulation">{t("Simulasi default", "Default simulation")}</Button>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="live-small" data-testid="text-default-disclosure">{inputMode === "market"
                ? t("Pivot/Fibo LGD D1 · bukan level XUL10 presisi", "LGD D1 Pivot/Fibo · not precise XUL10 levels")
                : t("Manual · parameter pilihan Anda", "Manual · your chosen parameters")}</span>
              <GuideLink topic={inputMode === "market" ? "pivot-fibo" : "cara-pakai"} compact />
            </div>
            {inputMode === "market" && <details className="live-details">
              <summary>{t("Pembacaan berita & kalender", "News & calendar context")}</summary>
              <MarketRuleSummary
              analysis={technical ? technical.sources.context?.ruleAnalysis : market.context.data?.ruleAnalysis}
              frozen={!!technical} />
            </details>}
          </div>
        </div>

        <div className="live-card min-w-0 lg:col-span-2 lg:row-start-2" aria-live="polite" data-testid="scenario-result">
          <h2>{t("Hasil skenario", "Scenario result")}</h2>
          {inputMode === "market" && technical && <div className="mrg-result-ready mt-3">
            <div className="mrg-result-head">
              <span className="mrg-result-kind">{t("Snapshot saran MRG", "MRG suggestion snapshot")}</span>
              <p className="live-small">{technical.plan.side === "buy" ? "Buy" : "Sell"} · {technical.plan.strategy} · {profileName(technical.plan.contract?.id ?? contractProfile)} · D1 {technical.plan.sourceDate}</p>
            </div>
            {(profileInvalidated || sourceInvalidated || marketState?.dataChanged || marketState?.parametersChanged) && <p role="status" className="live-error" data-testid="reference-snapshot-stale">{t("Snapshot lama: jenis simulasi, data atau modal berubah/tidak segar. Hitung ulang; level dan lot tidak bergeser otomatis.", "Old snapshot: simulation type, data or capital changed/expired. Recalculate; levels and lots never move automatically.")}</p>}
            {technicalInvalid ? <p role="status" className="live-error" data-testid="text-side-invalidated">{t("Arah berubah. Hitung ulang untuk rencana arah yang dipilih.", "Direction changed. Recalculate for the selected side.")}</p> : <>
              {technicalStage && <dl className="mrg-result-metrics">
                <div><dt>{t("Lot awal", "First lot")}</dt><dd>{technical.plan.firstLot ?? t("Rasio", "Ratio")}</dd></div>
                <div><dt>{t("Total lot", "Total lots")}</dt><dd>{technicalStage.totalLots ?? "—"}</dd></div>
                <div><dt>TP</dt><dd>{technicalStage.target.price.toFixed(2)}</dd></div>
                <div><dt>{t("Batas batal", "Invalidation")}</dt><dd>{technical.plan.stop.price.toFixed(2)}</dd></div>
              </dl>}
              {openDetailButton}
            </>}
          </div>}
          {inputMode === "manual" && (plan || study?.summary) && <div className="mrg-result-ready mt-3">
            <div className="mrg-result-head">
              <span className="mrg-result-kind">{plan?.priceBasis?.kind === "historical" ? t("Simulasi historis · bukan saran realtime", "Historical simulation · not realtime advice") : t("Skenario manual hipotetis", "Hypothetical manual scenario")}</span>
              <p className="live-small">{c.side === "buy" ? "Buy" : c.side === "sell" ? "Sell" : "—"} · {plan?.strategy ?? study?.values.strategy}{plan ? ` · ${t("harga masuk", "entry")} ${plan.entry.toFixed(2)} · ${formatTime(plan.asOf)}` : ""}</p>
            </div>
            {study?.summary}
            {plan && <>
            {plan.priceBasis?.kind === "historical" && <p role="status" className="mrg-chart-warning" data-testid="historical-scenario-warning">{t("Harga terakhir XUL10 dari Newsmaker, bukan penutupan resmi atau prediksi pembukaan. Gap pembukaan, spread, dan biaya dapat mengubah hasil. Berita dan kalender diperiksa saat evaluasi, bukan pada waktu tick.", "Last XUL10 tick from Newsmaker, not an official close or opening forecast. Opening gaps, spread and fees can change outcomes. News and calendar are checked at evaluation time, not tick time.")}</p>}
            {plan.priceBasis?.kind === "historical" && (!historical || !samePriceQuote(plan.priceBasis.quote, scenarioQuote)) && <p role="status" className="live-error" data-testid="historical-basis-changed">{t("Acuan berubah atau tidak lagi layak; hasil ini tetap snapshot historis lama. Hitung ulang dengan acuan yang tersedia, level tidak diperbarui otomatis.", "The price basis changed or expired; this remains an old historical snapshot. Recalculate with the available basis; levels never update automatically.")}</p>}
            {changed && <p role="status" className="live-error" data-testid="text-scenario-changed">{t("Arah atau input berubah. Snapshot di bawah adalah skenario lama dan tidak ikut berubah; jalankan perhitungan lagi.", "Direction or inputs changed. The snapshot below is the old scenario and was not rewritten; recalculate to update it.")}</p>}
            {moved !== null && Math.abs(moved) >= 0.01 && <p role="status" className="live-small" data-testid="text-market-moved">{t(`Harga XUL10 sekarang ${quote!.price.toFixed(2)}, bergeser ${moved > 0 ? "+" : ""}${moved.toFixed(2)} dari snapshot. Level tidak diubah otomatis.`, `XUL10 is now ${quote!.price.toFixed(2)}, ${moved > 0 ? "+" : ""}${moved.toFixed(2)} from the snapshot. Levels are not changed automatically.`)}</p>}
            {!quote && plan.priceBasis?.kind !== "historical" && <p role="status" className="live-small">{t("Harga saat ini tidak segar; snapshot tetap sebagai skenario lama.", "The current price is not fresh; the snapshot stays as an old scenario.")}</p>}
            </>}
            {plan && (sideChanged ? <p role="status" className="live-error" data-testid="text-side-invalidated">{t("Arah dipilih ulang: hasil sebelumnya tidak berlaku dan disembunyikan. Tekan Hitung skenario.", "Direction re-selected: the earlier result no longer applies and is hidden. Press Calculate.")}</p> :
              <dl className="mrg-result-metrics">
                <div><dt>{t("Total lot", "Total lots")}</dt><dd>{plan.totalLots}</dd></div>
                <div><dt>{t("Margin", "Margin")}</dt><dd>{plan.marginPercent.toFixed(1)}%</dd></div>
                <div><dt>{t("Rugi stress", "Stress loss")}</dt><dd>{plan.stressPercent.toFixed(1)}%</dd></div>
                <div><dt>TP</dt><dd>{plan.tp.toFixed(2)}</dd></div>
              </dl>)}
            {!plan && !scenarioQuote && <p className="live-small">{t("Diagram entry dan TP memerlukan harga XUL10 live atau acuan historis akhir pekan yang memenuhi syarat.", "Entry and TP diagrams need a live XUL10 price or an eligible weekend historical reference.")}</p>}
            {hasDetail && openDetailButton}
          </div>}
          {!technical && !plan && !(inputMode === "manual" && study?.summary) && <div className="mrg-result-empty mt-3">
            <BarChart3 className="w-6 h-6" aria-hidden="true" />
            <p className="live-small">{inputMode === "manual" && !scenarioQuote
            ? t("Perhitungan studi tetap tersedia. Diagram entry dan TP memerlukan harga XUL10 live atau acuan historis akhir pekan yang memenuhi syarat.", "Study calculations remain available. Entry and TP diagrams need a live XUL10 price or an eligible weekend historical reference.")
            : t("Pilih arah, lalu hitung. Diagram level harga dan tabel muncul di sini.", "Pick a direction, then calculate. A price-level diagram and table appear here.")}</p>
          </div>}
          <div className="mt-2" data-testid="scenario-limits"><GuideLink topic="sumber" /></div>
        </div>
        <AdaptivePanel open={detailOpen && hasDetail} onOpenChange={setDetailOpen} onCloseAutoFocus={() => {}}
          title={t("Hasil skenario", "Scenario result")}
          description={plan ? `${plan.side === "buy" ? "Buy" : "Sell"} · ${plan.strategy} · ${t("harga masuk", "entry")} ${plan.entry.toFixed(2)}` : `${c.side === "buy" ? "Buy" : "Sell"} · ${referenceStrategy} · ${profileName(contractProfile)}`}
          note={t("Simulasi edukasi · bukan sinyal atau order broker", "Educational simulation · not a signal or broker order")}
          testId="scenario-result-panel" wide closeLabel={t("Tutup hasil skenario", "Close scenario result")}
          footer={<button type="button" className="live-button primary" onClick={() => setDetailOpen(false)} data-testid="button-close-scenario-result">{t("Tutup", "Close")}</button>}>
          {inputMode === "market" && technical && !technicalInvalid && <TechnicalReferenceResult plan={technical.plan} t={t} money={money} />}
          {splitDetail && plan ? <div className="mrg-result-split">
            <div className="mrg-result-split-study live-stack">
              {study?.result}
              {planMoney(plan)}
            </div>
            <div className="live-stack">{planLevels(plan)}{planNotes(plan)}</div>
          </div> : <>
            {inputMode === "manual" && study?.summary && <div className="mrg-result-split-study">{study.result}</div>}
            {plan && !sideChanged && <div className="live-stack">{planLevels(plan)}{planMoney(plan)}{planNotes(plan)}</div>}
          </>}
        </AdaptivePanel>
        </div>
      </div>
    </section>
  );
}
