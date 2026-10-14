import { useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { useMarket } from "@/hooks/use-market";
import { usePortfolio } from "@/lib/portfolio-context";
import { useLanguage } from "@/lib/language-context";
import { evaluatePositionRisk, summarizePositions } from "@shared/position-risk";
import { calendarIsFresh } from "@shared/live-types";
import { LiveShell } from "@/components/live/live-shell";
import { ErrorBox, LoadingBlock, PageIntro, Panel, RiskSummary } from "@/components/live/live-ui";
import { TermHelp } from "@/components/live/term-help";

const fmt = (n: number, digits = 2) => new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
const stamp = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : null;

export default function LiveOverview() {
  const market = useMarket();
  const { portfolio, error: storageError } = usePortfolio();
  const { t, language } = useLanguage();
  const context = market.context.data;
  const quote = market.usableQuote;
  const groups = useMemo(() => (["buy", "sell"] as const).map((side) => {
    const positions = portfolio.positions.filter((p) => p.side === side);
    return { side, positions, summary: summarizePositions(positions), risk: evaluatePositionRisk(positions, portfolio.settings, quote, market.context.isError ? null : context ?? null, market.now) };
  }), [portfolio.positions, portfolio.settings, quote, context, market.now]);
  const analysis = context?.history.analysis;
  const freshQuote = market.live;
  const calendarFresh = !market.context.isError && calendarIsFresh(context?.calendar, market.now);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const nextEvent = context?.calendar.events.filter((event) => event.currency === "USD" && event.at && Date.parse(event.at) >= market.now).sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!))[0];
  return <LiveShell>
    <PageIntro kicker={t("Gambaran pasar · XUL10", "Market view · XUL10")} title={t("Lihat eksposur dengan jernih.", "See exposure clearly.")}>
      {t("Konteks pasar dan catatan posisi manual, tanpa order, klaim keamanan, atau perkiraan hasil uang.", "Market context and manually recorded positions, without orders, safety claims, or monetary outcome estimates.")}
    </PageIntro>
    <div className="live-trust-strip" role="note">{t("LGD Daily D1 adalah referensi harga emas, bukan harga XUL10 yang identik.", "LGD Daily D1 is a gold-price reference, not an identical XUL10 price.")}</div>
    {storageError && <div style={{ marginTop: 16 }}><ErrorBox message={storageError} /></div>}
    <div className="live-grid live-overview-grid">
      <Panel className="live-span-7 overview-quote" title={t("Harga instrumen", "Instrument price")} eyebrow="NEWSMAKER · XUL10" action={<button className="live-icon-btn" onClick={() => void market.refresh()} aria-label={t("Perbarui data", "Refresh data")}><RefreshCw size={15}/></button>}>
        {market.quotes.isLoading && <LoadingBlock label={t("Memuat harga", "Loading price")} />}
        {market.quotes.isError && <ErrorBox message={t("Harga belum dapat dimuat. Coba perbarui data.", "Price could not be loaded. Try refreshing.")} retry={() => void market.refresh()} />}
        {!market.quotes.isLoading && !market.quotes.isError && <>
          <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap" }}><span className={`live-pill ${freshQuote ? "" : "warning"}`}><span aria-hidden="true">●</span>{freshQuote ? t("Terbaru", "Fresh") : t("Tidak tersedia / terlambat", "Unavailable / stale")}</span><span className="live-small">XUL10 · {market.quotes.data?.quote?.source ?? t("Sumber tidak tersedia", "Source unavailable")}</span></div>
          <div className="live-price">{market.quotes.data?.quote ? fmt(market.quotes.data.quote.price, 3) : "—"}</div>
          <div className="live-row live-small"><span>{t("Timestamp harga", "Price timestamp")}</span><strong>{stamp(market.quotes.data?.quote?.asOf) ?? t("Tidak tersedia", "Unavailable")}</strong></div>
          <div className="live-small" style={{ marginTop: 10 }}>{t("Harga dengan usia lebih dari 20 detik tidak digunakan untuk indeks. Harga penerimaan server bukan waktu harga diterbitkan.", "Prices older than 20 seconds are not used for the index. Server receipt time is not the price publication time.")}</div>
          {market.quotes.data?.message && <div className="live-alert" style={{ marginTop: 10 }}>{t(market.quotes.data.message.id, market.quotes.data.message.en)}</div>}
        </>}
      </Panel>
      <details className="live-disclosure live-span-12"><summary>{t("Konteks historis D1", "Historical D1 context")}</summary>
      <Panel className="live-span-12" title={t("Konteks harian", "Daily context")} eyebrow={t("Referensi emas", "Gold reference")}>
        {market.context.isLoading ? <LoadingBlock label={t("Memuat konteks", "Loading context")} /> : analysis ? <>
          <div className="live-row"><span className="live-pill">{analysis.source} · {analysis.timeframe}</span><span className="live-small">{analysis.lastDate}</span></div>
          <div className="live-form-grid" style={{ marginTop: 16 }}>
            <div className="live-metric"><span className="live-inline-help"><span className="live-small">{t("Tren MA20 / MA50", "MA20 / MA50 trend")}</span><TermHelp term="ma"/></span><strong style={{ fontSize: 17 }}>{analysis.trend === "up" ? t("Naik", "Up") : analysis.trend === "down" ? t("Turun", "Down") : t("Campuran", "Mixed")}</strong></div>
            <div className="live-metric"><span className="live-inline-help"><span className="live-small">ATR14 D1</span><TermHelp term="atr"/></span><strong>{fmt(analysis.atr14, 3)}</strong></div>
            <div className="live-metric"><span className="live-inline-help"><span className="live-small">{t("Dukungan 20 hari", "20-day support")}</span><TermHelp term="support"/></span><strong>{fmt(analysis.support20, 2)}</strong></div>
            <div className="live-metric"><span className="live-inline-help"><span className="live-small">{t("Resistansi 20 hari", "20-day resistance")}</span><TermHelp term="resistance"/></span><strong>{fmt(analysis.resistance20, 2)}</strong></div>
          </div>
          <p className="live-small" style={{ marginTop: 10 }}>{t("Indikator historis; bukan prediksi.", "Historical indicators; not a prediction.")}</p>
        </> : <div className="live-alert">{t("Referensi harian belum tersedia.", "Daily reference is unavailable.")}</div>}
        {market.context.isError && <div style={{ marginTop: 12 }}><ErrorBox message={t("Konteks pasar gagal dimuat.", "Market context failed to load.")} retry={() => void market.refresh()} /></div>}
      </Panel>
      </details>
      <Panel className="live-span-12 overview-exposure" title={t("Catatan eksposur posisi", "Recorded position exposure")} eyebrow={t("Dicatat manual · tersimpan di perangkat ini", "Manually recorded · stored on this device")} action={<Link className="live-button primary" href="/positions">{t("Kelola posisi", "Manage positions")}<ChevronRight size={15}/></Link>}>
        {portfolio.positions.length === 0 ? <div className="live-alert">{t("Belum ada posisi tercatat. Indeks eksposur tidak tersedia sampai Anda mencatat posisi dan mengisi batas lot serta layer pilihan.", "No positions recorded. The exposure index remains unavailable until you record a position and enter your chosen lot and layer limits.")}</div> :
          <div className="live-grid" style={{ margin: 0 }}>{groups.filter((g) => g.positions.length > 0).map(({ side, positions, summary, risk }) => <div className="live-card live-span-6" key={side}>
            <div className="live-row"><h3>{side === "buy" ? t("Rangkaian buy", "Buy series") : t("Rangkaian sell", "Sell series")}</h3><span className="live-pill">{positions.length} {t("layer", "layers")}</span></div>
            <div className="live-grid" style={{ margin: "14px 0", gap: 8 }}>
              <div className="live-metric live-span-4"><span className="live-small">{t("Total lot", "Total lots")}</span><strong>{fmt(summary.totalLots, 4)}</strong></div>
              <div className="live-metric live-span-4"><span className="live-small">{t("Rata-rata berbobot", "Weighted average")}</span><strong>{summary.averageEntry === null ? "—" : fmt(summary.averageEntry, 3)}</strong></div>
              <div className="live-metric live-span-4"><span className="live-small">{t("Skor indeks", "Index score")}</span><strong>{risk.score ?? "—"}</strong></div>
            </div>
            <RiskSummary risk={risk}/>
          </div>)}</div>}
        {portfolio.positions.length > 0 && <p className="live-small" style={{ marginTop: 12 }}>{t("Buy dan sell dinilai terpisah; tidak digabung atau saling dinetokan. Rata-rata bukan titik impas bersih.", "Buy and sell are assessed separately; they are not combined or netted. Average entry is not a net break-even price.")}</p>}
      </Panel>
      <Panel className="live-span-5 overview-agenda" title={t("Agenda USD terdekat", "Upcoming USD calendar")} eyebrow={`${userTimezone} · ${t("waktu lokal", "user timezone")}`}>
        {!market.context.isLoading && !calendarFresh && <div className="live-alert">{t("Kalender tidak tersedia atau sudah kedaluwarsa; konteks fundamental live ditunda.", "Calendar is unavailable or stale; live fundamental context is paused.")}</div>}
        {market.context.isLoading ? <LoadingBlock label={t("Memuat agenda", "Loading calendar")} /> : context?.calendar.status === "ready" ? nextEvent ? <div className="live-stack">
          <div className="live-pill">{nextEvent.currency} · {nextEvent.impact === "unknown" ? t("Dampak belum diketahui", "Impact unknown") : t(nextEvent.impact === "high" ? "Tinggi" : nextEvent.impact === "medium" ? "Sedang" : "Rendah", nextEvent.impact)}</div>
          <h3>{nextEvent.name}</h3><p className="live-small">{nextEvent.at ? stamp(nextEvent.at) : nextEvent.date ?? nextEvent.time}</p>
          <Link className="live-link" href="/analysis?tab=calendar">{t("Lihat kalender lengkap", "View full calendar")} <ChevronRight size={14}/></Link>
        </div> : <p className="live-small">{t("Belum ada rilis mendatang yang terjadwal pada data ini.", "No upcoming releases are scheduled in this data.")}</p> : <div className="live-alert">{context?.calendar.message?.[language] ?? t("Kalender belum tersedia atau belum lengkap.", "Calendar is unavailable or incomplete.")}</div>}
        {context?.calendar.generatedAt && <p className="live-small" style={{ marginTop: 12 }}>{t("Timestamp cache sumber", "Source cache timestamp")}: {stamp(context.calendar.generatedAt)} · {t("batas kesegaran 15 menit", "15-minute freshness window")}</p>}
      </Panel>
      <details className="live-disclosure live-span-12"><summary>{t("Konteks tambahan · berita & metode", "More context · news & method")}</summary>
      <Panel className="live-span-12" title={t("Bacaan Newsmaker", "Newsmaker reading")} eyebrow={t("Berita sebagai konteks, bukan sinyal", "News as context, not a signal")} action={<a className="live-link" href="https://www.newsmaker.id" target="_blank" rel="noreferrer">{t("Situs sumber", "Source site")} <ExternalLink size={13}/></a>}>
        {market.context.isLoading ? <LoadingBlock label={t("Memuat berita", "Loading news")} /> : context?.news.status === "ready" && context.news.items.length ? <div className="live-list">{context.news.items.slice(0, 3).map((item) => <Link key={item.slug} href={`/analysis?article=${encodeURIComponent(item.slug)}`} className="live-position" style={{ textDecoration: "none", color: "inherit" }}><div><div className="live-kicker">{item.category} · {item.source}</div><strong>{language === "id" ? item.title : item.titleEn}</strong><div className="live-small">{stamp(item.publishedAt)}</div></div><ChevronRight size={17}/></Link>)}</div> : <p className="live-small">{t("Berita tidak tersedia saat ini.", "News is unavailable right now.")}</p>}
        <div style={{ marginTop: 12 }}><Link className="live-link" href="/analysis?tab=news">{t("Buka semua berita", "Open all news")} <ChevronRight size={14}/></Link></div>
      </Panel>
      <Panel className="live-span-12" title={t("Catatan metode", "Method notes")} eyebrow={t("Baca sebelum menafsirkan", "Before interpreting")}>
        <div className="live-grid" style={{ margin: 0 }}>
          <div className="live-span-4 live-small"><strong>{t("40 poin · lot", "40 points · lots")}</strong><br/>{t("Kapasitas lot dibanding batas yang Anda tetapkan.", "Lot capacity against your chosen limit.")}</div>
          <div className="live-span-4 live-small"><strong>{t("20 poin · layer", "20 points · layers")}</strong><br/>{t("Jumlah layer dibanding batas yang Anda tetapkan.", "Layer count against your chosen limit.")}</div>
          <div className="live-span-4 live-small"><strong>{t("15 + 15 + 10 poin", "15 + 15 + 10 points")}</strong><br/>{t("Tekanan terhadap ATR14 referensi, volatilitas harian, dan kalender USD.", "Adverse distance versus reference ATR14, daily volatility, and USD calendar.")}</div>
        </div>
        <p className="live-small" style={{ marginTop: 14 }}>{t("Pembobotan heuristik awal, belum dikalibrasi. Indeks relatif bukan rekomendasi, bukan kemungkinan rugi, dan batas lebih besar tidak membuat posisi aman.", "Initial heuristic weights, not calibrated. The relative index is not advice or loss probability, and larger limits do not make positions safe.")}</p>
      </Panel>
      </details>
    </div>
  </LiveShell>;
}
