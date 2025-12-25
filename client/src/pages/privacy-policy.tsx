import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Globe, Lock, Database, Eye } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function PrivacyPolicy() {
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
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="gap-2"
            data-testid="button-language-toggle"
          >
            <Globe className="w-4 h-4" />
            {language === "id" ? "EN" : "ID"}
          </Button>
        </div>

        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-md">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {t("Kebijakan Privasi", "Privacy Policy")}
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
                <Database className="w-5 h-5 text-primary" />
                {t("Data yang Dikumpulkan", "Data We Collect")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Martingale Risk Guard TIDAK mengumpulkan, menyimpan, atau mengirimkan data pribadi Anda ke server eksternal.",
                  "Martingale Risk Guard does NOT collect, store, or transmit your personal data to external servers."
                )}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  {t(
                    "Semua parameter trading yang Anda masukkan hanya diproses secara lokal di browser Anda",
                    "All trading parameters you enter are only processed locally in your browser"
                  )}
                </li>
                <li>
                  {t(
                    "Tidak ada registrasi akun atau login yang diperlukan",
                    "No account registration or login is required"
                  )}
                </li>
                <li>
                  {t(
                    "Skenario tersimpan disimpan di localStorage browser Anda, bukan di server kami",
                    "Saved scenarios are stored in your browser's localStorage, not on our servers"
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                {t("Penggunaan Data", "Data Usage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Parameter yang Anda masukkan digunakan secara eksklusif untuk:",
                  "The parameters you enter are used exclusively for:"
                )}
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  {t(
                    "Menghitung skor risiko berdasarkan algoritma dari penelitian tesis",
                    "Calculating risk scores based on thesis research algorithms"
                  )}
                </li>
                <li>
                  {t(
                    "Menampilkan hasil analisis risiko di layar Anda",
                    "Displaying risk analysis results on your screen"
                  )}
                </li>
                <li>
                  {t(
                    "Membandingkan skenario jika Anda memilih untuk menyimpannya secara lokal",
                    "Comparing scenarios if you choose to save them locally"
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t("Keamanan", "Security")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Karena tidak ada data yang dikirim ke server eksternal, risiko kebocoran data minimal. Semua perhitungan dilakukan di perangkat Anda.",
                  "Since no data is sent to external servers, the risk of data leakage is minimal. All calculations are performed on your device."
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                {t(
                  "Aplikasi ini adalah alat edukasi. Kami tidak bertanggung jawab atas keputusan trading yang diambil berdasarkan hasil analisis.",
                  "This application is an educational tool. We are not responsible for trading decisions made based on analysis results."
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
