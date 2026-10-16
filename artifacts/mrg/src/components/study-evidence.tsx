import type { Copy, LiveQuote } from "@shared/live-types";
import type { StudyReference } from "@shared/study-market";
import { useLanguage } from "@/lib/language-context";

const fmtTime = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "medium" }).format(d) + " WIB";
};
const num = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

export function StudyEvidence({ reference, warnings, quote, frozenAt, calendar }: {
  reference: StudyReference; warnings: Copy[]; quote: LiveQuote | null; frozenAt?: number;
  calendar?: { status: string; complete: boolean; generatedAt: string | null; receivedAt: string | null } | null;
}) {
  const { t } = useLanguage();
  const a = reference.analysis;
  const trendText = !a ? "" : a.trend === "up" ? t("naik", "up") : a.trend === "down" ? t("turun", "down") : t("campuran", "mixed");
  return (
    <div className="mrg-evidence" data-testid="study-evidence">
      {a ? (
        <p>
          <strong>{t("Referensi emas harian (LGD Daily, D1)", "Daily gold reference (LGD Daily, D1)")}:</strong>{" "}
          {t(`tren ${trendText}`, `trend ${trendText}`)}; close {num(a.lastClose)}, MA20 {num(a.ma20)}, MA50 {num(a.ma50)};
          ATR14 {num(a.atr14)} {t("vs median pembanding", "vs baseline median")} {num(a.atrBaseline)}.{" "}
          {t("Candle terakhir", "Last candle")} {a.lastDate}.
          {" "}{t("Diterima", "Received")} {fmtTime(reference.receivedAt) ?? t("waktu tidak tersedia", "time unavailable")}.
          {" "}{t("Emas referensi, bukan XUL10/H1; bukan kepastian arah.", "Gold reference, not XUL10/H1; not a certain direction.")}
        </p>
      ) : (
        <p>{t("Referensi tren D1 belum dapat dinilai (data tidak tersedia, usang, atau tidak koheren).", "The D1 trend reference could not be assessed (unavailable, stale, or inconsistent).")}</p>
      )}
      {quote && quote.asOf ? (
        <p>
          <strong>{frozenAt ? t("Harga XUL10 saat snapshot (bukan harga sekarang)", "XUL10 price at snapshot (not the current price)") : t("Harga XUL10", "XUL10 price")}:</strong>{" "}
          {num(quote.price)} · tick {fmtTime(quote.asOf)} · {quote.source}.
        </p>
      ) : (
        <p>{t("Harga XUL10 berjalan tidak tersedia atau tidak segar; tidak ditampilkan sebagai live.", "No fresh live XUL10 price; nothing is shown as live.")}</p>
      )}
      {calendar !== undefined && (
        <p>
          <strong>{t("Kalender Newsmaker", "Newsmaker calendar")}:</strong>{" "}
          {calendar && calendar.status === "ready"
            ? t(`${calendar.complete ? "lengkap" : "parsial (tidak lengkap)"}; dibuat ${fmtTime(calendar.generatedAt) ?? "waktu tidak tersedia"}; diterima ${fmtTime(calendar.receivedAt) ?? "waktu tidak tersedia"}.`, `${calendar.complete ? "complete" : "partial (incomplete)"}; generated ${fmtTime(calendar.generatedAt) ?? "time unavailable"}; received ${fmtTime(calendar.receivedAt) ?? "time unavailable"}.`)
            : t("tidak tersedia; jendela agenda belum dapat dinilai.", "unavailable; the event window could not be assessed.")}
          {frozenAt ? " " + t("Data historis snapshot, bukan live.", "Historical snapshot data, not live.") : ""}
        </p>
      )}
      {warnings.length > 0 && (
        <ul>{warnings.map((w, i) => <li key={i}>{t(w.id, w.en)}</li>)}</ul>
      )}
      {frozenAt && <p className="live-small">{t("Snapshot dibekukan saat Cek Risiko", "Snapshot frozen at Cek Risiko")}: {fmtTime(new Date(frozenAt).toISOString())}. {t("Tidak diperbarui otomatis.", "Not refreshed automatically.")}</p>}
    </div>
  );
}
