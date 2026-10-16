import { useState } from "react";
import { Link } from "wouter";
import { suggestFromCapital, type CapitalSuggestion as Suggestion } from "@shared/capital-suggestion";
import type { MarketHook } from "@/hooks/use-market";
import { quoteIsFresh } from "@shared/live-types";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";

export function CapitalSuggestion({ capital, market }: { capital: string; market: MarketHook }) {
  const { t, language } = useLanguage();
  const [snapshot, setSnapshot] = useState<Suggestion | null>(null);
  const [applied, setApplied] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [sourceKey, setSourceKey] = useState("");
  const liveKey = JSON.stringify([
    market.usableQuote, market.context.isError, market.context.data, market.online,
  ]);
  const dataChanged = !!snapshot && (sourceKey !== liveKey || !market.online ||
    (snapshot.quote !== null && !quoteIsFresh(snapshot.quote, market.now)));
  const stale = snapshot && Number(capital) !== snapshot.capital;
  const money = (n: number) => n.toLocaleString(language === "id" ? "id-ID" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const evaluate = () => {
    const value = Number(capital);
    if (!capital.trim() || !Number.isFinite(value) || value <= 0 || value > 1e12) { setInputError(true); return; }
    setInputError(false);
    setApplied(false);
    setSourceKey(liveKey);
    // Detached from query caches: polling must never rewrite a displayed offer.
    setSnapshot(structuredClone(suggestFromCapital(
      value, market.context.isError ? null : market.context.data, market.usableQuote, Date.now(), market.online,
    )));
  };
  const selected = snapshot?.selected;
  return <section className="live-stack" aria-label={t("Saran dari modal", "Capital-based suggestion")} data-testid="capital-suggestion">
    <p className="live-small">{t("Cukup isi modal. MRG memeriksa harga, D1, kalender dan penilaian isi berita. Asumsi Pemula—bukan pengalaman Anda yang diketahui.", "Enter capital only. MRG checks price, D1, calendar and reviewed news content. Assumes Beginner—not knowledge of your experience.")}</p>
    <Button type="button" className="w-full h-12" onClick={evaluate} data-testid="button-saran-modal">{t("Lihat Saran MRG", "View MRG Suggestion")}</Button>
    {inputError && <p role="alert" className="live-error">{t("Isi modal positif, maksimal US$1 triliun.", "Enter positive capital, up to US$1 trillion.")}</p>}
    {snapshot && <div className="rounded-lg border border-border p-3 live-stack" aria-live="polite" data-testid="suggestion-result">
      <h2 className="font-bold">{stale ? t("Modal berubah—hitung ulang saran", "Capital changed—recalculate") :
        snapshot.status === "offered" ? (applied ? t("Skenario MRG yang dipakai", "Applied MRG scenario") : t("Usulan skenario MRG", "Proposed MRG scenario")) :
        snapshot.status === "deferred" ? t("Saran MRG ditunda", "MRG suggestion deferred") :
        snapshot.status === "no-fit" ? t("Tidak ada kandidat yang lolos", "No candidate passes") :
        t("Saran MRG belum lengkap", "MRG suggestion incomplete")}</h2>
      <p className="live-small">{t("Snapshot evaluasi", "Evaluation snapshot")}: {snapshot.evaluatedAt} · {money(snapshot.capital)}</p>
      {stale && <p role="status" className="live-error">{t("Hasil sebelumnya tidak berlaku untuk modal ini. Tekan Lihat Saran MRG.", "The previous result does not apply to this capital. Press View MRG Suggestion.")}</p>}
      {dataChanged && !stale && <p role="status" className="live-small" data-testid="suggestion-data-changed">{t("Data berubah atau tidak lagi segar. Snapshot tidak diganti; tekan Lihat Saran MRG untuk meninjau penyesuaian baru.", "Data changed or is no longer fresh. The snapshot is unchanged; press View MRG Suggestion to review a new adjustment.")}</p>}
      {!stale && <>
        {selected && <div data-testid="suggested-scenario">
          <strong>{selected.strategy} · {selected.layers} {t("layer", "layers")}</strong>
          <p>{t("Target pemulihan dari rata-rata basket", "Recovery target from basket average")}: {snapshot.target} {t("poin", "points")} · {t("Jarak layer", "Layer spacing")}: {snapshot.spacing}</p>
          <p>{t("Lot per layer", "Lots per layer")}: {selected.lots.join(" → ")} · {t("Total", "Total")}: {selected.totalLots}</p>
          <dl className="text-sm grid grid-cols-2 gap-2 mt-2">
            <dt>{t("Margin (jaminan)", "Margin (collateral)")}</dt><dd>{money(selected.margin)} ({selected.marginPercent.toFixed(1)}%)</dd>
            <dt>{t("Rugi stress", "Stress loss")}</dt><dd>{money(selected.stressLoss)} ({selected.stressPercent.toFixed(1)}%)</dd>
            <dt>{t("Ekuitas stress", "Stress equity")}</dt><dd>{money(selected.stressEquity)}</dd>
            <dt>{t("Dana setelah margin", "Funds after margin")}</dt><dd>{money(selected.fundsAfterMargin)}</dd>
          </dl>
          <p className="live-small mt-2">{t("Stress: satu jarak lagi setelah layer terakhir, gerakan hipotetis melawan basket. Bukan rugi maksimum atau prediksi arah.", "Stress: one more spacing beyond the last layer, hypothetically against the basket. Not maximum loss or a direction forecast.")}</p>
          {!applied && <Button type="button" variant="outline" className="mt-2" disabled={dataChanged} onClick={() => setApplied(true)} data-testid="button-use-suggestion">{t("Gunakan skenario ini", "Use this scenario")}</Button>}
          {applied && <p className="live-small mt-2">{t("Dipakai untuk simulasi ini saja. Input manual tidak diganti; tidak ada transaksi broker.", "Applied to this simulation only. Manual inputs are unchanged; no broker order.")}</p>}
        </div>}
        <ul className="mrg-summary-notes">{snapshot.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
        {!!snapshot.candidates.length && <details><summary>{t("Perbandingan kandidat dan aritmetika", "Candidate comparison and arithmetic")}</summary>
          <div className="overflow-x-auto"><table className="text-xs w-full">
            <thead><tr><th>{t("Kandidat", "Candidate")}</th><th>{t("Margin", "Margin")}</th><th>{t("Rugi stress", "Stress loss")}</th><th>{t("Saringan", "Filter")}</th></tr></thead>
            <tbody>{snapshot.candidates.map(c => <tr key={`${c.strategy}-${c.layers}`}><td>{c.strategy} · {c.layers}</td><td>{money(c.margin)}</td><td>{money(c.stressLoss)}</td><td>{c.passes ? t("Lolos", "Pass") : t("Tidak lolos", "Fail")}</td></tr>)}</tbody>
          </table></div>
          <p className="live-small">Σ(lot × {snapshot.spacing} × ({t("jumlah layer", "layer count")} − {t("indeks layer dari 0", "layer index from 0")}) × US$100</p>
        </details>}
      </>}
      <details><summary>{t("Sumber snapshot & batas simulasi", "Snapshot sources & simulation limits")}</summary>
        <div className="live-small live-stack mt-2">
          <p>{snapshot.quote ? `${snapshot.quote.source} · XUL10 ${snapshot.quote.price} · ${snapshot.quote.asOf}` : t("Harga tidak tersedia", "Price unavailable")}</p>
          <p>{snapshot.reference.analysis ? `LGD Daily D1 · ${snapshot.reference.analysis.lastDate} · ATR14 ${snapshot.reference.analysis.atr14}` : t("D1 belum tersedia", "D1 unavailable")}</p>
          <p>{t("Kalender Newsmaker dibuat", "Newsmaker calendar generated")}: {snapshot.calendar?.generatedAt ?? "—"}</p>
          <p>{snapshot.fundamental?.scope ?? t("Fundamental belum dinilai; bukan netral.", "Fundamentals unassessed; not neutral.")}</p>
          {snapshot.fundamental?.evidence.map(e => <div key={e.slug}>
            <Link href={`/analysis?article=${encodeURIComponent(e.slug)}`} className="underline">{e.title}</Link>
            <p>{e.source} · {e.category} · {e.publishedAt} · {t("Ditinjau", "Reviewed")}: {e.reviewedAt}</p>
            <blockquote>“{e.excerpt}”</blockquote><p>{e.tag} · {e.rationale}</p>
            <p className="break-all">{e.url}</p>
          </div>)}
          <p>{t("Asumsi simulasi: 1 poin = harga 1,00; US$100/poin/lot; margin US$2.000/lot. Bukan spesifikasi broker. Margin bukan biaya atau batas rugi.", "Simulation assumptions: 1 point = price 1.00; US$100/point/lot; margin US$2,000/lot. Not broker specifications. Margin is not a cost or loss limit.")}</p>
          <p>{t("Simulasi asumsi, bukan skor studi PF/ROM/ER atau label aman. Spread, komisi, swap, slippage dan stop-out belum dihitung. Gerakan lebih jauh bisa memperbesar rugi.", "Assumption simulation, not study PF/ROM/ER or a safety rating. Spread, commission, swap, slippage and stop-out are excluded. Further moves can increase losses.")}</p>
        </div>
      </details>
      <p className="live-small">{t("Lolos saringan bukan berarti aman. Ini simulasi asumsi, tanpa skor studi, biaya transaksi atau stop-out broker. Isi Manual tetap tersedia.", "Passing filters does not mean safe. This is an assumption simulation without study scores, transaction costs or broker stop-out. Manual Entry remains available.")}</p>
    </div>}
  </section>;
}
