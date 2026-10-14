import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useMarket, useArticle } from "@/hooks/use-market";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { ErrorBox, Field, LoadingBlock, PageIntro, Panel } from "@/components/live/live-ui";
import { TechnicalOverview } from "@/components/live/technical-overview";
import type { CalendarEvent } from "@shared/live-types";
import { calendarIsFresh } from "@shared/live-types";

const dateTime = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return null; }
};
const currencyCountries: Record<string, string> = {
  USD: "amerika united states united states of america usa US amerika serikat",
  JPY: "jepang japan",
  CNY: "china tiongkok cina",
  EUR: "euro eropa europe european union",
  GBP: "inggris england united kingdom uk britain great britain",
  AUD: "australia",
  CAD: "kanada canada",
  CHF: "swiss switzerland swiss confederation swiss franc",
  NZD: "new zealand selandia baru",
  INR: "india",
  KRW: "korea south korea korea selatan",
  SGD: "singapore singapura",
  HKD: "hong kong",
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
    return <div className="live-event-time"><strong>{day}</strong><div className="live-small">{clock} · {relative}</div></div>;
  }
  const allDay = /all\s*day|sepanjang\s*hari/i.test(event.time);
  const validDate = event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && Number.isFinite(Date.parse(`${event.date}T12:00:00`));
  const day = validDate ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${event.date}T12:00:00`)) : t("Tanggal tidak tersedia", "Date unavailable");
  return <div className="live-event-time"><strong>{day}</strong><div className="live-small">{allDay ? t("Sepanjang hari · waktu rilis tidak diketahui", "All day · release time unknown") : event.time || t("Waktu tidak tersedia", "Time unavailable")}</div></div>;
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
  const [keyword, setKeyword] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const context = market.context.data;
  const analysis = context?.history.analysis;
  const events = context?.calendar.events ?? [];
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const calendarFresh = !market.context.isError && calendarIsFresh(context?.calendar, market.now);
  const requestedTab = new URLSearchParams(search).get("tab");
  const activeTab = articleSlug ? "news" : requestedTab === "calendar" || requestedTab === "news" ? requestedTab : "technical";
  const selectTab = (tab: "technical" | "calendar" | "news") => {
    setLocation(`/analysis?tab=${tab}`);
  };
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (currency !== "ALL" && event.currency !== currency) return false;
    if (impact !== "ALL" && event.impact !== impact) return false;
    const localDate = event.at ? new Intl.DateTimeFormat("en-CA", { timeZone: userTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(event.at)) : event.date;
    if ((from || to) && !localDate) return false;
    if (from && localDate! < from) return false;
    if (to && localDate! > to) return false;
    const country = event.country ?? "";
    const aliases = currencyCountries[event.currency.toUpperCase()] ?? "";
    const searchText = `${event.name} ${country} ${event.currency} ${aliases} ${event.explanation ?? ""} ${event.source ?? ""}`.toLocaleLowerCase();
    if (keyword.trim() && !searchText.includes(keyword.trim().toLocaleLowerCase())) return false;
    return true;
  }), [events, currency, impact, from, to, keyword, userTimezone]);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const visibleEvents = filteredEvents.slice((eventPage - 1) * pageSize, eventPage * pageSize);
  useEffect(() => { setEventPage(1); }, [currency, impact, from, to, keyword]);
  useEffect(() => {
    setArticleSlug(new URLSearchParams(window.location.search).get("article"));
  }, [location, search]);
  return <LiveShell>
    <div className="live-analysis-page">
    <PageIntro kicker={t("Analisis pasar · XUL10", "Market analysis · XUL10")} title={t("Konteks, bukan sinyal.", "Context, not signals.")}>
      {t("Indikator harian, kalender, dan berita Newsmaker dengan sumber yang jelas. Chart visual dimuat otomatis hanya saat tab Teknikal aktif.", "Daily indicators, calendar, and Newsmaker news with clear sources. The visual chart loads automatically only while the Technical tab is active.")}
    </PageIntro>
    {!market.context.isLoading && !calendarFresh && <div className="live-alert live-source-warning" role="alert">{t("Kalender tidak tersedia atau kedaluwarsa. Jadwal lama hanya referensi; komponen indeks agenda tidak digunakan.", "Calendar is unavailable or stale. Any old schedule is reference only; the event index component is not used.")}</div>}
    {market.context.isError && <div style={{ marginTop: 10 }}><ErrorBox message={t("Sebagian atau seluruh konteks gagal dimuat. Angka yang tidak tersedia tidak digantikan.", "Some or all context failed to load. Unavailable values are not substituted.")} retry={() => void market.refresh()} /></div>}
    <div className="live-tabs" role="tablist" aria-label={t("Bagian analisis", "Analysis sections")} onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tabs = ["technical", "calendar", "news"] as const;
      const index = tabs.indexOf(activeTab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      selectTab(tabs[next]);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-analysis-tab="${tabs[next]}"]`)?.focus());
    }}>
      {(["technical", "calendar", "news"] as const).map((tab) => <button key={tab} type="button" role="tab" data-analysis-tab={tab} id={`analysis-tab-${tab}`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => selectTab(tab)}>{tab === "technical" ? t("Teknikal", "Technical") : tab === "calendar" ? t("Kalender", "Calendar") : t("Berita", "News")}</button>)}
    </div>
    <div className={`live-grid${activeTab === "technical" ? " live-technical-grid" : ""}`}>
      {activeTab === "technical" && <div className="live-tabpanel live-technical-tabpanel" role="tabpanel" id="analysis-panel-technical" aria-labelledby="analysis-tab-technical">
        <TechnicalOverview
          analysis={analysis}
          historyMessage={context?.history.message?.[language]}
          receivedAt={context?.history.receivedAt ?? null}
          isLoading={market.context.isLoading}
          online={market.online}
        />
      </div>}
      {activeTab === "calendar" && <div className="live-tabpanel" role="tabpanel" id="analysis-panel-calendar" aria-labelledby="analysis-tab-calendar">
      <Panel className="live-span-12" title={t("Agenda ekonomi", "Economic calendar")} eyebrow={`${userTimezone} · ${calendarFresh ? t("data lengkap dan baru", "complete and fresh") : t("belum lengkap / kedaluwarsa", "incomplete / stale")}`} action={<button className="live-icon-btn" onClick={() => void market.refresh()} aria-label={t("Perbarui data", "Refresh data")}><RefreshCw size={15}/></button>}>
        <details className="live-details"><summary>{t("Tentang sumber & waktu", "About source & timing")}</summary><p className="live-small">{t("Kalender mencakup halaman server untuk pekan ini dan berikutnya. Waktu ditampilkan dalam zona waktu pengguna bila tersedia. Kesegaran maksimal 15 menit; kegagalan bukan berarti tidak ada agenda.", "Calendar includes server-paginated this-week and next-week data. Times use the user's timezone where available. Maximum freshness is 15 minutes; failure does not mean there are no events.")}</p></details>
        <div style={{ marginTop: 14 }}>
          <div className="live-field live-calendar-search"><label htmlFor="calendar-keyword">{t("Cari acara, negara, atau mata uang", "Search event, country, or currency")}</label><input id="calendar-keyword" type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t("Contoh: CPI, AS, USD", "e.g. CPI, US, USD")} /></div>
        </div>
        <details className="live-details live-calendar-filters" style={{ marginTop: 10 }}>
          <summary>{t("Filter agenda", "Calendar filters")}{(currency !== "ALL" || impact !== "ALL" || from || to) && <span className="live-small"> · {t("aktif", "active")}</span>}</summary>
          <div className="live-form-grid" style={{ marginTop: 14 }}>
          <div className="live-field"><label htmlFor="calendar-currency">{t("Mata uang", "Currency")}</label><select id="calendar-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="ALL">{t("Semua mata uang", "All currencies")}</option>{Array.from(new Set(events.map((e) => e.currency))).filter(Boolean).sort().map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="live-field"><label htmlFor="calendar-impact">{t("Dampak", "Impact")}</label><select id="calendar-impact" value={impact} onChange={(e) => setImpact(e.target.value)}><option value="ALL">{t("Semua dampak", "All impacts")}</option>{["high", "medium", "low", "unknown"].map((value) => <option key={value} value={value}>{value === "unknown" ? t("Tidak diketahui", "Unknown") : t(value === "high" ? "Tinggi" : value === "medium" ? "Sedang" : "Rendah", value)}</option>)}</select></div>
          <Field label={t("Dari tanggal", "From date")} type="date" value={from} onChange={setFrom} />
          <Field label={t("Sampai tanggal", "Through date")} type="date" value={to} onChange={setTo} />
          </div>
        </details>
        {market.context.isLoading ? <div style={{ marginTop: 16 }}><LoadingBlock label={t("Memuat kalender", "Loading calendar")} /></div> :
          context?.calendar.status !== "ready" ? <div style={{ marginTop: 14 }}><ErrorBox message={context?.calendar.message?.[language] ?? t("Kalender tidak tersedia.", "Calendar unavailable.")} retry={() => void market.refresh()} /></div> :
          filteredEvents.length ? <>
            <div className="live-stack" style={{ marginTop: 16 }}>{visibleEvents.map((event) => <div className="live-event" key={event.id}><EventTime event={event} timezone={context.calendar.timezone} now={market.now} t={t}/><div><strong>{event.name}</strong><div className="live-small">{event.currency} · {event.impact === "unknown" ? t("Dampak tidak diketahui", "Impact unknown") : t(event.impact === "high" ? "Dampak tinggi" : event.impact === "medium" ? "Dampak sedang" : "Dampak rendah", `${event.impact} impact`)}</div>{event.explanation && <div className="live-small">{event.explanation}</div>}{event.source && <div className="live-small">{t("Sumber", "Source")}: {event.source}</div>}</div><div className="live-small live-event-values">{event.previous && <div>{t("Sebelumnya", "Previous")}: {event.previous}</div>}{event.forecast && <div>{t("Perkiraan", "Forecast")}: {event.forecast}</div>}{event.actual && <div>{t("Aktual", "Actual")}: {event.actual}</div>}</div></div>)}</div>
            <div className="live-pagination"><span className="live-small">{t("Menampilkan", "Showing")} {(eventPage - 1) * pageSize + 1}–{Math.min(eventPage * pageSize, filteredEvents.length)} / {filteredEvents.length}</span><div><button className="live-icon-btn" type="button" disabled={eventPage <= 1} onClick={() => setEventPage((p) => Math.max(1, p - 1))} aria-label={t("Halaman sebelumnya", "Previous page")}><ChevronLeft size={16}/></button><span className="live-small">{eventPage} / {pageCount}</span><button className="live-icon-btn" type="button" disabled={eventPage >= pageCount} onClick={() => setEventPage((p) => Math.min(pageCount, p + 1))} aria-label={t("Halaman berikutnya", "Next page")}><ChevronRight size={16}/></button></div></div>
          </> : <div className="live-alert" style={{ marginTop: 14 }}>{t("Tidak ada agenda yang cocok dengan filter. Ini bukan pernyataan bahwa tidak ada rilis lain di luar dataset.", "No events match these filters. This does not assert that no other releases exist outside the dataset.")}</div>}
        {context?.calendar.receivedAt && <div className="live-small" style={{ marginTop: 12 }}>{t("Data diterima", "Received")}: {dateTime(context.calendar.receivedAt)} · {t("calendar freshness 15 menit", "15-minute calendar freshness")}</div>}
      </Panel>
      </div>}
       {activeTab === "news" && <div className="live-tabpanel" role="tabpanel" id="analysis-panel-news" aria-labelledby="analysis-tab-news">
       <Panel className="live-span-12" title={t("Berita Newsmaker", "Newsmaker news")} eyebrow={t("Bacaan editorial · bukan sinyal arah", "Editorial reading · not a directional signal")}>
        {articleSlug && <div style={{ marginBottom: 16 }}>
          <button className="live-button" onClick={() => { setArticleSlug(null); setLocation("/analysis?tab=news"); }}><ArrowLeft size={15}/>{t("Kembali ke daftar", "Back to list")}</button>
          {article.isLoading ? <div style={{ marginTop: 14 }}><LoadingBlock label={t("Memuat artikel", "Loading article")} /></div> : article.isError ? <div style={{ marginTop: 14 }}><ErrorBox message={t("Artikel tidak dapat dimuat.", "Article could not be loaded.")} retry={() => void article.refetch()} /></div> : article.data && <article style={{ marginTop: 16 }}><div className="live-kicker">{article.data.category} · {article.data.source} · {dateTime(article.data.publishedAt)}</div><h2 style={{ font: "800 28px/1.15 var(--font-serif)", margin: "8px 0 16px" }}>{language === "id" ? article.data.title : article.data.titleEn}</h2><div className="live-article">{language === "id" ? article.data.content : article.data.contentEn}</div><p className="live-small" style={{ marginTop: 16 }}>{t("Teks artikel ditampilkan apa adanya dari sumber. Tidak ada HTML pihak ketiga yang dieksekusi.", "Article text is shown as plain text from the source. No third-party HTML is executed.")}</p></article>}
        </div>}
        {!articleSlug && market.context.isLoading ? <LoadingBlock label={t("Memuat daftar berita", "Loading news list")} /> :
          !articleSlug && context?.news.status === "ready" && context.news.items.length ? <div className="live-list">{context.news.items.map((item) => <button className="live-position" key={item.slug} onClick={() => { setArticleSlug(item.slug); setLocation(`/analysis?article=${encodeURIComponent(item.slug)}`); }} style={{ width: "100%", textAlign: "left", color: "inherit", background: "transparent", cursor: "pointer" }}><div><div className="live-kicker">{item.category} · {item.source}</div><strong>{language === "id" ? item.title : item.titleEn}</strong><div className="live-small">{dateTime(item.publishedAt)}</div></div><ArrowLeft size={15} style={{ transform: "rotate(180deg)" }}/></button>)}</div> :
          !articleSlug && (context?.news.status !== "ready" || !context.news.items.length) && <div className="live-alert">{context?.news.message?.[language] ?? t("Berita belum tersedia.", "News is unavailable.")} <a className="live-link" href="https://www.newsmaker.id" target="_blank" rel="noreferrer">{t("Kunjungi sumber umum", "Visit source home")} <ExternalLink size={12}/></a></div>}
       </Panel>
       </div>}
     </div>
    </div>
  </LiveShell>;
}
