import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  Brain, 
  Shield,
  Globe,
  Layers,
  Target,
  XCircle
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

function ExponentialTable({ t }: { t: (id: string, en: string) => string }) {
  const layers = [
    { layer: 1, linear: 1, martingale: 1 },
    { layer: 2, linear: 2, martingale: 2 },
    { layer: 3, linear: 3, martingale: 4 },
    { layer: 4, linear: 4, martingale: 8 },
    { layer: 5, linear: 5, martingale: 16 },
    { layer: 6, linear: 6, martingale: 32 },
    { layer: 7, linear: 7, martingale: 64 },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Layer</th>
            <th className="py-2 px-3 text-center font-medium text-emerald-600 dark:text-emerald-400">Linear (1-2-3-4)</th>
            <th className="py-2 px-3 text-center font-medium text-rose-600 dark:text-rose-400">Martingale (1-2-4-8)</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((row) => (
            <tr key={row.layer} className="border-b border-border/50">
              <td className="py-2 px-3 font-mono">{row.layer}</td>
              <td className="py-2 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{row.linear} lot</td>
              <td className="py-2 px-3 text-center font-mono text-rose-600 dark:text-rose-400">{row.martingale} lot</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50">
            <td className="py-2 px-3 font-medium">{t("Total", "Total")}</td>
            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">28 lot</td>
            <td className="py-2 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">127 lot</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function Literasi() {
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
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {t("Literasi Risiko", "Risk Literacy")}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            {t(
              "Pahami risiko sebelum menggunakan strategi averaging pada trading",
              "Understand the risks before using averaging strategies in trading"
            )}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t("Apa itu Martingale?", "What is Martingale?")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Martingale adalah strategi yang menggandakan ukuran posisi setiap kali mengalami kerugian. Idenya: satu kemenangan akan menutupi semua kerugian sebelumnya.",
                  "Martingale is a strategy that doubles position size after each loss. The idea: one win will recover all previous losses."
                )}
              </p>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="font-mono text-center text-lg">
                  1 → 2 → 4 → 8 → 16 → 32 → ...
                </p>
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  {t("Lot size meningkat eksponensial", "Lot size increases exponentially")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t("Kenapa Terlihat 'Profit Cepat'?", "Why Does It Look Like 'Fast Profit'?")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Martingale sering terlihat menghasilkan profit konsisten karena:",
                  "Martingale often appears to generate consistent profits because:"
                )}
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{t("Win rate tinggi (banyak trade profit kecil)", "High win rate (many small winning trades)")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{t("Kerugian besar jarang terjadi (tapi ketika terjadi, fatal)", "Large losses are rare (but when they happen, they're fatal)")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{t("Backtest pendek tidak menangkap 'black swan event'", "Short backtests don't capture 'black swan events'")}</span>
                </li>
              </ul>
              <div className="p-4 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 rounded-md">
                <p className="text-rose-700 dark:text-rose-300 font-medium">
                  {t(
                    "Analogi: Seperti mengumpulkan uang receh di depan kereta api yang melaju. Profit kecil terus... sampai tertabrak.",
                    "Analogy: Like picking up pennies in front of a moving train. Small profits... until you get hit."
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-500" />
                {t("Risiko Eksponensial", "Exponential Risk")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                {t(
                  "Perbandingan kebutuhan lot antara Linear Averaging vs Martingale:",
                  "Comparison of lot requirements between Linear Averaging vs Martingale:"
                )}
              </p>
              <ExponentialTable t={t} />
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">Linear Averaging</span>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("Risiko terkendali, pertumbuhan linear", "Controlled risk, linear growth")}
                  </p>
                </div>
                <div className="p-4 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-medium text-rose-700 dark:text-rose-300">Martingale</span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {t("Risiko eksponensial, potensi margin call tinggi", "Exponential risk, high margin call potential")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                {t("Bias Psikologis Trader", "Trader Psychological Biases")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-md">
                  <h4 className="font-medium text-foreground mb-2">1. Overconfidence Bias</h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Merasa 'pasti balik' setelah beberapa kali berhasil recovery. Padahal satu kali gagal bisa menghapus semua profit.",
                      "Feeling 'it will definitely recover' after a few successful recoveries. But one failure can wipe out all profits."
                    )}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-md">
                  <h4 className="font-medium text-foreground mb-2">2. Gambler's Fallacy</h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Percaya bahwa 'sudah waktunya harga berbalik' setelah beberapa kali loss. Pasar tidak punya memori.",
                      "Believing 'it's time for price to reverse' after several losses. The market has no memory."
                    )}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-md">
                  <h4 className="font-medium text-foreground mb-2">3. Sunk Cost Fallacy</h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Terus menambah posisi karena 'sudah terlalu banyak kerugian untuk berhenti'. Justru memperbesar risiko.",
                      "Keeping adding positions because 'too much loss to stop now'. This actually increases risk."
                    )}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-md">
                  <h4 className="font-medium text-foreground mb-2">4. Recency Bias</h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Menilai strategi berdasarkan hasil terakhir saja. Mengabaikan risiko jangka panjang.",
                      "Judging strategy based on recent results only. Ignoring long-term risks."
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5" />
                {t("Kesimpulan", "Conclusion")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              <p className="text-foreground">
                {t(
                  "Martingale Risk Guard adalah alat REM, bukan GAS.",
                  "Martingale Risk Guard is a BRAKE, not a GAS pedal."
                )}
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("Tidak ada sinyal trading", "No trading signals")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("Tidak ada rekomendasi entry", "No entry recommendations")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>{t("Tidak ada 'best strategy'", "No 'best strategy'")}</span>
                </li>
              </ul>
              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-md mt-4">
                <p className="text-emerald-700 dark:text-emerald-300 font-medium text-center">
                  {t(
                    "Hanya penilaian risiko berbasis parameter untuk edukasi dan mitigasi risiko.",
                    "Only parameter-based risk assessment for education and risk mitigation."
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="h-11 sm:h-12" data-testid="button-mulai-cek">
              <Shield className="w-5 h-5 mr-2" />
              {t("Mulai Cek Risiko", "Start Risk Check")}
            </Button>
          </Link>
        </div>

        {/* ATRIBUSI THESIS - Landasan ilmiah aplikasi */}
        <Card className="mt-10 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {t("Landasan Penelitian", "Research Foundation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <div className="p-4 bg-background/80 rounded-md border">
              <p className="font-semibold text-foreground mb-2">
                {t("Aplikasi ini dikembangkan berdasarkan:", "This application is developed based on:")}
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("Tesis Magister Manajemen", "Master of Management Thesis")}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Judul", "Title")}: </span>
                  <span className="italic">
                    "Analisis Perbandingan Strategi Martingale dan Linear Averaging pada Transaksi Gold Rolling Contract XUL10 (SPA PBK) Menggunakan Pendekatan Financial Engineering dan Behavioral Finance"
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Penulis", "Author")}: </span>
                  <span className="font-medium">Iriawan Widadi, S.Kom</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Program Studi", "Program")}: </span>
                  Magister Manajemen
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Universitas", "University")}: </span>
                  <span className="font-medium">Universitas Diponegoro (UNDIP)</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Lokasi", "Location")}: </span>
                  Semarang, Jawa Tengah, Indonesia
                </p>
                <p>
                  <span className="text-muted-foreground">{t("Tahun", "Year")}: </span>
                  2025
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">
                    {t("Disclaimer Penting", "Important Disclaimer")}
                  </p>
                  <p>
                    {t(
                      "Semua hasil analisis, skor risiko, dan rekomendasi dalam aplikasi ini dihasilkan berdasarkan metodologi, data backtesting, dan parameter yang dikembangkan dalam penelitian tesis tersebut. Hasil analisis bersifat edukatif dan tidak menjamin akurasi dalam kondisi pasar nyata. Pengguna bertanggung jawab penuh atas keputusan trading yang diambil.",
                      "All analysis results, risk scores, and recommendations in this application are generated based on the methodology, backtest data, and parameters developed in the aforementioned thesis research. Analysis results are educational in nature and do not guarantee accuracy in real market conditions. Users are fully responsible for their trading decisions."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
