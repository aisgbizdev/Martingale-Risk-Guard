import { useEffect, useMemo, useState } from "react";
import { buildScenario, type ScenarioSide } from "@shared/scenario-plan";
import { quoteIsFresh } from "@shared/live-types";
import type { MarketHook } from "@/hooks/use-market";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { TradingViewChart } from "@/components/live/tradingview-chart";
import { NewsmakerReferenceLevels } from "@/components/newsmaker-reference-levels";

type Scenario = ReturnType<typeof buildScenario>;
type Controls = { side: ScenarioSide | null; strategy: "Linear Averaging" | "Martingale"; layers: number; target: number; spacing: number };
const DEFAULTS: Omit<Controls, "side"> = { strategy: "Linear Averaging", layers: 3, target: 30, spacing: 30 };
const keyOf = (c: Controls, capital: number) => [c.side, c.strategy, c.layers, c.target, c.spacing, capital].join("|");

function LevelDiagram({ plan, t }: { plan: Scenario; t: (id: string, en: string) => string }) {
  const W = 560, H = 340, top = 28, bottom = 28, axisX = 96;
  const levels = [
    ...plan.entries.map(e => ({ price: e.price, label: `L${e.index} · ${e.lots} lot`, kind: "entry" as const })),
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
  const color = { entry: "hsl(210 83% 39%)", avg: "hsl(216 47% 18%)", tp: "hsl(160 55% 32%)", stress: "hsl(2 59% 46%)" };
  return (
    <svg viewBox={`0 0 ${W} ${Math.max(H, last + 20)}`} role="img" className="w-full h-auto" data-testid="scenario-diagram"
      aria-label={t("Diagram level harga skenario XUL10. Sumbu vertikal adalah harga, bukan waktu.", "XUL10 scenario price-level diagram. The vertical axis is price, not time.")}>
      <line x1={axisX} x2={axisX} y1={top - 10} y2={H - bottom + 10} stroke="hsl(212 24% 70%)" />
      {placed.map((l, i) => (
        <g key={i}>
          <line x1={axisX - 6} x2={W - 150} y1={y(l.price)} y2={y(l.price)} stroke={color[l.kind]} strokeWidth={l.kind === "entry" ? 1.5 : 2} strokeDasharray={l.kind === "entry" ? undefined : l.kind === "avg" ? "6 3" : "2 4"} />
          <text x={axisX - 10} y={y(l.price) + 4} textAnchor="end" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="hsl(216 47% 18%)">{l.price.toFixed(2)}</text>
          <text x={W - 142} y={l.ly + 4} fontSize="11.5" fontWeight={l.kind === "entry" ? 500 : 700} fill={color[l.kind]}>{l.label}</text>
        </g>
      ))}
      <text x={axisX} y={12} textAnchor="middle" fontSize="10" fill="hsl(215 18% 43%)">{t("Harga XUL10", "XUL10 price")}</text>
    </svg>
  );
}

export function ScenarioWorkspace({ capital, market }: { capital: string; market: MarketHook }) {
  const { t, language } = useLanguage();
  const [view, setView] = useState<"market" | "scenario">("scenario");
  const [largeScreen, setLargeScreen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const changed = () => setLargeScreen(query.matches);
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  const [c, setC] = useState<Controls>({ side: null, ...DEFAULTS });
  const [snap, setSnap] = useState<{ plan: Scenario; key: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [directionInvalidated, setDirectionInvalidated] = useState(false);
  const money = (n: number) => n.toLocaleString(language === "id" ? "id-ID" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const cap = Number(capital);
  const quote = market.usableQuote && quoteIsFresh(market.usableQuote, market.now) ? market.usableQuote : null;
  const capOk = capital.trim() !== "" && Number.isFinite(cap) && cap > 0;
  const upd = (p: Partial<Controls>) => {
    setErr(null);
    if (p.side && p.side !== c.side && snap) setDirectionInvalidated(true);
    setC(prev => ({ ...prev, ...p }));
  };

  const calculate = (next: Controls) => {
    const q = market.usableQuote;
    if (!q || !quoteIsFresh(q, Date.now())) return setErr(t("Harga XUL10 tidak segar; skenario dari harga nyata tidak dapat dibuat.", "XUL10 price is not fresh; a real-price scenario cannot be built."));
    if (!next.side) return setErr(t("Pilih arah Buy atau Sell lebih dulu.", "Choose Buy or Sell first."));
    if (!capOk) return setErr(t("Isi modal positif pada kolom Modal.", "Enter a positive capital in the Capital field."));
    try {
      const plan = buildScenario({ side: next.side, capital: cap, entry: q.price, spacing: next.spacing, target: next.target, layers: next.layers, strategy: next.strategy, asOf: q.asOf!, mode: "manual" });
      setSnap({ plan, key: keyOf(next, cap) });
      setDirectionInvalidated(false);
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : t("Input tidak valid.", "Invalid input.")); }
  };
  const useDefault = () => { const n = { ...c, ...DEFAULTS }; setC(n); calculate(n); };

  const plan = snap?.plan;
  const changed = !!snap && snap.key !== keyOf(c, cap);
  const sideChanged = !!plan && (directionInvalidated || plan.side !== c.side);
  const moved = useMemo(() => (plan && quote ? quote.price - plan.entry : null), [plan, quote]);
  const num = "w-full min-h-[44px] rounded-[10px] border border-input bg-background px-3";
  const seg = (active: boolean) => `min-h-[44px] flex-1 rounded-md border px-3 text-sm font-bold ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`;

  return (
    <section aria-label={t("Kalkulator skenario MRG", "MRG scenario calculator")} data-testid="scenario-workspace" className="mb-4">
      <div role="group" aria-label={t("Tampilan", "View")} className="flex gap-2 mb-3 lg:hidden">
        <button type="button" className={seg(view === "market")} aria-pressed={view === "market"} onClick={() => setView("market")} data-testid="button-view-market">{t("Pasar", "Market")}</button>
        <button type="button" className={seg(view === "scenario")} aria-pressed={view === "scenario"} onClick={() => setView("scenario")} data-testid="button-view-scenario">{t("Skenario", "Scenario")}</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
        <div className={`live-card min-w-0 ${view === "market" ? "" : "hidden"} lg:block`}>
          <h2>{t("Pasar: referensi OANDA XAUUSD", "Market: OANDA XAUUSD reference")}</h2>
          <p className="mrg-chart-warning mt-2" data-testid="text-chart-source">
            {t("Candle di sini dari OANDA XAUUSD (TradingView), sumber berbeda dari harga XUL10 yang dipakai kalkulator. Level skenario tidak digambar di atas chart ini.", "Candles here are OANDA XAUUSD (TradingView), a different source from the XUL10 price the calculator uses. Scenario levels are not drawn over this chart.")}
          </p>
          {(view === "market" || largeScreen) && <TradingViewChart online={market.online} />}
          <NewsmakerReferenceLevels market={market} />
        </div>

        <div className={`min-w-0 grid gap-4 ${view === "scenario" ? "" : "hidden"} lg:grid`}>
        <div className="live-card min-w-0">
          <h2>{t("Kalkulator skenario", "Scenario calculator")}</h2>
          <p className="live-small mt-1">{t("Edukasi: Anda yang memilih arah. MRG tidak menyarankan Buy atau Sell.", "Education: you choose the direction. MRG does not recommend Buy or Sell.")}</p>
          <div className="live-stack mt-3">
            <div className="rounded-lg bg-muted/70 p-3" data-testid="scenario-price">
              <span className="live-label">{t("Harga XUL10 (polling)", "XUL10 price (polling)")}</span>
              <div className="live-mono text-2xl font-medium">{quote ? quote.price.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</div>
              <span className="live-small">{quote ? `${t("segar", "fresh")} · ${quote.asOf}` : t("Harga tidak tersedia atau tidak segar. Pengambilan harga nyata dinonaktifkan.", "Price unavailable or stale. Real-price capture is disabled.")}</span>
            </div>
            <div className="live-small">{t("Modal", "Capital")}: <strong>{capOk ? money(cap) : "—"}</strong> (<button type="button" className="underline" onClick={() => document.getElementById("f-modal")?.focus()}>{t("ubah", "edit")}</button>)</div>
            <div role="group" aria-label={t("Arah pilihan Anda", "Your chosen direction")} className="flex gap-2">
              <button type="button" className={seg(c.side === "buy")} aria-pressed={c.side === "buy"} onClick={() => upd({ side: "buy" })} data-testid="button-side-buy">Buy</button>
              <button type="button" className={seg(c.side === "sell")} aria-pressed={c.side === "sell"} onClick={() => upd({ side: "sell" })} data-testid="button-side-sell">Sell</button>
            </div>
            <details className="live-details">
            <summary>{t("Atur parameter", "Adjust parameters")} · {c.strategy === "Martingale" ? "Martingale" : "Linear"} · {c.layers} layer · TP {c.target}</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="live-field"><label htmlFor="sc-strategy">{t("Strategi", "Strategy")}</label>
                <select id="sc-strategy" value={c.strategy} onChange={e => upd({ strategy: e.target.value as Controls["strategy"] })} data-testid="select-sc-strategy">
                  <option value="Linear Averaging">Linear (0,1/0,2/0,3)</option><option value="Martingale">Martingale (x2)</option></select></div>
              <div className="live-field"><label htmlFor="sc-layers">{t("Layer", "Layers")}</label>
                <select id="sc-layers" value={c.layers} onChange={e => upd({ layers: Number(e.target.value) })} data-testid="select-sc-layers">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div className="live-field"><label htmlFor="sc-target">{t("Target (poin dari rata-rata)", "Target (points from average)")}</label>
                <input id="sc-target" className={num} type="number" min="1" step="any" value={c.target} onChange={e => upd({ target: Number(e.target.value) })} data-testid="input-sc-target" /></div>
              <div className="live-field"><label htmlFor="sc-spacing">{t("Jarak layer (poin)", "Layer spacing (points)")}</label>
                <input id="sc-spacing" className={num} type="number" min="1" step="any" value={c.spacing} onChange={e => upd({ spacing: Number(e.target.value) })} data-testid="input-sc-spacing" /></div>
            </div>
            </details>
            {err && <p role="alert" className="live-error" data-testid="text-scenario-error">{err}</p>}
            <div className="flex gap-2 flex-wrap">
              <Button type="button" className="flex-1 min-h-[44px]" disabled={!quote} onClick={() => calculate(c)} data-testid="button-calculate-scenario">{t("Hitung skenario", "Calculate scenario")}</Button>
              <Button type="button" variant="outline" className="flex-1 min-h-[44px]" disabled={!quote || !c.side} onClick={useDefault} data-testid="button-default-simulation">{t("Simulasi default", "Default simulation")}</Button>
            </div>
            <p className="live-small" data-testid="text-default-disclosure">{t("Default manual: Linear · 3 layer · lot awal 0,1 · target/jarak 30 poin. Bukan saran pasar atau hasil pivot/Fibonacci.", "Manual defaults: Linear · 3 layers · first lot 0.1 · target/spacing 30 points. Not a market suggestion or pivot/Fibonacci-derived.")}</p>
          </div>
        </div>

        <div className={`live-card min-w-0 ${view === "scenario" ? "" : "hidden"} lg:block`} aria-live="polite" data-testid="scenario-result">
          <h2>{t("Hasil skenario", "Scenario result")}</h2>
          {!plan && <p className="live-small mt-2">{t("Pilih arah, lalu hitung. Diagram level harga dan tabel muncul di sini.", "Pick a direction, then calculate. A price-level diagram and table appear here.")}</p>}
          {plan && <div className="live-stack mt-2">
            <p className="live-small"><strong>{t("Skenario manual hipotetis", "Hypothetical manual scenario")}</strong> · {plan.side === "buy" ? "Buy" : "Sell"} · {plan.strategy} · {t("snapshot", "snapshot")} {plan.asOf} · {t("harga masuk", "entry")} {plan.entry.toFixed(2)}</p>
            {changed && <p role="status" className="live-error" data-testid="text-scenario-changed">{t("Arah atau input berubah. Snapshot di bawah adalah skenario lama dan tidak ikut berubah; tekan Hitung skenario lagi.", "Direction or inputs changed. The snapshot below is the old scenario and was not rewritten; press Calculate again.")}</p>}
            {moved !== null && Math.abs(moved) >= 0.01 && <p role="status" className="live-small" data-testid="text-market-moved">{t(`Harga XUL10 sekarang ${quote!.price.toFixed(2)}, bergeser ${moved > 0 ? "+" : ""}${moved.toFixed(2)} dari snapshot. Level tidak diubah otomatis.`, `XUL10 is now ${quote!.price.toFixed(2)}, ${moved > 0 ? "+" : ""}${moved.toFixed(2)} from the snapshot. Levels are not changed automatically.`)}</p>}
            {!quote && <p role="status" className="live-small">{t("Harga saat ini tidak segar; snapshot tetap sebagai skenario lama.", "The current price is not fresh; the snapshot stays as an old scenario.")}</p>}
            {sideChanged ? <p role="status" className="live-error" data-testid="text-side-invalidated">{t("Arah dipilih ulang: hasil sebelumnya tidak berlaku dan disembunyikan. Tekan Hitung skenario.", "Direction re-selected: the earlier result no longer applies and is hidden. Press Calculate.")}</p> : <>
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
            <dl className="text-sm grid grid-cols-2 gap-2">
              <dt>{t("Margin", "Margin")}</dt><dd>{money(plan.margin)} ({plan.marginPercent.toFixed(1)}%)</dd>
              <dt>{t("Rugi stress", "Stress loss")}</dt><dd>{money(plan.stressLoss)} ({plan.stressPercent.toFixed(1)}%)</dd>
              <dt>{t("Profit di TP", "Profit at TP")}</dt><dd>{money(plan.targetProfit)}</dd>
            </dl>
            {(plan.marginPercent > 20 || plan.stressPercent > 10) && <p role="alert" className="live-error" data-testid="scenario-budget-warning">{t("Melewati batas simulasi: margin 20% atau rugi stress 10% modal. Contoh ini tidak lolos saringan MRG.", "Exceeds simulation limits: 20% capital margin or 10% stress loss. This example does not pass MRG filters.")}</p>}
            <p className="live-small">{t("TP mengasumsikan semua layer terisi. Margin bukan batas kerugian; stress bukan kerugian maksimum. Biaya dan spread belum dihitung.", "TP assumes all layers filled. Margin is not a loss limit; stress is not maximum loss. Fees and spread are excluded.")}</p>
            </>}
          </div>}
          <details className="live-details mt-2" data-testid="scenario-limits">
            <summary>{t("Batas dan sumber", "Limits and sources")}</summary>
            <div className="live-small live-stack">
              <p>{t("US$100 per poin per 1 lot, margin US$2.000/lot, lot pertama 0,1. Target diukur dari rata-rata basket; stress satu jarak setelah layer terakhir. Tanpa spread, biaya, SL atau stop-out broker.", "US$100 per point per 1 lot, margin US$2,000/lot, first lot 0.1. Target is measured from the basket average; stress is one spacing beyond the last layer. No spread, fees, SL or broker stop-out.")}</p>
              <p>{t("Harga: XUL10 dari data Newsmaker. Chart: OANDA XAUUSD, sumber berbeda. Pivot/Fibonacci tersedia di panel Pasar sebagai referensi LGD D1; belum memengaruhi parameter. Konten berita tersedia, tetapi metadata dampak editorial belum tersedia.", "Price: XUL10 from Newsmaker data. Chart: OANDA XAUUSD, a different source. Pivot/Fibonacci are available in the Market panel as LGD D1 references; they do not yet influence parameters. News content is available, but editorial impact metadata is not yet available.")}</p>
              <p>{t("Edukasi risiko, bukan sinyal atau order broker.", "Risk education, not a signal or broker order.")}</p>
            </div>
          </details>
        </div>
        </div>
      </div>
    </section>
  );
}
