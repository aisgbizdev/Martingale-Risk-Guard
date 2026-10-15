import { Link } from "wouter";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { LiveShell } from "@/components/live/live-shell";
import { useLanguage } from "@/lib/language-context";

export default function NotFound() {
  const { t } = useLanguage();
  return <LiveShell>
    <main className="mrg-not-found" aria-labelledby="not-found-title">
      <div className="live-kicker">NEWSMAKER · MRG</div>
      <FileQuestion size={34} aria-hidden="true" />
      <p className="mrg-not-found-code">404</p>
      <h1 id="not-found-title">{t("Halaman tidak ditemukan", "Page not found")}</h1>
      <p className="live-subtitle">{t("Alamat ini tidak mengarah ke bagian MRG yang tersedia.", "This address does not point to an available MRG section.")}</p>
      <Link href="/" className="live-button primary" data-testid="button-not-found-home"><ArrowLeft size={16} />{t("Kembali ke ringkasan", "Back to overview")}</Link>
    </main>
  </LiveShell>;
}
