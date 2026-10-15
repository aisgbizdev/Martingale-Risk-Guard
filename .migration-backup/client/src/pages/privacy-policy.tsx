import { Link } from "wouter";
import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { PageIntro, Panel } from "@/components/live/live-ui";

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  return <LiveShell>
    <PageIntro kicker={t("MRG · transparansi data", "MRG · data transparency")} title={t("Kebijakan privasi", "Privacy policy")}>
      {t("Bagaimana fitur Simulasi Dasar dan alat live menangani data Anda.", "How Basic Simulation and live tools handle your data.")}
    </PageIntro>
    <div className="live-grid">
      <Panel className="live-span-12" title={t("Data kalkulator dasar", "Basic calculator data")} eyebrow={t("Permintaan ke server aplikasi", "Application-server request")}>
        <p className="live-subtitle">{t("Simulasi Dasar mengirim parameter kalkulasi ke endpoint aplikasi kami untuk menghitung preview dan hasil. Permintaan ini bukan penyimpanan portfolio live. Skenario dasar yang disimpan berada di localStorage browser perangkat ini.", "Basic Simulation sends calculator parameters to our application endpoint to calculate previews and results. This is not live portfolio storage. Saved basic scenarios are stored in this device browser's localStorage.")}</p>
      </Panel>
      <Panel className="live-span-6" title={t("Portfolio live lokal", "Local live portfolio")} eyebrow="LOCAL STORAGE">
        <p className="live-subtitle">{t("Catatan posisi dan preferensi disimpan di browser perangkat ini. Data tidak disinkronkan ke cloud atau dikirim ke broker. Data dapat hilang jika data browser dihapus. Tindakan Reset Data Lokal menghapus portfolio, preferensi MRG, dan skenario dasar tersimpan.", "Position records and preferences are stored in this device browser. They are not cloud-synced or sent to a broker. Data may be lost when browser data is cleared. Reset Local Data removes the portfolio, MRG preferences, and saved basic scenarios.")}</p>
      </Panel>
      <Panel className="live-span-6" title={t("Permintaan data pasar", "Market-data requests")} eyebrow="SERVER-SIDE GET">
        <p className="live-subtitle">{t("Harga, konteks harian, kalender, dan daftar berita diminta oleh server aplikasi dari sumber terkait. Catatan portfolio lokal tidak dikirim bersama permintaan market/news.", "Price, daily context, calendar, and news-list data are requested by the application server from their respective sources. Local portfolio records are not included in market/news requests.")}</p>
      </Panel>
      <Panel className="live-span-12" title={t("Chart eksternal", "External chart")} eyebrow="ON DEMAND">
        <p className="live-subtitle">{t("Chart TradingView OANDA:XAUUSD hanya dimuat setelah Anda membukanya. Browser Anda lalu menghubungi TradingView; kebijakan pihak ketiga berlaku. Chart adalah referensi emas yang berbeda dari XUL10, bukan sumber kalkulasi.", "The TradingView OANDA:XAUUSD chart loads only after you open it. Your browser then contacts TradingView; its third-party policies apply. The chart is a gold reference distinct from XUL10, not a calculation source.")}</p>
      </Panel>
      <Panel className="live-span-12" title={t("Ringkasan batas", "Scope summary")} eyebrow={t("Tanpa broker · tanpa sync", "No broker · no sync")}>
        <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap" }}><span className="live-pill"><Database size={13}/>{t("Posisi lokal", "Local positions")}</span><span className="live-pill"><ShieldCheck size={13}/>{t("Tidak ada order", "No orders")}</span><a className="live-link" href="https://www.newsmaker.id" target="_blank" rel="noreferrer">{t("Situs Newsmaker", "Newsmaker website")} <ExternalLink size={13}/></a></div>
        <p className="live-small" style={{ marginTop: 14 }}>{t("Untuk menjalankan kalkulator dasar:", "To use the basic calculator:")} <Link className="live-link" href="/basic">{t("Simulasi Dasar", "Basic Simulation")}</Link></p>
      </Panel>
    </div>
  </LiveShell>;
}
