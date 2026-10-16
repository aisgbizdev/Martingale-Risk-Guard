import { useState } from "react";
import { newsmakerLevels } from "@shared/newsmaker-levels";
import { getStudyReference } from "@shared/study-market";
import type { MarketHook } from "@/hooks/use-market";
import { useLanguage } from "@/lib/language-context";

export function NewsmakerReferenceLevels({ market }: { market: MarketHook }) {
  const { t } = useLanguage();
  const [view, setView] = useState<"pivot" | "up" | "down">("pivot");
  const [showAll, setShowAll] = useState(false);
  const a = getStudyReference(market.context.isError ? null : market.context.data, market.now, market.online).analysis;
  let levels: ReturnType<typeof newsmakerLevels> | null = null;
  if (a && a.lastOpen !== undefined && a.lastHigh !== undefined && a.lastLow !== undefined) {
    try { levels = newsmakerLevels({ open: a.lastOpen, high: a.lastHigh, low: a.lastLow, close: a.lastClose }); } catch { /* Display unavailable, never invented zeroes. */ }
  }
  const price = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <section className="mt-4 border-t border-border pt-3" data-testid="newsmaker-reference-levels">
    <h3 className="font-semibold">{t("Pivot & Fibonacci · Newsmaker", "Pivot & Fibonacci · Newsmaker")}</h3>
    <p className="live-small mt-1">{t("Dihitung dari OHLC API, dengan rumus kalkulator Newsmaker. Referensi LGD Daily, bukan level XUL10 identik atau sinyal.", "Computed from API OHLC using Newsmaker calculator formulas. LGD Daily reference, not identical XUL10 levels or signals.")}</p>
    {!levels || !a ? <p role="status" className="live-small mt-2">{t("OHLC D1 tertutup belum tersedia/segar. Level tidak dibuat-buat.", "Fresh closed D1 OHLC is unavailable. No substitute levels.")}</p> : <>
      <p className="live-small mt-2">LGD Daily · {a.lastDate} · O {price(a.lastOpen!)} · H {price(a.lastHigh!)} · L {price(a.lastLow!)} · C {price(a.lastClose)}</p>
      <div className="flex gap-2 flex-wrap my-3" role="group" aria-label={t("Jenis acuan teknikal", "Technical reference type")}>
        {(["pivot", "up", "down"] as const).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md border px-3 py-2 text-xs min-h-[44px] ${view === v ? "bg-primary text-primary-foreground" : "bg-background"}`}>{v === "pivot" ? "Pivot" : v === "up" ? t("Fibo naik", "Fibo up") : t("Fibo turun", "Fibo down")}</button>)}
      </div>
      {view === "pivot" ? <div className="overflow-x-auto"><table className="w-full text-xs" data-testid="table-reference-pivots">
        <caption className="sr-only">{t("Level pivot referensi LGD Daily", "LGD Daily reference pivot levels")}</caption>
        <thead><tr><th className="text-left">Level</th><th>{t("Klasik", "Classic")}</th><th>Woodie</th><th>Camarilla</th></tr></thead>
        <tbody>{(["r4", "r3", "r2", "r1", "p", "s1", "s2", "s3", "s4"] as const).filter(key => showAll || ["r1", "p", "s1"].includes(key)).map(key => <tr key={key} className="border-t border-border"><th className="text-left py-2">{key === "p" ? "Pivot" : key.toUpperCase()}</th>{(["classic", "woodie", "camarilla"] as const).map(method => <td key={method} className="text-right py-2 font-mono">{price(levels![method][key])}</td>)}</tr>)}</tbody>
      </table></div> : <div className="grid grid-cols-2 gap-3">{(["retracement", "projection"] as const).map(kind => <table key={kind} className="w-full text-xs" data-testid={`table-reference-${kind}`}>
        <caption className="text-left font-semibold pb-2">{kind === "retracement" ? "Retracement" : t("Proyeksi", "Projection")}</caption>
        <tbody>{levels![view][kind].map(l => <tr key={l.ratio} className="border-t border-border"><th className="text-left py-2">{(l.ratio * 100).toFixed(1)}%</th><td className="text-right py-2 font-mono">{price(l.price)}</td></tr>)}</tbody>
      </table>)}</div>}
      {view === "pivot" && <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="text-xs underline min-h-[44px]">{showAll ? t("Ringkas level", "Fewer levels") : t("Semua level R4–S4", "All levels R4–S4")}</button>}
      <p className="live-small mt-2">{t("Acuan high/low otomatis memakai candle D1 tertutup terakhir, bukan swing pilihan pengguna. Level belum mengubah target/jarak skenario.", "Automatic high/low anchors use the last closed D1 candle, not a user-selected swing. Levels do not yet change scenario target/spacing.")}</p>
      <a className="live-small underline inline-block mt-2" href="https://www.newsmaker.id/id/tools/pivot-fibonacci" target="_blank" rel="noopener noreferrer">{t("Kalkulator sumber Newsmaker", "Newsmaker source calculator")}</a>
    </>}
  </section>;
}
