import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Globe2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { PwaInstall } from "@/components/live/pwa-install";

export function LiveShell({ children }: { children: ReactNode }) {
  const { language, setLanguage, t, languageStorageAvailable } = useLanguage();
  const [introOpen, setIntroOpen] = useState(() => {
    try { return localStorage.getItem("mrg_welcome_seen") !== "1"; }
    catch { return true; }
  });
  const [introStorageError, setIntroStorageError] = useState(false);
  const dismissIntro = () => {
    try { localStorage.setItem("mrg_welcome_seen", "1"); }
    catch { setIntroStorageError(true); }
    setIntroOpen(false);
  };
  return (
    <div className="live-shell">
      <div className="live-container">
        <header className="live-header">
          <Link href="/" className="live-brand" aria-label="Martingale Risk Guard · Newsmaker home">
            <img src="/newsmaker-logo-white.png" alt="Newsmaker" />
            <span><strong>Martingale Risk Guard</strong><small>MRG · Newsmaker&nbsp;&nbsp;|&nbsp;&nbsp;Market context · position exposure</small></span>
          </Link>
          <Link href="/" className="live-link" data-testid="link-back-calculator"><strong>{t("Kembali ke kalkulator", "Back to calculator")}</strong></Link>
          <div className="live-row" style={{ gap: 6 }}>
            <span id="mrg-install-toolbar" className="live-header-install" />
            <button className="live-icon-btn" onClick={() => setLanguage(language === "id" ? "en" : "id")} aria-label={t("Ganti bahasa", "Change language")}>
              <Globe2 size={16} />{language === "id" ? "EN" : "ID"}
            </button>
          </div>
        </header>
        {!languageStorageAvailable && <div className="live-alert" role="alert">{t("Preferensi bahasa tidak dapat disimpan di browser ini.", "Language preferences cannot be saved in this browser.")}</div>}
        <aside className="live-critical-note" aria-label={t("Pengenalan MRG", "MRG introduction")}>
          <span>{t("Informasi saja · posisi manual · tanpa order · indeks belum dikalibrasi", "Information only · manual positions · no orders · uncalibrated index")}</span>
          {introOpen && <details className="live-intro-details">
            <summary>{t("Catatan penggunaan", "Usage note")}</summary>
            <p>{t("Data pasar dapat diperbarui; posisi tetap catatan manual. Skor awal adalah heuristik, bukan jaminan keamanan, probabilitas rugi, atau ukuran risiko seluruh rekening.", "Market data may update; positions remain manual records. The initial score is heuristic, not a safety guarantee, loss probability, or whole-account risk measure.")}</p>
            <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap", marginTop: 8 }}><button className="live-button" onClick={dismissIntro}>{t("Mengerti, lanjutkan", "Understood, continue")}</button><Link className="live-link" href="/terms">{t("Ketentuan", "Terms")}</Link></div>
          </details>}
        </aside>
        {introStorageError && <div className="live-alert" role="alert">{t("Pilihan pengenalan hanya berlaku selama halaman ini terbuka karena browser menolak penyimpanan.", "This introduction choice lasts only while this page is open because browser storage was denied.")}</div>}
        <PwaInstall toolbarId="mrg-install-toolbar" />
        <main className="live-main">{children}</main>
        <footer className="live-footer" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span className="live-small">MRG · {t("Alat informasi, bukan broker atau layanan transaksi.", "Information tool, not a broker or trading service.")}</span>
          <span style={{ display: "flex", gap: 16 }}><Link className="live-link live-small" href="/literasi">{t("Literasi", "Literacy")}</Link><Link className="live-link live-small" href="/privacy">{t("Privasi", "Privacy")}</Link><Link className="live-link live-small" href="/terms">{t("Ketentuan", "Terms")}</Link></span>
        </footer>
      </div>
    </div>
  );
}
