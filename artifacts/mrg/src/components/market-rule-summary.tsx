import type { MarketRuleAnalysis, NumericComparison, RuleNewsReading } from "@shared/market-rules";
import { useLanguage } from "@/lib/language-context";
import { Link } from "wouter";

/** Read-only context: never turns topic matches into editorial coverage or a trade. */
export function MarketRuleSummary({ analysis, frozen = false }: { analysis?: MarketRuleAnalysis | null; frozen?: boolean }) {
  const { t, language } = useLanguage();
  if (!analysis) return <p className="live-small">{t("Ringkasan berita dan kalender belum tersedia; bukan berarti tidak ada risiko.", "News and calendar summary unavailable; this does not mean no risk.")}</p>;
  const read = analysis.news.filter(n => n.status === "matched" || n.status === "no-match").length;
  const matched = analysis.news.filter(n => n.status === "matched").length;
  const windowEvents = analysis.calendar.filter(({ event }) => {
    const minutes = (Date.parse(event.at ?? "") - Date.parse(analysis.evaluatedAt)) / 60_000;
    return (event.impact === "high" || event.impact === "unknown") && minutes >= -15 && minutes <= 120;
  });
  const comparison = (c: NumericComparison) => ({
    above: t("lebih tinggi", "higher"), below: t("lebih rendah", "lower"),
    equal: t("sama", "equal"), unavailable: t("tidak dapat dibandingkan", "not comparable"),
  })[c];
  const newsStatus = (s: RuleNewsReading["status"]) => ({
    matched: t("Penyebutan topik ditemukan", "Topic mention found"),
    "no-match": t("Tidak ada kecocokan aturan; bukan berarti tidak relevan", "No rule match; does not mean irrelevant"),
    unavailable: t("Isi lengkap tidak tersedia atau identitas tidak cocok", "Full text unavailable or identity mismatch"),
    stale: t("Artikel lebih dari 24 jam; tidak dicocokkan", "Article older than 24 hours; not matched"),
    "invalid-date": t("Waktu publikasi tidak valid atau mendatang", "Invalid or future publication time"),
    oversized: t("Isi melebihi batas ukuran; tidak dipotong lalu dianggap lengkap", "Body exceeds size limit; not truncated and called complete"),
  })[s];
  return <section className="live-stack live-small rounded-lg border border-border p-3" data-testid="market-rule-summary">
    <strong>{t("Berita & kalender · aturan tanpa AI", "News & calendar · rules, no AI")}</strong>
    <p>{analysis.calendarAvailable
      ? `${analysis.calendar.length} ${t("agenda USD dalam ringkasan", "USD events in summary")}${windowEvents.length ? ` · ${windowEvents.length} ${t("agenda berdampak tinggi/belum diketahui di jendela penundaan", "high/unknown-impact events in the deferral window")}` : ""}`
      : t("Kalender belum lengkap/segar; pemeriksaan agenda tidak dapat disimpulkan.", "Calendar incomplete/stale; event checks cannot be concluded.")}</p>
    <p>{analysis.newsAvailable
      ? `${read}/${analysis.newsTotal} ${t("isi artikel dicocokkan", "article bodies matched")} · ${matched} ${t("artikel menyebut topik ekonomi yang dikenali", "articles mention recognized economic topics")}`
      : t("Sumber berita tidak tersedia atau tidak segar.", "News source unavailable or stale.")}</p>
    <p>{t("Kecocokan topik bukan penilaian dampak atau bukti bahwa peristiwa sudah terjadi. Dampak berita tetap belum dinilai, bukan netral; tidak menentukan Buy/Sell atau menambah layer.", "Topic matching is not an impact assessment or proof an event occurred. News impact remains unassessed, not neutral; no Buy/Sell selection or extra layers.")}</p>
    {(analysis.calendarTruncated || analysis.newsTruncated) && <p role="status">{t("Ringkasan dibatasi; sebagian data tidak ditampilkan. Pemeriksaan penundaan kalender tetap memakai seluruh agenda.", "Summary capped; some data is not displayed. Calendar deferral checks still use all events.")}</p>}
    <details>
      <summary>{t("Sumber, angka & kutipan pencocokan", "Sources, numbers & matching excerpts")}</summary>
      <div className="live-stack mt-2">
        <p>{frozen ? t("Snapshot", "Snapshot") : t("Evaluasi", "Evaluation")}: {analysis.evaluatedAt} · {analysis.version}</p>
        <p>{t("Kalender: agenda USD 24 jam lalu–48 jam berikutnya, termasuk waktu tidak valid; maksimal 12 agenda terdekat. Berita: maksimal 8 artikel tersaring dari halaman terbaru, usia ≤24 jam. Bukan seluruh pasar.", "Calendar: USD events from the past 24 to next 48 hours, including invalid times; up to 12 nearest events. News: up to 8 filtered latest-page articles, age ≤24 hours. Not the entire market.")}</p>
        {!analysis.calendar.length && <p>{t("Tidak ada agenda yang dapat diringkas dalam cakupan ini; lihat status sumber di atas.", "No events can be summarized in this scope; check source status above.")}</p>}
        {analysis.calendar.map(({ event, phase, forecastComparison, previousComparison }) => <div key={`${event.id}/${event.date}`} className="border-t border-border pt-2">
          <strong>{event.name}</strong>
          <p>{event.date ?? "—"} · {event.time || "—"} WIB · {event.impact === "high" ? t("dampak tinggi", "high impact") : event.impact === "medium" ? t("dampak sedang", "medium impact") : event.impact === "low" ? t("dampak rendah", "low impact") : t("dampak belum diketahui", "unknown impact")}</p>
          <p>{phase === "upcoming" ? t("Belum waktunya rilis; angka actual belum dipakai.", "Release time not reached; actual value not used.") :
            phase === "awaiting" ? t("Waktu rilis lewat; actual belum tersedia.", "Release time passed; actual unavailable.") :
            phase === "unknown" ? t("Waktu tidak valid; tidak menyimpulkan sudah rilis.", "Invalid time; not assumed released.") :
            t("Waktu rilis lewat; actual tercantum di sumber.", "Release time passed; actual provided by source.")}</p>
          <p>Actual {event.actual ?? "—"} · Forecast {event.forecast ?? "—"} · Previous {event.previous ?? "—"}</p>
          <p>Actual / Forecast: {comparison(forecastComparison)} · Actual / Previous: {comparison(previousComparison)}</p>
          <p>{t("Perbandingan angka saja, bukan arah emas/USD. Angka dengan satuan berbeda atau format meragukan tidak dibandingkan.", "Numeric comparison only, not gold/USD direction. Different units or ambiguous formats are not compared.")}</p>
          <p>{t("Sumber", "Source")}: {event.source ?? "Newsmaker"}</p>
        </div>)}
        {analysis.news.map((reading, index) => <div key={`${reading.item.slug}/${index}`} className="border-t border-border pt-2">
          <Link className="underline" href={`/analysis?article=${encodeURIComponent(reading.item.slug)}`}>{language === "en" ? reading.item.titleEn : reading.item.title}</Link>
          <p>{reading.item.source} · {reading.item.publishedAt ?? "—"} · {newsStatus(reading.status)}</p>
          {reading.matches.map(match => <div key={match.topic.en}>
            <p>{language === "en" ? match.topic.en : match.topic.id} · {match.eventKeys.length
              ? t("Topik sama dengan agenda:", "Same topic as events:")
              : t("Tidak ada agenda bertopik sama dalam ringkasan ini.", "No same-topic event in this summary.")}</p>
            {match.eventKeys.map(key => <p key={key}>{analysis.calendar.find(r => `${r.event.id}/${r.event.date}` === key)?.event.name} · {analysis.calendar.find(r => `${r.event.id}/${r.event.date}` === key)?.event.at ?? "—"}</p>)}
            <blockquote className="break-words border-l-2 border-border pl-2">“{match.excerpt}”</blockquote>
          </div>)}
          {reading.contentHash && <p className="break-all">SHA-256: {reading.contentHash}</p>}
        </div>)}
      </div>
    </details>
  </section>;
}
