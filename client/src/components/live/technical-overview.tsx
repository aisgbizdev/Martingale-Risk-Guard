import type { DailyAnalysis } from "@shared/live-types";
import { TermHelp } from "@/components/live/term-help";
import { TradingViewChart } from "@/components/live/tradingview-chart";
import { useLanguage } from "@/lib/language-context";

function receivedTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return null;
  }
}

export function TechnicalOverview({
  analysis,
  historyMessage,
  receivedAt,
  isLoading,
  online,
}: {
  analysis: DailyAnalysis | null | undefined;
  historyMessage?: string;
  receivedAt: string | null;
  isLoading: boolean;
  online: boolean;
}) {
  const { t } = useLanguage();
  const timeReceived = receivedTime(receivedAt);
  const trendLabel = analysis?.trend === "up"
    ? t("Naik", "Up")
    : analysis?.trend === "down"
      ? t("Turun", "Down")
      : t("Campuran", "Mixed");

  return <div className="mrg-technical-layout" data-testid="technical-overview">
    <section className="live-card mrg-chart-panel" aria-labelledby="technical-chart-title">
      <div className="live-row mrg-technical-heading">
        <div>
          <div className="live-kicker">TRADINGVIEW · OANDA:XAUUSD</div>
          <h2 id="technical-chart-title">{t("Chart visual", "Visual chart")}</h2>
        </div>
        <span className="live-pill">{t("Visual saja", "Visual only")}</span>
      </div>
      <p className="mrg-chart-warning" role="note">
        {t(
          "Referensi OANDA:XAUUSD berbeda dari XUL10. Visual saja; bukan data indeks atau simulasi MRG.",
          "OANDA:XAUUSD differs from XUL10. Visual only; not data for the MRG index or simulation.",
        )}
      </p>
      <p className="live-small mrg-auto-load-note" role="note">
        {t(
          "TradingView diminta otomatis saat tab ini aktif dan online.",
          "TradingView is requested automatically while this tab is active and online.",
        )}
      </p>
      <TradingViewChart online={online} />
      <details className="live-details mrg-chart-details">
        <summary>{t("Tentang chart dan sumber", "About the chart and source")}</summary>
        <p className="live-small">
          {t(
            "Widget TradingView adalah konten pihak ketiga. Keberadaan bingkai tidak membuktikan isi chart berhasil dimuat. Gunakan tautan langsung jika tampilan kosong atau dibatasi.",
            "The TradingView widget is third-party content. The presence of its frame does not prove the chart loaded successfully. Use the direct link if it appears blank or restricted.",
          )}
        </p>
      </details>
    </section>

    <section className="live-card mrg-indicator-panel" aria-labelledby="technical-indicators-title">
      <div className="live-row mrg-technical-heading">
        <div>
          <div className="live-kicker">{t("LGD DAILY · REFERENSI EMAS", "LGD DAILY · GOLD REFERENCE")}</div>
          <h2 id="technical-indicators-title">{t("Indikator D1", "D1 indicators")}</h2>
        </div>
        <span className="live-pill">D1</span>
      </div>
      <div className="mrg-lgd-warning" role="note">
        {t(
          "LGD Daily D1 adalah referensi emas, bukan harga XUL10 yang identik.",
          "LGD Daily D1 is a gold reference, not an identical XUL10 price.",
        )}
      </div>
      {isLoading ? <div className="mrg-indicator-loading" role="status" aria-label={t("Memuat indikator", "Loading indicators")}>
        <div className="live-skeleton" />
        <div className="live-skeleton" />
        <div className="live-skeleton" />
      </div> : analysis ? <>
        <div className="mrg-metric-list">
          <div className="mrg-metric">
            <div className="mrg-metric-label">
              <span>{t("Tren · MA20 / MA50", "Trend · MA20 / MA50")}</span><TermHelp term="ma" />
            </div>
            <strong className="mrg-trend-value">{trendLabel}</strong>
            <span className="live-small mrg-value-line">{analysis.ma20.toLocaleString()} / {analysis.ma50.toLocaleString()}</span>
          </div>
          <div className="mrg-metric">
            <div className="mrg-metric-label">
              <span>{t("Volatilitas · ATR14", "Volatility · ATR14")}</span><TermHelp term="atr" />
            </div>
            <strong>{analysis.atr14.toLocaleString()}</strong>
            <span className="live-small mrg-value-line">{analysis.atrPercent.toFixed(2)}% · {t("baseline", "baseline")} {analysis.atrBaseline.toLocaleString()}</span>
          </div>
          <div className="mrg-metric mrg-metric-range">
            <div className="mrg-metric-label">
              <span>{t("Support / resistance 20 hari", "20-day support / resistance")}</span>
              <span className="mrg-help-pair"><TermHelp term="support" /><TermHelp term="resistance" /></span>
            </div>
            <strong className="mrg-range-value">{analysis.support20.toLocaleString()} <span>—</span> {analysis.resistance20.toLocaleString()}</strong>
          </div>
          <div className="mrg-metric">
            <div className="mrg-metric-label"><span>{t("Candle · rentang tanggal", "Candles · date range")}</span></div>
            <strong>{analysis.candleCount.toLocaleString()}</strong>
            <span className="live-small mrg-value-line">{analysis.firstDate} — {analysis.lastDate}</span>
          </div>
          <div className="mrg-metric">
            <div className="mrg-metric-label"><span>{t("Penutupan terakhir", "Last close")}</span></div>
            <strong>{analysis.lastClose.toLocaleString()}</strong>
            <span className="live-small mrg-value-line">{t("Referensi harian", "Daily reference")}</span>
          </div>
        </div>
        {timeReceived && <div className="mrg-received-time">
          <span>{t("Data diterima", "Data received")}</span><strong>{timeReceived}</strong>
        </div>}
        <details className="live-details mrg-indicator-details">
          <summary>{t("Cara membaca indikator", "How to read these indicators")}</summary>
          <p className="live-small">
            {t(
              "Semua indikator dihitung dari riwayat harian LGD. MA20 dan MA50 merangkum harga penutupan; ATR14 dan baseline memberi konteks volatilitas; support dan resistance menunjukkan rentang historis 20 hari. Ini konteks historis, bukan prediksi atau sinyal.",
              "All indicators are calculated from LGD daily history. MA20 and MA50 summarize closes; ATR14 and its baseline provide volatility context; support and resistance show the 20-day historical range. These are historical context, not predictions or signals.",
            )}
          </p>
        </details>
      </> : <div className="mrg-history-unavailable" role="status">
        <strong>{t("Riwayat teknikal tidak tersedia", "Technical history unavailable")}</strong>
        <span>{historyMessage ?? t("Analisis harian belum tersedia. Indikator tidak ditaksir atau diganti.", "Daily analysis is unavailable. Indicators are not estimated or substituted.")}</span>
      </div>}
      <div className="mrg-no-order-note">
        {t(
          "Indeks eksposur MRG adalah heuristik yang belum dikalibrasi. Input posisi manual; MRG bukan broker atau mesin sinyal dan tidak mengirim order.",
          "The MRG exposure index is an uncalibrated heuristic. Position inputs are manual; MRG is not a broker or signal engine and sends no orders.",
        )}
      </div>
    </section>
    <div className="mrg-source-footer" aria-label={t("Sumber teknikal", "Technical sources")}>
      <span>{t("Sumber: LGD Daily · TradingView", "Sources: LGD Daily · TradingView")}</span>
      <span>{t("Konteks historis, bukan rekomendasi", "Historical context, not a recommendation")}</span>
    </div>
  </div>;
}
