import { Link } from "wouter";
import { AlertTriangle, BookOpenCheck, Shield } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { PageIntro, Panel } from "@/components/live/live-ui";

export default function Terms() {
  const { t } = useLanguage();
  return <LiveShell>
    <PageIntro kicker={t("MRG · batas penggunaan", "MRG · use boundaries")} title={t("Syarat & ketentuan", "Terms & conditions")}>
      {t("Informasi untuk membantu membaca angka dan konteks, bukan layanan broker.", "Information to help interpret figures and context, not a brokerage service.")}
    </PageIntro>
    <div className="live-grid">
      <Panel className="live-span-12" title={t("Informasi, bukan nasihat", "Information, not advice")} eyebrow={t("Penggunaan edukatif", "Educational use")}>
        <p className="live-subtitle">{t("MRG menyediakan kalkulator studi historis, referensi pasar, dan indeks heuristik posisi. Tidak ada bagian yang merupakan rekomendasi investasi, sinyal, instruksi menambah/mengurangi posisi, jaminan profit, atau jaminan keamanan.", "MRG provides historical-study calculations, market references, and a heuristic position index. Nothing is investment advice, a signal, an instruction to add/reduce positions, a profit guarantee, or a safety guarantee.")}</p>
      </Panel>
      <Panel className="live-span-6" title={t("Data dan ketidakpastian", "Data and uncertainty")} eyebrow={t("Sumber dapat terlambat", "Sources can be delayed")}>
        <p className="live-subtitle">{t("Harga, candle referensi emas LGD Daily D1, kalender, dan berita dapat tidak tersedia, tertunda, atau berbeda dari instrumen XUL10. Chart OANDA:XAUUSD juga bukan harga identik XUL10. Data yang hilang tidak berarti risiko nihil.", "XUL10 prices, LGD Daily D1 gold-reference candles, calendar, and news may be unavailable, delayed, or differ from the XUL10 instrument. The OANDA:XAUUSD chart is also not an identical XUL10 price. Missing data does not mean zero risk.")}</p>
      </Panel>
      <Panel className="live-span-6" title={t("Indeks live", "Live index")} eyebrow={t("Heuristik awal", "Initial heuristic")}>
        <p className="live-subtitle">{t("Indeks 0–100 memakai bobot awal yang belum dikalibrasi. Ini bukan probabilitas rugi, risiko seluruh rekening, P/L uang, margin, atau penilaian bahwa posisi aman. Batas pengguna adalah parameter model, bukan saran untuk menambah eksposur.", "The 0–100 index uses initial, uncalibrated weights. It is not a loss probability, whole-account risk, monetary P/L, margin figure, or a claim that positions are safe. User limits are model inputs, not advice to increase exposure.")}</p>
      </Panel>
      <Panel className="live-span-12" title={t("Tidak ada eksekusi transaksi", "No trade execution")} eyebrow={t("Newsmaker adalah portal informasi", "Newsmaker is an information portal")}>
        <div className="live-row" style={{ justifyContent: "start", alignItems: "start" }}><AlertTriangle size={18}/><p className="live-subtitle">{t("MRG bukan broker dan tidak terhubung ke akun transaksi. Posisi adalah catatan manual pengguna. Mencatat simulasi hanya menyimpan input ke perangkat ini; tindakan tersebut tidak mengirim order atau membuktikan transaksi nyata.", "MRG is not a broker and is not connected to trading accounts. Positions are manual user records. Recording a simulation only saves input on this device; it does not submit an order or verify a real trade.")}</p></div>
        <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap", marginTop: 14 }}><Link className="live-button primary" href="/basic"><BookOpenCheck size={15}/>{t("Buka Simulasi Dasar", "Open Basic Simulation")}</Link><Link className="live-button" href="/literasi"><Shield size={15}/>{t("Baca literasi risiko", "Read risk literacy")}</Link></div>
      </Panel>
    </div>
  </LiveShell>;
}
