import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart3, BookOpen, Globe2, Layers3, Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import appLogo from "@assets/logo_1766644590116.png";

const routes = [
  { href: "/", id: "overview", icon: Activity, idText: "Ringkasan", enText: "Overview" },
  { href: "/positions", id: "positions", icon: Layers3, idText: "Posisi", enText: "Positions" },
  { href: "/analysis", id: "analysis", icon: BarChart3, idText: "Analisis", enText: "Analysis" },
];

export function LiveShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { language, setLanguage, t, languageStorageAvailable } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="live-shell">
      <div className="live-container">
        <header className="live-header">
          <Link href="/" className="live-brand" aria-label="Martingale Risk Guard home">
            <img src={appLogo} alt="" />
            <span><strong>Martingale Risk Guard</strong><small>Market context · position exposure</small></span>
          </Link>
          <nav className="live-nav" aria-label={t("Navigasi utama", "Main navigation")}>
            {routes.map(({ href, id, icon: Icon, idText, enText }) => (
              <Link key={id} href={href} aria-current={location === href ? "page" : undefined}>
                <Icon size={16} />{t(idText, enText)}
              </Link>
            ))}
          </nav>
          <div className="live-row" style={{ gap: 6 }}>
            <Link href="/basic" className="live-icon-btn" title={t("Simulasi Dasar", "Basic simulation")}><BookOpen size={16} /><span className="hidden sm:inline">{t("Simulasi Dasar", "Basic")}</span></Link>
            <button className="live-icon-btn" onClick={() => setLanguage(language === "id" ? "en" : "id")} aria-label={t("Ganti bahasa", "Change language")}>
              <Globe2 size={16} />{language === "id" ? "EN" : "ID"}
            </button>
            <button className="live-icon-btn md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? t("Tutup menu", "Close menu") : t("Buka menu", "Open menu")}>
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </header>
        {menuOpen && <nav className="live-nav" style={{ display: "flex", flexWrap: "wrap", paddingTop: 10 }} aria-label={t("Navigasi", "Navigation")}>
          {routes.map(({ href, id, icon: Icon, idText, enText }) => <Link key={id} href={href} onClick={() => setMenuOpen(false)} aria-current={location === href ? "page" : undefined}><Icon size={16} />{t(idText, enText)}</Link>)}
        </nav>}
        {!languageStorageAvailable && <div className="live-alert" role="alert">{t("Preferensi bahasa tidak dapat disimpan di browser ini.", "Language preferences cannot be saved in this browser.")}</div>}
        <main className="live-main">{children}</main>
        <nav className="live-tabbar" aria-label={t("Navigasi utama", "Main navigation")}>
          {routes.map(({ href, id, icon: Icon, idText, enText }) => <Link key={id} href={href} aria-current={location === href ? "page" : undefined}><Icon /><span>{t(idText, enText)}</span></Link>)}
        </nav>
        <footer style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 25, marginTop: 30, borderTop: "1px solid hsl(var(--border))" }}>
          <span className="live-small">MRG · {t("Alat informasi, bukan broker atau layanan transaksi.", "Information tool, not a broker or trading service.")}</span>
          <span style={{ display: "flex", gap: 16 }}><Link className="live-link live-small" href="/literasi">{t("Literasi", "Literacy")}</Link><Link className="live-link live-small" href="/privacy">{t("Privasi", "Privacy")}</Link><Link className="live-link live-small" href="/terms">{t("Ketentuan", "Terms")}</Link></span>
        </footer>
      </div>
    </div>
  );
}
