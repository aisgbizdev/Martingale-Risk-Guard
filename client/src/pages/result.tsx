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
  Activity
} from "lucide-react";
import type { RiskResult, RiskInput } from "@shared/schema";

function RiskScoreMeter({ score, status }: { score: number; status: string }) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="h-3 sm:h-4 bg-muted rounded-full overflow-hidden flex">
        <div className="flex-1 bg-green-500/20 dark:bg-green-500/30" />
        <div className="flex-1 bg-amber-500/20 dark:bg-amber-500/30" />
        <div className="flex-1 bg-red-500/20 dark:bg-red-500/30" />
      </div>
      <div 
        className="absolute top-0 h-3 sm:h-4 rounded-full transition-all duration-700 ease-out"
        style={{ 
          width: `${score}%`,
          background: status === "AMAN" ? 'rgb(34 197 94)' : status === "BERISIKO" ? 'rgb(245 158 11)' : 'rgb(239 68 68)'
        }}
      />
      <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
        <span>AMAN / SAFE</span>
        <span>BERISIKO / RISKY</span>
        <span>TIDAK LAYAK / NOT VIABLE</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "AMAN") {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-md">
        <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
        <div className="text-left">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700 dark:text-green-300 block">AMAN</span>
          <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">SAFE</span>
        </div>
      </div>
    );
  }
  if (status === "BERISIKO") {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
        <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
        <div className="text-left">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300 block">BERISIKO</span>
          <span className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">RISKY</span>
        </div>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-md">
      <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
      <div className="text-left">
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-red-700 dark:text-red-300 block">TIDAK LAYAK</span>
        <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">NOT VIABLE</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, labelEn, value, color }: { 
  icon: any; 
  label: string; 
  labelEn: string;
  value: string; 
  color: string 
}) {
  return (
    <div className="bg-muted/50 rounded-md p-3 sm:p-4 text-center">
      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 ${color}`} />
      <div className="text-lg sm:text-xl font-bold text-foreground">{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
        <span className="block">{label}</span>
        <span className="block text-muted-foreground/70">{labelEn}</span>
      </div>
    </div>
  );
}

export default function Result() {
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
            Menganalisis risiko... | Analyzing risk...
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
              Terjadi Kesalahan | Error Occurred
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Gagal menghitung risiko. | Failed to calculate risk.
            </p>
            <Link href="/">
              <Button data-testid="button-kembali-error">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali | Back
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
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-md">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Hasil Analisis</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Analysis Result</p>
            </div>
          </div>
          
          <StatusBadge status={result.status} />
          
          <div className="mt-6 sm:mt-8">
            <div className="text-4xl sm:text-5xl font-mono font-bold text-foreground mb-2" data-testid="text-risk-score">
              {result.score}<span className="text-xl sm:text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Skor Risiko | Risk Score
            </p>
            <RiskScoreMeter score={result.score} status={result.status} />
          </div>
        </div>

        {result.metrics && (
          <Card className="mb-6">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span>Metrik Produktivitas | Productivity Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard 
                  icon={TrendingUp} 
                  label="Profit Factor" 
                  labelEn="PF"
                  value={result.metrics.expectedPF} 
                  color="text-green-500"
                />
                <MetricCard 
                  icon={Percent} 
                  label="Return on Margin" 
                  labelEn="ROM"
                  value={result.metrics.expectedROM} 
                  color="text-blue-500"
                />
                <MetricCard 
                  icon={Target} 
                  label="Efficiency Ratio" 
                  labelEn="ER"
                  value={result.metrics.expectedER} 
                  color="text-purple-500"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  label="Risiko Margin Call" 
                  labelEn="MC Risk"
                  value={result.metrics.marginCallRisk} 
                  color="text-amber-500"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 text-center">
                Data berdasarkan backtesting thesis 2024-2025 | Based on 2024-2025 thesis backtest data
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <span>Ringkasan Alasan | Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-2 sm:space-y-3" data-testid="list-reasons">
                {result.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 sm:mt-2 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                <span>Peringatan | Warnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-2 sm:space-y-3" data-testid="list-warnings">
                {result.warnings.length > 0 ? result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{warning}</span>
                  </li>
                )) : (
                  <li className="text-xs sm:text-sm text-muted-foreground">
                    Tidak ada peringatan khusus. | No specific warnings.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 sm:mt-6">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <span>Catatan Psikologi | Psychology Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ul className="space-y-3" data-testid="list-psychology">
              {result.psychologyNotes.map((note, index) => (
                <li key={index} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500/10 dark:bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-medium text-purple-600 dark:text-purple-400">{index + 1}</span>
                  </div>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
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
            <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 space-y-2" data-testid="text-disclaimer">
              <p>
                Aplikasi ini dibuat untuk <strong>edukasi</strong>, <strong>literasi risiko</strong>, dan <strong>mitigasi risiko</strong>. 
                Keputusan transaksi sepenuhnya tanggung jawab pengguna.
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                This app is for <strong>education</strong>, <strong>risk literacy</strong>, and <strong>risk mitigation</strong>. 
                Trading decisions are entirely the user's responsibility.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 text-center">
          <Link href="/">
            <Button size="lg" className="h-11 sm:h-12 text-sm sm:text-base" data-testid="button-cek-ulang">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Cek Ulang | Check Again
            </Button>
          </Link>
        </div>

        <Separator className="my-6 sm:my-8" />

        <div className="text-center">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">
            Parameter yang Dianalisis | Analyzed Parameters
          </h3>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">Modal: ${params.modal.toLocaleString()}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">Target: {params.targetPoin} pts</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{params.strategy}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">Layer: {params.maxLayer}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{params.experience}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{params.marketCondition}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
