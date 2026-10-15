import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const WIDGET_SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
const CHART_LINK = "https://www.tradingview.com/chart/?symbol=OANDA%3AXAUUSD";

export function TradingViewChart({ online }: { online: boolean }) {
  const { language, t } = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"offline" | "loading" | "frame" | "failed">("loading");

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    if (!online) {
      target.replaceChildren();
      setState("offline");
      return;
    }
    let active = true;
    setState("loading");
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.cssText = "height:100%;width:100%";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:calc(100% - 32px);width:100%";
    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    const attribution = document.createElement("a");
    attribution.href = CHART_LINK;
    attribution.target = "_blank";
    attribution.rel = "noopener noreferrer";
    attribution.textContent = "OANDA:XAUUSD · TradingView";
    copyright.append(attribution);
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true, symbol: "OANDA:XAUUSD", interval: "D",
      timezone: "Etc/UTC", theme: "light", style: "1",
      locale: language === "id" ? "id" : "en",
      enable_publishing: false, allow_symbol_change: false,
      hide_side_toolbar: true, hide_volume: true,
      withdateranges: true, save_image: false,
      support_host: "https://www.tradingview.com",
    });
    const timer = window.setTimeout(() => {
      if (active) setState("failed");
    }, 14000);
    const observer = new MutationObserver(() => {
      const frame = container.querySelector("iframe");
      if (!active || !frame) return;
      frame.title = language === "id"
        ? "Chart referensi emas OANDA XAUUSD dari TradingView"
        : "OANDA XAUUSD gold-reference chart from TradingView";
      // A cross-origin frame's existence/load event cannot prove that its
      // contents are a working chart instead of a 403 or other error page.
      setState("frame");
      window.clearTimeout(timer);
    });
    observer.observe(container, { childList: true, subtree: true });
    script.onerror = () => {
      if (!active) return;
      setState("failed");
      window.clearTimeout(timer);
    };
    target.append(container);
    container.append(widget, copyright, script);
    return () => {
      active = false;
      window.clearTimeout(timer);
      observer.disconnect();
      script.onerror = null;
      container.remove();
    };
  }, [language, attempt, online]);

  return <>
    <div className="mrg-chart-actions">
      <a className="live-button" href={CHART_LINK} target="_blank" rel="noopener noreferrer" aria-label={t("Buka di TradingView", "Open in TradingView")}>
        <ExternalLink size={15}/><span className="mrg-chart-action-long">{t("Buka di TradingView", "Open in TradingView")}</span><span className="mrg-chart-action-short">TradingView</span>
      </a>
      <button className="live-button" type="button" onClick={() => setAttempt((value) => value + 1)} disabled={!online} aria-label={t("Coba muat ulang chart", "Retry chart")}>
        <RefreshCw size={15}/><span className="mrg-chart-action-long">{t("Coba muat ulang chart", "Retry chart")}</span><span className="mrg-chart-action-short">{t("Muat ulang", "Retry")}</span>
      </button>
    </div>
    {state === "offline" && <div className="mrg-widget-status" role="status">
      {t("Offline — widget TradingView tidak diminta. Chart akan diinisialisasi saat koneksi kembali.", "Offline — no TradingView widget request was made. The chart will initialize when connectivity returns.")}
    </div>}
    {state === "loading" && <div className="mrg-widget-status" role="status">{t("Meminta widget TradingView…", "Requesting the TradingView widget…")}</div>}
    {state === "failed" && <div className="live-error mrg-widget-status" role="alert">
      {t("Widget belum dapat ditampilkan. Koneksi, pemblokir konten, atau pembatasan TradingView bisa menjadi penyebab.", "The widget could not be displayed. Connectivity, content blockers, or TradingView restrictions may be responsible.")}
    </div>}
    <div ref={host} className="live-chart-frame" data-testid="tradingview-chart-frame" style={{ display: state === "failed" || state === "offline" ? "none" : undefined }} />
  </>;
}
