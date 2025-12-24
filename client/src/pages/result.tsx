import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowLeft, 
  Info, 
  Brain, 
  AlertOctagon,
  FileText,
  RotateCcw,
  TrendingUp,
  Percent,
  Target,
  Activity,
  Globe
} from "lucide-react";
import type { RiskResult, RiskInput } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

function RiskScoreMeter({ score, status, t }: { score: number; status: string; t: (id: string, en: string) => string }) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="h-3 sm:h-4 bg-muted rounded-full overflow-hidden flex">
        <div className="flex-1 bg-emerald-400/20 dark:bg-emerald-400/30" />
        <div className="flex-1 bg-amber-400/20 dark:bg-amber-400/30" />
        <div className="flex-1 bg-rose-400/20 dark:bg-rose-400/30" />
      </div>
      <div 
        className="absolute top-0 h-3 sm:h-4 rounded-full transition-all duration-700 ease-out"
        style={{ 
          width: `${score}%`,
          background: status === "AMAN" ? 'rgb(52 211 153)' : status === "BERISIKO" ? 'rgb(251 191 36)' : 'rgb(251 113 133)'
        }}
      />
      <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
        <span>{t("AMAN", "SAFE")}</span>
        <span>{t("BERISIKO", "RISKY")}</span>
        <span>{t("TIDAK LAYAK", "NOT VIABLE")}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (id: string, en: string) => string }) {
  if (status === "AMAN") {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-md">
        <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
        <div className="text-left">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-300 block">
            {t("AMAN", "SAFE")}
          </span>
        </div>
      </div>
    );
  }
  if (status === "BERISIKO") {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-amber-400/10 dark:bg-amber-400/20 border border-amber-400/20 rounded-md">
        <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 dark:text-amber-400" />
        <div className="text-left">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-300 block">
            {t("BERISIKO", "RISKY")}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 rounded-md">
      <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500 dark:text-rose-400" />
      <div className="text-left">
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-600 dark:text-rose-300 block">
          {t("TIDAK LAYAK", "NOT VIABLE")}
        </span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { 
  icon: any; 
  label: string; 
  value: string; 
  color: string 
}) {
  return (
    <div className="bg-muted/50 rounded-md p-3 sm:p-4 text-center">
      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 ${color}`} />
      <div className="text-lg sm:text-xl font-bold text-foreground">{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
        {label}
      </div>
    </div>
  );
}

function parseLocalizedText(text: string, language: "id" | "en"): string {
  if (text.includes(" | ")) {
    const parts = text.split(" | ");
    return language === "id" ? parts[0] : parts[1] || parts[0];
  }
  return text;
}

export default function Result() {
  const { language, setLanguage, t } = useLanguage();
  const searchParams = new URLSearchParams(window.location.search);
  
  const params: RiskInput = {
    modal: parseFloat(searchParams.get("modal") || "0"),
    targetPoin: (searchParams.get("targetPoin") as "30" | "40" | "50") || "30",
    strategy: (searchParams.get("strategy") as "Martingale" | "Linear Averaging") || "Linear Averaging",
    maxLayer: (searchParams.get("maxLayer") as "3" | "4" | "5") || "5",
    experience: (searchParams.get("experience") as "Pemula" | "Berpengalaman") || "Pemula",
    marketCondition: (searchParams.get("marketCondition") as "Sideways" | "Trending") || "Sideways",
  };

  const { data: result, isLoading, error } = useQuery<RiskResult>({
    queryKey: ["/api/calculate-risk", params],
    queryFn: async () => {
      const response = await fetch("/api/calculate-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error("Gagal menghitung risiko");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("Menganalisis risiko...", "Analyzing risk...")}
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold mb-2">
              {t("Terjadi Kesalahan", "Error Occurred")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("Gagal menghitung risiko.", "Failed to calculate risk.")}
            </p>
            <Link href="/">
              <Button data-testid="button-kembali-error">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("Kembali", "Back")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12">
        <div className="flex justify-end mb-4">
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

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-md">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                {t("Hasil Analisis", "Analysis Result")}
              </h1>
            </div>
          </div>
          
          <StatusBadge status={result.status} t={t} />
          
          <div className="mt-6 sm:mt-8">
            <div className="text-4xl sm:text-5xl font-mono font-bold text-foreground mb-2" data-testid="text-risk-score">
              {result.score}<span className="text-xl sm:text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {t("Skor Risiko", "Risk Score")}
            </p>
            <RiskScoreMeter score={result.score} status={result.status} t={t} />
            
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-md">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1.5 -mt-0.5" />
                {t(
                  "Silakan ubah parameter (target poin, layer, atau strategi) untuk melihat bagaimana risiko berubah.",
                  "Try adjusting parameters (target points, layers, or strategy) to see how risk changes."
                )}
              </p>
            </div>
          </div>
        </div>

        {result.metrics && (
          <Card className="mb-6">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span>{t("Metrik Produktivitas", "Productivity Metrics")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard 
                  icon={TrendingUp} 
                  label="Profit Factor (PF)" 
                  value={result.metrics.expectedPF} 
                  color="text-green-500"
                />
                <MetricCard 
                  icon={Percent} 
                  label="Return on Margin (ROM)" 
                  value={result.metrics.expectedROM} 
                  color="text-blue-500"
                />
                <MetricCard 
                  icon={Target} 
                  label="Efficiency Ratio (ER)" 
                  value={result.metrics.expectedER} 
                  color="text-purple-500"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  label={t("Risiko Margin Call", "Margin Call Risk")}
                  value={parseLocalizedText(result.metrics.marginCallRisk, language)} 
                  color="text-amber-500"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 text-center">
                {t("Data berdasarkan backtesting thesis 2024-2025", "Based on 2024-2025 thesis backtest data")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ANALISIS TEMUAN - Financial Engineering Framework */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <span>{t("Analisis Temuan", "Analysis Findings")}</span>
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {t("Berdasarkan framework Financial Engineering dari Tesis Iriawan (UNDIP, 2025)", "Based on Financial Engineering framework from Iriawan Thesis (UNDIP, 2025)")}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ul className="space-y-3 sm:space-y-4" data-testid="list-reasons">
              {result.reasons.map((reason, index) => {
                const text = parseLocalizedText(reason, language);
                const isEmpirical = text.includes("TEMUAN") || text.includes("EMPIRICAL") || text.includes("OPTIMAL") || text.includes("KRITIS") || text.includes("CRITICAL");
                return (
                  <li key={index} className={`flex items-start gap-2 sm:gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-md ${isEmpirical ? 'bg-primary/5 border border-primary/10' : 'bg-muted/30'}`}>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${isEmpirical ? 'bg-primary/10' : 'bg-muted'}`}>
                      <span className={`text-[10px] sm:text-xs font-mono font-bold ${isEmpirical ? 'text-primary' : 'text-muted-foreground'}`}>{index + 1}</span>
                    </div>
                    <span className="text-muted-foreground leading-relaxed">{text}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* PERINGATAN EMPIRIS - Data Backtesting */}
        {result.warnings.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-amber-500/20">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertOctagon className="w-5 h-5" />
                <span>{t("Peringatan Empiris", "Empirical Warnings")}</span>
              </CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {t("Data historis dari backtesting tesis 2024-2025", "Historical data from 2024-2025 thesis backtesting")}
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-3" data-testid="list-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm p-2 sm:p-3 bg-amber-500/5 border border-amber-500/10 rounded-md">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground leading-relaxed">{parseLocalizedText(warning, language)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* BEHAVIORAL FINANCE - Bias Psikologis */}
        <Card className="mt-4 sm:mt-6 border-purple-500/20">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Brain className="w-5 h-5" />
              <span>{t("Analisis Behavioral Finance", "Behavioral Finance Analysis")}</span>
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {t("Bias kognitif dan emosional yang memengaruhi keputusan trading", "Cognitive and emotional biases affecting trading decisions")}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ul className="space-y-3 sm:space-y-4" data-testid="list-psychology">
              {result.psychologyNotes.map((note, index) => {
                const text = parseLocalizedText(note, language);
                const biasMatch = text.match(/^([A-Za-z\s]+):/);
                const biasName = biasMatch ? biasMatch[1] : null;
                const biasDescription = biasMatch ? text.replace(biasMatch[0], '').trim() : text;
                
                return (
                  <li key={index} className="p-3 sm:p-4 bg-purple-500/5 border border-purple-500/10 rounded-md">
                    {biasName ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] sm:text-xs font-mono bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400">
                            {biasName.trim()}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {biasDescription}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-4 sm:mt-6 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <FileText className="w-5 h-5" />
              <span>Disclaimer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-200" data-testid="text-disclaimer">
              <p>
                {t(
                  "Aplikasi ini dibuat untuk edukasi, literasi risiko, dan mitigasi risiko. Keputusan transaksi sepenuhnya tanggung jawab pengguna.",
                  "This app is for education, risk literacy, and risk mitigation. Trading decisions are entirely the user's responsibility."
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="h-11 sm:h-12 text-sm sm:text-base" data-testid="button-cek-ulang">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t("Cek Ulang", "Check Again")}
            </Button>
          </Link>
        </div>

        <Separator className="my-6 sm:my-8" />

        <div className="text-center">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">
            {t("Parameter yang Dianalisis", "Analyzed Parameters")}
          </h3>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {t("Modal", "Capital")}: ${params.modal.toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">Target: {params.targetPoin} pts</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{params.strategy}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">Layer: {params.maxLayer}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {params.experience === "Pemula" ? t("Pemula", "Beginner") : t("Berpengalaman", "Experienced")}
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{params.marketCondition}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
