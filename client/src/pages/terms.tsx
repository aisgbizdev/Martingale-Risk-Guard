import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Globe, FileText, AlertTriangle, Scale, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function Terms() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-kembali">
              <ArrowLeft className="w-4 h-4" />
              {t("Kembali", "Back")}
            </Button>
          </Link>
          <Button
            variant="default"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="gap-2"
            data-testid="button-language-toggle"
          >
            <Globe className="w-4 h-4" />
            {language === "id" ? "English" : "Indonesia"}
          </Button>
        </div>

        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-md">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {t("Syarat dan Ketentuan", "Terms and Conditions")}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("Terakhir diperbarui: 25 Desember 2025", "Last updated: December 25, 2025")}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                {t("Tujuan Aplikasi", "Application Purpose")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Martingale Risk Guard adalah aplikasi web EDUKASI yang dikembangkan berdasarkan penelitian tesis magister. Tujuan utamanya adalah:",
                  "Martingale Risk Guard is an EDUCATIONAL web application developed based on master's thesis research. Its main purpose is:"
                )}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  {t(
                    "Memberikan pemahaman tentang risiko strategi Martingale vs Linear Averaging",
                    "Provide understanding about the risks of Martingale vs Linear Averaging strategies"
                  )}
                </li>
                <li>
                  {t(
                    "Membantu pengguna mengevaluasi parameter trading sebelum mengambil keputusan",
                    "Help users evaluate trading parameters before making decisions"
                  )}
                </li>
                <li>
                  {t(
                    "Meningkatkan literasi keuangan terkait behavioral finance",
                    "Improve financial literacy related to behavioral finance"
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-rose-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
                {t("Apa yang BUKAN Aplikasi Ini", "What This Application is NOT")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("BUKAN penyedia sinyal trading atau rekomendasi entry/exit", "NOT a trading signal provider or entry/exit recommendations")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("BUKAN jaminan profit atau prediksi pasar", "NOT a profit guarantee or market prediction")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("BUKAN nasihat investasi atau keuangan profesional", "NOT professional investment or financial advice")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("BUKAN pengganti konsultasi dengan penasihat keuangan berlisensi", "NOT a substitute for consultation with a licensed financial advisor")}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t("Batasan Tanggung Jawab", "Limitation of Liability")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Dengan menggunakan aplikasi ini, Anda menyetujui bahwa:",
                  "By using this application, you agree that:"
                )}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  {t(
                    "Semua keputusan trading adalah tanggung jawab Anda sepenuhnya",
                    "All trading decisions are entirely your responsibility"
                  )}
                </li>
                <li>
                  {t(
                    "Pengembang tidak bertanggung jawab atas kerugian finansial yang mungkin timbul",
                    "The developer is not responsible for any financial losses that may occur"
                  )}
                </li>
                <li>
                  {t(
                    "Hasil analisis hanya bersifat edukatif dan tidak menjamin akurasi dalam kondisi pasar nyata",
                    "Analysis results are educational only and do not guarantee accuracy in real market conditions"
                  )}
                </li>
                <li>
                  {t(
                    "Trading derivatif memiliki risiko tinggi dan dapat menyebabkan kehilangan seluruh modal",
                    "Derivative trading carries high risk and can result in total loss of capital"
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-foreground text-center font-medium">
                {t(
                  "Dengan menggunakan Martingale Risk Guard, Anda menyatakan telah membaca, memahami, dan menyetujui syarat dan ketentuan ini.",
                  "By using Martingale Risk Guard, you declare that you have read, understood, and agreed to these terms and conditions."
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="h-11 sm:h-12" data-testid="button-kembali-home">
              <Shield className="w-5 h-5 mr-2" />
              {t("Kembali ke Beranda", "Back to Home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
