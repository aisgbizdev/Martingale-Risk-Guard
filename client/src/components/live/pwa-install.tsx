import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let installPrompt: InstallPrompt | null = null;
let installationCompleted = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((callback) => callback());
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event as InstallPrompt;
  notify();
});
window.addEventListener("appinstalled", () => {
  installationCompleted = true;
  installPrompt = null;
  notify();
});
const standalone = () => installationCompleted || window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function PwaInstall() {
  const { t } = useLanguage();
  const [, redraw] = useState(0);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(standalone);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState(false);
  useEffect(() => {
    const changed = () => redraw((value) => value + 1);
    const installedChanged = () => setInstalled(true);
    const networkChanged = () => setOnline(navigator.onLine);
    subscribers.add(changed);
    window.addEventListener("appinstalled", installedChanged);
    window.addEventListener("online", networkChanged);
    window.addEventListener("offline", networkChanged);
    return () => {
      subscribers.delete(changed);
      window.removeEventListener("appinstalled", installedChanged);
      window.removeEventListener("online", networkChanged);
      window.removeEventListener("offline", networkChanged);
    };
  }, []);
  const install = async () => {
    if (!installPrompt) { setHelp((value) => !value); return; }
    const prompt = installPrompt;
    setBusy(true); setError(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") setHelp(true);
    } catch { setError(true); setHelp(true); }
    finally {
      if (installPrompt === prompt) installPrompt = null;
      notify();
      setBusy(false);
    }
  };
  return <div className="live-pwa-tools">
    {!online && <div className="live-alert" role="alert">{t("Offline · harga dan indeks live dijeda. Catatan lokal tetap tersedia.", "Offline · live prices and index paused. Local records remain available.")}</div>}
    {!installed && <button className="live-button" onClick={() => void install()} disabled={busy}
      aria-expanded={help} aria-label={t("Install aplikasi", "Install app")}><Download size={15}/>{busy ? t("Menunggu", "Waiting") : t("Install", "Install")}</button>}
    {help && <div className="live-alert" role="region" aria-label={t("Panduan install", "Installation guide")}>
      <div className="live-row"><strong>{t("Pasang MRG di ponsel", "Install MRG on your phone")}</strong><button className="live-button" onClick={() => setHelp(false)} aria-label={t("Tutup panduan install", "Close installation guide")}><X size={14}/></button></div>
      <p className="live-small">{t("Android: menu browser → Install aplikasi / Tambahkan ke layar utama. iPhone: Safari → Bagikan → Tambahkan ke Layar Utama.", "Android: browser menu → Install app / Add to home screen. iPhone: Safari → Share → Add to Home Screen.")}</p>
      {window.self !== window.top && <a className="live-button primary" href="/" target="_blank" rel="noopener noreferrer">{t("Buka di browser", "Open in browser")}</a>}
      {!import.meta.env.PROD && <p className="live-small">{t("Pemasangan dan mode offline penuh tersedia pada versi publish, bukan preview pengembangan.", "Installation and full offline mode are available in the published build, not the development preview.")}</p>}
      {error && <p className="live-error" role="alert">{t("Pemasangan belum berhasil. Gunakan menu browser atau coba kembali.", "Installation did not succeed. Use the browser menu or try again.")}</p>}
    </div>}
  </div>;
}
