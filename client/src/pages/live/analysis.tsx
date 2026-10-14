import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ExternalLink, LineChart, RefreshCw, X } from "lucide-react";
import { useMarket, useArticle } from "@/hooks/use-market";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { ErrorBox, Field, LoadingBlock, PageIntro, Panel } from "@/components/live/live-ui";
import type { CalendarEvent } from "@shared/live-types";
import { calendarIsFresh } from "@shared/live-types";

const dateTime = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return null; }
};
function EventTime({ event, timezone, now, t }: { event: CalendarEvent; timezone: string; now: number; t: (id: string, en: string) => string }) {
  const displayTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (event.at && Number.isFinite(Date.parse(event.at))) {
    const date = new Date(event.at);
    const relative = date.getTime() < now ? t("Sebelumnya", "Previous") : t("Mendatang", "Upcoming");
    let day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
    let clock = t("Waktu tidak tersedia", "Time unavailable");
    try {
      day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: displayTimezone }).format(date);
      clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: displayTimezone }).format(date);
    } catch { /* Keep browser date and an explicit unavailable clock. */ }
    return <><strong>{day}</strong><div className="live-small">{clock} · {relative}</div></>;
  }
  const allDay = /all\s*day|sepanjang\s*hari/i.test(event.time);
  const validDate = event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && Number.isFinite(Date.parse(`${event.date}T12:00:00`));
  const day = validDate ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${event.date}T12:00:00`)) : t("Tanggal tidak tersedia", "Date unavailable");
  return <><strong>{day}</strong><div className="live-small">{allDay ? t("Sepanjang hari · waktu rilis tidak diketahui", "All day · release time unknown") : event.time || t("Waktu tidak tersedia", "Time unavailable")}</div></>;
}

export default function AnalysisPage() {
  const market = useMarket();
  const { t, language } = useLanguage();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [articleSlug, setArticleSlug] = useState<string | null>(() => new URLSearchParams(window.location.search).get("article"));
  const article = useArticle(articleSlug);
  const [currency, setCurrency] = useState("ALL");
  const [impact, setImpact] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [chartAttempt, setChartAttempt] = useState(0);
  const [chartState, setChartState] = useState<"loading" | "loaded" | "failed">("loading");
  const context = market.context.data;
  const analysis = context?.history.analysis;
  const events = context?.calendar.events ?? [];
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarFresh = !market.context.isError && calendarIsFresh(context?.calendar, market.now);
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (currency !== "ALL" && event.currency !== currency) return false;
    if (impact !== "ALL" && event.impact !== impact) return false;
    const localDate = event.at ? new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(event.at)) : event.date;
    if ((from || to) && !localDate) return false;
    if (from && localDate! < from) return false;
    if (to && localDate! > to) return false;
    return true;
  }), [events, currency, impact, from, to, userTimezone]);
  useEffect(() => {
    setArticleSlug(new URLSearchParams(window.location.search).get("article"));
  }, [location, search]);
  useEffect(() => {
    if (!chartOpen) return;
    setChartState("loading");
    const timeout = window.setTimeout(() => setChartState((state) => state === "loaded" ? state : "failed"), 14000);
    return () => window.clearTimeout(timeout);
  }, [chartOpen, chartAttempt]);
  const chartUrl = `https://www.tradingview.com/widgetembed/?frameElementId=mrg-tv&symbol=OANDA%3AXAUUSD&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=%23f5f1e7&studies=%5B%5D&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&locale=${language === "id" ? "id" : "en"}`;
  return <LiveShell>
    <PageIntro kicker={t("Detail analisis · referensi", "Analysis detail · references")} title={t("Konteks, bukan sinyal.", "Context, not signals.")}>
      {t("Indikator harian, kalender, chart eksternal opsional, dan bacaan Newsmaker dengan sumber yang terlihat.", "Daily indicators, calendar, optional external chart, and Newsmaker reading with visible sources.")}
    </PageIntro>
    {market.context.isError && <div style={{ marginTop: 16 }}><ErrorBox message={t("Sebagian atau seluruh konteks gagal dimuat. Angka yang tidak tersedia tidak digantikan.", "Some or all context failed to load. Unavailable values are not substituted.")} retry={() => void market.refresh()} /></div>}
    <div className="live-grid">
      <Panel className="live-span-7" title={t("Referensi teknikal D1", "D1 technical reference")} eyebrow={t("LGD Daily · basis harga emas", "LGD Daily · gold-price basis")} action={<span className="live-pill">D1</span>}>
        {market.context.isLoading ? <LoadingBlock label={t("Memuat analisis", "Loading analysis")} /> : analysis ? <>
          <div className="live-alert">{t("LGD Daily adalah referensi emas dan tidak identik dengan harga kontrak XUL10. Indikator ini konteks historis, bukan prediksi.", "LGD Daily is a gold reference and is not identical to XUL10 contract prices. These historical indicators are context, not predictions.")}</div>
          <div className="live-grid" style={{ margin: "14px 0 0" }}>
            <div className="live-metric live-span-6"><span className="live-small">{t("Tren · MA20 / MA50", "Trend · MA20 / MA50")}</span><strong style={{ fontSize: 18 }}>{analysis.trend === "up" ? t("Naik", "Up") : analysis.trend === "down" ? t("Turun", "Down") : t("Campuran", "Mixed")}</strong><div className="live-small">{analysis.ma20.toLocaleString()} / {analysis.ma50.toLocaleString()}</div></div>
            <div className="live-metric live-span-6"><span className="live-small">{t("Volatilitas · ATR14", "Volatility · ATR14")}</span><strong>{analysis.atr14.toLocaleString()}</strong><div className="live-small">{analysis.atrPercent.toFixed(2)}% · {t("median dasar", "baseline median")} {analysis.atrBaseline.toLocaleString()}</div></div>
            <div className="live-metric live-span-6"><span className="live-small">{t("Rentang 20 hari", "20-day range")}</span><strong style={{ fontSize: 16 }}>{analysis.support20.toLocaleString()} — {analysis.resistance20.toLocaleString()}</strong></div>
            <div className="live-metric live-span-6"><span className="live-small">{t("Candle / rentang", "Candles / date range")}</span><strong style={{ fontSize: 15 }}>{analysis.candleCount}</strong><div className="live-small">{analysis.firstDate} — {analysis.lastDate}</div></div>
          </div>
          <div className="live-small" style={{ marginTop: 12 }}>{t("Penutupan referensi terakhir", "Last reference close")}: {analysis.lastClose.toLocaleString()} · {t("diterima", "received")}: {dateTime(context?.history.receivedAt ?? null)}</div>
        </> : <div className="live-alert">{context?.history.message?.[language] ?? t("Analisis harian belum tersedia.", "Daily analysis is unavailable.")}</div>}
      </Panel>
      <Panel className="live-span-5" title={t("Chart visual", "Visual chart")} eyebrow="TRADINGVIEW · OANDA:XAUUSD">
        <div className="live-alert">{t("Widget hanya visual. OANDA:XAUUSD adalah referensi berbeda dari XUL10 dan tidak digunakan untuk indeks atau simulasi. Widget dimuat hanya setelah Anda membukanya; permintaan akan dikirim ke TradingView.", "Visual widget only. OANDA:XAUUSD is a different reference from XUL10 and is not used for the index or simulation. It loads only when opened; a request is sent to TradingView.")}</div>
        {!chartOpen ? <button className="live-button primary" style={{ marginTop: 14 }} onClick={() => setChartOpen(true)}><LineChart size={16}/>{t("Buka chart", "Open chart")}</button> : <>
          <div className="live-row" style={{ marginTop: 12 }}><span className="live-small">{chartState === "loaded" ? t("Widget dimuat", "Widget loaded") : chartState === "failed" ? t("Widget gagal dimuat", "Widget failed to load") : t("Memuat chart…", "Loading chart…")}</span><button className="live-icon-btn" onClick={() => setChartOpen(false)} aria-label={t("Tutup chart", "Close chart")}><X size={15}/></button></div>
          {chartState === "failed" ? <div style={{ marginTop: 12 }}><ErrorBox message={t("TradingView tidak merespons. Chart tidak memengaruhi data lain.", "TradingView did not respond. The chart does not affect other data.")} retry={() => { setChartState("loading"); setChartAttempt((attempt) => attempt + 1); }} /></div> :
            <iframe key={chartAttempt} className="live-chart-frame" title={t("Chart referensi emas OANDA XAUUSD dari TradingView", "OANDA XAUUSD gold-reference chart from TradingView")} src={chartUrl} onLoad={() => setChartState("loaded")} loading="lazy" referrerPolicy="no-referrer" />}
          <div className="live-small">{t("Sumber chart", "Chart source")}: <a className="live-link" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView <ExternalLink size={12}/></a></div>
        </>}
      </Panel>
      <Panel className="live-span-12" title={t("Agenda ekonomi", "Economic calendar")} eyebrow={`${userTimezone} · ${calendarFresh ? t("data lengkap dan baru", "complete and fresh") : t("belum lengkap / kedaluwarsa", "incomplete / stale")}`} action={<button className="live-icon-btn" onClick={() => void market.refresh()} aria-label={t("Perbarui data", "Refresh data")}><RefreshCw size={15}/></button>}>
        {!market.context.isLoading && !calendarFresh && <div className="live-alert">{t("Data kalender tidak tersedia atau kedaluwarsa. Jadwal lama hanya referensi; komponen indeks agenda tidak digunakan.", "Calendar is unavailable or stale. Any old schedule is reference only; the event index component is not used.")}</div>}
        <p className="live-small">{t("Kalender mencakup halaman server untuk pekan ini dan berikutnya. Waktu ditampilkan dalam zona waktu pengguna bila tersedia. Refresh kesegaran maksimal 15 menit; kegagalan bukan berarti tidak ada agenda.", "Calendar includes server-paginated this-week and next-week data. Times use the user's timezone where available. Maximum freshness is 15 minutes; a failure does not mean there are no events.")}</p>
        <div className="live-form-grid" style={{ marginTop: 14 }}>
          <div className="live-field"><label htmlFor="calendar-currency">{t("Mata uang", "Currency")}</label><select id="calendar-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="ALL">{t("Semua mata uang", "All currencies")}</option>{Array.from(new Set(events.map((e) => e.currency))).filter(Boolean).sort().map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="live-field"><label htmlFor="calendar-impact">{t("Dampak", "Impact")}</label><select id="calendar-impact" value={impact} onChange={(e) => setImpact(e.target.value)}><option value="ALL">{t("Semua dampak", "All impacts")}</option>{["high", "medium", "low", "unknown"].map((value) => <option key={value} value={value}>{value === "unknown" ? t("Tidak diketahui", "Unknown") : t(value === "high" ? "Tinggi" : value === "medium" ? "Sedang" : "Rendah", value)}</option>)}</select></div>
          <Field label={t("Dari tanggal", "From date")} type="date" value={from} onChange={setFrom} />
          <Field label={t("Sampai tanggal", "Through date")} type="date" value={to} onChange={setTo} />
        </div>
        {market.context.isLoading ? <div style={{ marginTop: 16 }}><LoadingBlock label={t("Memuat kalender", "Loading calendar")} /></div> :
          context?.calendar.status !== "ready" ? <div style={{ marginTop: 14 }}><ErrorBox message={context?.calendar.message?.[language] ?? t("Kalender tidak tersedia.", "Calendar unavailable.")} retry={() => void market.refresh()} /></div> :
          filteredEvents.length ? <div className="live-stack" style={{ marginTop: 16 }}>{filteredEvents.map((event) => <div className="live-event" key={event.id}><EventTime event={event} timezone={context.calendar.timezone} now={market.now} t={t}/><div><strong>{event.name}</strong><div className="live-small">{event.currency} · {event.impact === "unknown" ? t("Dampak tidak diketahui", "Impact unknown") : t(event.impact === "high" ? "Dampak tinggi" : event.impact === "medium" ? "Dampak sedang" : "Dampak rendah", `${event.impact} impact`)}</div>{event.explanation && <div className="live-small">{event.explanation}</div>}{event.source && <div className="live-small">{t("Sumber", "Source")}: {event.source}</div>}</div><div className="live-small" style={{ textAlign: "right" }}>{event.previous && <div>{t("Sebelumnya", "Previous")}: {event.previous}</div>}{event.forecast && <div>{t("Perkiraan", "Forecast")}: {event.forecast}</div>}{event.actual && <div>{t("Aktual", "Actual")}: {event.actual}</div>}</div></div>)}</div> : <div className="live-alert" style={{ marginTop: 14 }}>{t("Tidak ada agenda yang cocok dengan filter. Ini bukan pernyataan bahwa tidak ada rilis lain di luar dataset.", "No events match these filters. This does not assert that no other releases exist outside the dataset.")}</div>}
        {context?.calendar.receivedAt && <div className="live-small" style={{ marginTop: 12 }}>{t("Data diterima", "Received")}: {dateTime(context.calendar.receivedAt)} · {t("calendar freshness 15 menit", "15-minute calendar freshness")}</div>}
      </Panel>
      <Panel className="live-span-12" title={t("Berita Newsmaker", "Newsmaker news")} eyebrow={t("Bacaan editorial · bukan sinyal arah", "Editorial reading · not a directional signal")}>
        {articleSlug && <div style={{ marginBottom: 16 }}>
          <button className="live-button" onClick={() => { setArticleSlug(null); setLocation("/analysis"); }}><ArrowLeft size={15}/>{t("Kembali ke daftar", "Back to list")}</button>
          {article.isLoading ? <div style={{ marginTop: 14 }}><LoadingBlock label={t("Memuat artikel", "Loading article")} /></div> : article.isError ? <div style={{ marginTop: 14 }}><ErrorBox message={t("Artikel tidak dapat dimuat.", "Article could not be loaded.")} retry={() => void article.refetch()} /></div> : article.data && <article style={{ marginTop: 16 }}><div className="live-kicker">{article.data.category} · {article.data.source} · {dateTime(article.data.publishedAt)}</div><h2 style={{ font: "800 28px/1.15 var(--font-serif)", margin: "8px 0 16px" }}>{language === "id" ? article.data.title : article.data.titleEn}</h2><div className="live-article">{language === "id" ? article.data.content : article.data.contentEn}</div><p className="live-small" style={{ marginTop: 16 }}>{t("Teks artikel ditampilkan apa adanya dari sumber. Tidak ada HTML pihak ketiga yang dieksekusi.", "Article text is shown as plain text from the source. No third-party HTML is executed.")}</p></article>}
        </div>}
        {!articleSlug && market.context.isLoading ? <LoadingBlock label={t("Memuat daftar berita", "Loading news list")} /> :
          !articleSlug && context?.news.status === "ready" && context.news.items.length ? <div className="live-list">{context.news.items.map((item) => <button className="live-position" key={item.slug} onClick={() => { setArticleSlug(item.slug); setLocation(`/analysis?article=${encodeURIComponent(item.slug)}`); }} style={{ width: "100%", textAlign: "left", color: "inherit", background: "transparent", cursor: "pointer" }}><div><div className="live-kicker">{item.category} · {item.source}</div><strong>{language === "id" ? item.title : item.titleEn}</strong><div className="live-small">{dateTime(item.publishedAt)}</div></div><ArrowLeft size={15} style={{ transform: "rotate(180deg)" }}/></button>)}</div> :
          !articleSlug && (context?.news.status !== "ready" || !context.news.items.length) && <div className="live-alert">{context?.news.message?.[language] ?? t("Berita belum tersedia.", "News is unavailable.")} <a className="live-link" href="https://www.newsmaker.id" target="_blank" rel="noreferrer">{t("Kunjungi sumber umum", "Visit source home")} <ExternalLink size={12}/></a></div>}
      </Panel>
    </div>
  </LiveShell>;
}
