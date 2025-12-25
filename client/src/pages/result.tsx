import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
  Globe,
  Save,
  GitCompare,
  Trash2,
  X,
  Edit,
  Plus
} from "lucide-react";
import type { RiskResult, RiskInput } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

// Interface untuk skenario tersimpan
interface SavedScenario {
  id: string;
  nameKey: "conservative" | "aggressive"; // Key untuk bilingual
  params: RiskInput;
  result: RiskResult;
  savedAt: number;
}

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

// Komponen penjelasan metrik untuk orang awam
function DetailedMetricCard({ 
  icon: Icon, 
  label, 
  value, 
  meaning,
  status,
  cause,
  recommendation,
  statusColor,
  t
}: { 
  icon: any; 
  label: string; 
  value: string;
  meaning: string;
  status: string;
  cause: string;
  recommendation: string;
  statusColor: "green" | "yellow" | "red";
  t: (id: string, en: string) => string;
}) {
  const colorMap = {
    green: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    },
    yellow: {
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
    },
    red: {
      bg: "bg-rose-500/10 border-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
    }
  };
  
  const colors = colorMap[statusColor];
  
  return (
    <div className={`rounded-md p-4 border ${colors.bg}`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-6 h-6 ${colors.text}`} />
        <div className="flex-1">
          <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <Badge variant="outline" className={`text-[10px] font-medium ${colors.badge}`}>
          {status}
        </Badge>
      </div>
      
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex gap-2">
          <span className="font-medium text-foreground min-w-[60px]">{t("Arti:", "Meaning:")}</span>
          <span className="text-muted-foreground">{meaning}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-foreground min-w-[60px]">{t("Sebab:", "Cause:")}</span>
          <span className="text-muted-foreground">{cause}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-foreground min-w-[60px]">{t("Saran:", "Advice:")}</span>
          <span className={`${colors.text} font-medium`}>{recommendation}</span>
        </div>
      </div>
    </div>
  );
}

// Helper function untuk mendapatkan penjelasan metrik
function getMetricExplanation(
  metricType: "pf" | "rom" | "er" | "mc",
  value: number | string,
  params: { strategy: string; targetPoin: string; modal: number; maxLayer: string; marketCondition: string },
  t: (id: string, en: string) => string
): { meaning: string; status: string; cause: string; recommendation: string; statusColor: "green" | "yellow" | "red" } {
  
  if (metricType === "pf") {
    const pf = typeof value === "string" ? parseFloat(value) : value;
    if (pf >= 3) {
      return {
        meaning: t(
          `Dengan ${params.strategy} + ${params.targetPoin}pts pada kondisi ${params.marketCondition}, setiap Rp1 kerugian menghasilkan Rp${pf.toFixed(1)} keuntungan`, 
          `With ${params.strategy} + ${params.targetPoin}pts in ${params.marketCondition} condition, every $1 loss generates $${pf.toFixed(1)} profit`
        ),
        status: t("Bagus", "Good"),
        cause: t(
          `Data backtesting tesis menunjukkan kombinasi ini produktif pada kondisi ${params.marketCondition}`, 
          `Thesis backtest data shows this combination is productive in ${params.marketCondition} condition`
        ),
        recommendation: t("Pertahankan parameter - jangan ubah tanpa alasan kuat", "Maintain parameters - don't change without strong reason"),
        statusColor: "green"
      };
    } else if (pf >= 1) {
      return {
        meaning: t(
          `${params.strategy} + ${params.targetPoin}pts masih untung tipis (PF ${pf.toFixed(2)}) - margin error kecil`, 
          `${params.strategy} + ${params.targetPoin}pts still slightly profitable (PF ${pf.toFixed(2)}) - small margin of error`
        ),
        status: t("Hati-hati", "Caution"),
        cause: t(
          `Target ${params.targetPoin}pts dengan ${params.strategy} pada kondisi ${params.marketCondition} kurang optimal`, 
          `${params.targetPoin}pts target with ${params.strategy} in ${params.marketCondition} condition is suboptimal`
        ),
        recommendation: t("Pertimbangkan Linear Averaging + 30pts untuk stabilitas", "Consider Linear Averaging + 30pts for stability"),
        statusColor: "yellow"
      };
    } else {
      return {
        meaning: t(
          `RUGI BERSIH: ${params.strategy} + ${params.targetPoin}pts pada kondisi ${params.marketCondition} menghasilkan kerugian lebih besar dari keuntungan`, 
          `NET LOSS: ${params.strategy} + ${params.targetPoin}pts in ${params.marketCondition} condition generates losses exceeding profits`
        ),
        status: t("Buruk", "Poor"),
        cause: t(
          `Kombinasi parameter Anda tidak sesuai data backtesting tesis untuk kondisi pasar ini`, 
          `Your parameter combination doesn't match thesis backtest data for this market condition`
        ),
        recommendation: t("SEGERA ganti ke Linear Averaging + 30pts + Sideways", "IMMEDIATELY switch to Linear Averaging + 30pts + Sideways"),
        statusColor: "red"
      };
    }
  }
  
  if (metricType === "rom") {
    const rom = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
    const modalRatio = params.modal / 200000;
    if (rom >= 300) {
      return {
        meaning: t(
          `Modal USD ${params.modal.toLocaleString()} dengan ${params.strategy} + ${params.targetPoin}pts berpotensi return ${rom.toFixed(0)}%`, 
          `USD ${params.modal.toLocaleString()} capital with ${params.strategy} + ${params.targetPoin}pts potentially returns ${rom.toFixed(0)}%`
        ),
        status: t("Sangat Baik", "Excellent"),
        cause: t(
          `Rasio modal ${(modalRatio * 100).toFixed(0)}% dari optimal (USD 200.000) memberikan efisiensi tinggi`, 
          `${(modalRatio * 100).toFixed(0)}% capital ratio from optimal (USD 200,000) provides high efficiency`
        ),
        recommendation: t("Pertahankan - kombinasi modal dan strategi Anda sudah efisien", "Maintain - your capital and strategy combination is efficient"),
        statusColor: "green"
      };
    } else if (rom >= 100) {
      return {
        meaning: t(
          `Return ${rom.toFixed(0)}% dengan modal USD ${params.modal.toLocaleString()} - masih wajar untuk ${params.strategy}`, 
          `${rom.toFixed(0)}% return with USD ${params.modal.toLocaleString()} capital - still reasonable for ${params.strategy}`
        ),
        status: t("Cukup", "Adequate"),
        cause: t(
          `Modal ${(modalRatio * 100).toFixed(0)}% dari optimal membatasi potensi return`, 
          `${(modalRatio * 100).toFixed(0)}% of optimal capital limits return potential`
        ),
        recommendation: t("Tambah modal ke USD 200.000 untuk memaksimalkan ROM", "Increase capital to USD 200,000 to maximize ROM"),
        statusColor: "yellow"
      };
    } else {
      return {
        meaning: t(
          `Return hanya ${rom.toFixed(0)}% - modal USD ${params.modal.toLocaleString()} tidak bekerja efisien untuk ${params.strategy}`, 
          `Only ${rom.toFixed(0)}% return - USD ${params.modal.toLocaleString()} capital not working efficiently for ${params.strategy}`
        ),
        status: t("Rendah", "Low"),
        cause: t(
          `Modal terlalu jauh dari optimal (hanya ${(modalRatio * 100).toFixed(0)}%)`, 
          `Capital too far from optimal (only ${(modalRatio * 100).toFixed(0)}%)`
        ),
        recommendation: t("Tambah modal signifikan atau ganti ke strategi lebih hemat modal", "Add significant capital or switch to more capital-efficient strategy"),
        statusColor: "red"
      };
    }
  }
  
  if (metricType === "er") {
    const er = typeof value === "string" ? parseFloat(value) : value;
    if (er >= 1) {
      return {
        meaning: t(
          `${params.strategy} + ${params.targetPoin}pts pada kondisi ${params.marketCondition} bekerja di atas rata-rata (ER ${er.toFixed(2)})`, 
          `${params.strategy} + ${params.targetPoin}pts in ${params.marketCondition} condition works above average (ER ${er.toFixed(2)})`
        ),
        status: t("Efisien", "Efficient"),
        cause: t(
          `Data backtesting tesis menunjukkan kombinasi ini optimal untuk kondisi ${params.marketCondition}`, 
          `Thesis backtest data shows this combination is optimal for ${params.marketCondition} condition`
        ),
        recommendation: t("Lanjutkan parameter - sudah sesuai rekomendasi tesis", "Continue parameters - already matches thesis recommendation"),
        statusColor: "green"
      };
    } else if (er >= 0.7) {
      return {
        meaning: t(
          `Efisiensi ${params.strategy} + ${params.targetPoin}pts masih wajar (ER ${er.toFixed(2)}) tapi bisa ditingkatkan`, 
          `${params.strategy} + ${params.targetPoin}pts efficiency still reasonable (ER ${er.toFixed(2)}) but can be improved`
        ),
        status: t("Sedang", "Moderate"),
        cause: t(
          `Kondisi ${params.marketCondition} tidak sepenuhnya optimal untuk ${params.strategy} berdasarkan data tesis`, 
          `${params.marketCondition} condition not fully optimal for ${params.strategy} based on thesis data`
        ),
        recommendation: t("Pertimbangkan kondisi Sideways untuk efisiensi lebih tinggi", "Consider Sideways condition for higher efficiency"),
        statusColor: "yellow"
      };
    } else {
      return {
        meaning: t(
          `${params.strategy} + ${params.targetPoin}pts pada kondisi ${params.marketCondition} sangat tidak efisien (ER ${er.toFixed(2)})`, 
          `${params.strategy} + ${params.targetPoin}pts in ${params.marketCondition} condition is very inefficient (ER ${er.toFixed(2)})`
        ),
        status: t("Tidak Efisien", "Inefficient"),
        cause: t(
          `Data tesis menunjukkan kombinasi parameter Anda tidak cocok untuk kondisi pasar ini`, 
          `Thesis data shows your parameter combination doesn't match this market condition`
        ),
        recommendation: t("Ganti ke Linear Averaging + 30pts + Sideways sesuai rekomendasi tesis", "Switch to Linear Averaging + 30pts + Sideways per thesis recommendation"),
        statusColor: "red"
      };
    }
  }
  
  // MC Risk
  const mcText = typeof value === "string" ? value.toLowerCase() : "";
  const modalRatioMc = params.modal / 200000;
  if (mcText.includes("rendah") || mcText.includes("low") || mcText.includes("very low")) {
    return {
      meaning: t(
        `Modal USD ${params.modal.toLocaleString()} dengan ${params.maxLayer} layer cukup aman dari margin call`, 
        `USD ${params.modal.toLocaleString()} capital with ${params.maxLayer} layers is relatively safe from margin call`
      ),
      status: t("Aman", "Safe"),
      cause: t(
        `Rasio modal ${(modalRatioMc * 100).toFixed(0)}% dari optimal memberikan buffer yang cukup untuk ${params.strategy}`, 
        `${(modalRatioMc * 100).toFixed(0)}% capital ratio from optimal provides sufficient buffer for ${params.strategy}`
      ),
      recommendation: t("Pertahankan disiplin - jangan tambah layer melebihi batas", "Maintain discipline - don't add layers beyond limit"),
      statusColor: "green"
    };
  } else if (mcText.includes("sedang") || mcText.includes("medium")) {
    return {
      meaning: t(
        `Modal USD ${params.modal.toLocaleString()} dengan ${params.strategy} + ${params.maxLayer} layer berisiko margin call jika pasar bergerak ekstrem`, 
        `USD ${params.modal.toLocaleString()} with ${params.strategy} + ${params.maxLayer} layers risks margin call if market moves extremely`
      ),
      status: t("Waspada", "Alert"),
      cause: t(
        `${params.maxLayer} layer memerlukan modal lebih besar untuk floating loss maksimum`, 
        `${params.maxLayer} layers require larger capital for maximum floating loss`
      ),
      recommendation: t(`Kurangi ke ${parseInt(params.maxLayer) - 1} layer atau tambah modal ke USD 200.000`, `Reduce to ${parseInt(params.maxLayer) - 1} layers or increase capital to USD 200,000`),
      statusColor: "yellow"
    };
  } else {
    return {
      meaning: t(
        `BAHAYA: ${params.strategy} dengan ${params.maxLayer} layer dan modal USD ${params.modal.toLocaleString()} sangat rentan margin call`, 
        `DANGER: ${params.strategy} with ${params.maxLayer} layers and USD ${params.modal.toLocaleString()} capital is very vulnerable to margin call`
      ),
      status: t("Bahaya", "Danger"),
      cause: t(
        `Data tesis menunjukkan kombinasi ${params.strategy} + ${params.maxLayer} layer + kondisi ${params.marketCondition} pernah mengalami margin call`, 
        `Thesis data shows ${params.strategy} + ${params.maxLayer} layers + ${params.marketCondition} condition has experienced margin call`
      ),
      recommendation: t("SEGERA: Ganti ke Linear Averaging + 3 layer + tambah modal", "IMMEDIATELY: Switch to Linear Averaging + 3 layers + increase capital"),
      statusColor: "red"
    };
  }
}

function parseLocalizedText(text: string, language: "id" | "en"): string {
  if (text.includes(" | ")) {
    const parts = text.split(" | ");
    return language === "id" ? parts[0] : parts[1] || parts[0];
  }
  return text;
}

export default function Result() {
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const searchParams = new URLSearchParams(window.location.search);
  
  // State untuk fitur Compare Scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  
  // Load saved scenarios dari localStorage saat mount
  useEffect(() => {
    const saved = localStorage.getItem("riskcheck_scenarios");
    if (saved) {
      try {
        setSavedScenarios(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load scenarios");
      }
    }
  }, []);
  
  // Save ke localStorage ketika scenarios berubah
  useEffect(() => {
    if (savedScenarios.length > 0) {
      localStorage.setItem("riskcheck_scenarios", JSON.stringify(savedScenarios));
    } else {
      localStorage.removeItem("riskcheck_scenarios");
    }
  }, [savedScenarios]);
  
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

  // Helper untuk translate nama skenario
  const getScenarioName = (key: "conservative" | "aggressive") => {
    return key === "conservative" 
      ? t("Skenario Konservatif", "Conservative Scenario")
      : t("Skenario Agresif", "Aggressive Scenario");
  };
  
  // Helper untuk translate status
  const getStatusLabel = (status: string) => {
    if (status === "AMAN") return t("AMAN", "SAFE");
    if (status === "BERISIKO") return t("BERISIKO", "RISKY");
    return t("TIDAK LAYAK", "NOT VIABLE");
  };

  // Helper functions untuk scenario management
  const saveScenario = (nameKey: "conservative" | "aggressive") => {
    if (!result) return;
    if (savedScenarios.length >= 2) {
      // Hapus yang paling lama jika sudah ada 2
      setSavedScenarios(prev => [...prev.slice(1), {
        id: Date.now().toString(),
        nameKey,
        params,
        result,
        savedAt: Date.now()
      }]);
    } else {
      setSavedScenarios(prev => [...prev, {
        id: Date.now().toString(),
        nameKey,
        params,
        result,
        savedAt: Date.now()
      }]);
    }
  };

  const deleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  };

  const clearAllScenarios = () => {
    setSavedScenarios([]);
    setShowCompare(false);
  };

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
            variant="default"
            onClick={() => setLanguage(language === "id" ? "en" : "id")}
            className="gap-2"
            data-testid="button-language-toggle"
          >
            <Globe className="w-4 h-4" />
            {language === "id" ? "English" : "Indonesia"}
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
          
          {result.status === "AMAN" && (
            <p className="mt-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-md px-3 py-2 max-w-md mx-auto">
              {t(
                "Status AMAN tidak berarti bebas risiko. Tetap disiplin dan pahami batas eksposur.",
                "Safe status doesn't mean risk-free. Stay disciplined and understand exposure limits."
              )}
            </p>
          )}
          
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
            
            {/* Tombol Simpan & Bandingkan Skenario */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  data-testid="button-buat-skenario-top"
                >
                  <Plus className="w-4 h-4" />
                  {t("Buat Skenario", "Create Scenario")}
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nameKey = savedScenarios.length === 0 ? "conservative" : "aggressive";
                  saveScenario(nameKey);
                }}
                className="gap-2"
                data-testid="button-save-scenario"
              >
                <Save className="w-4 h-4" />
                {t("Simpan Skenario", "Save Scenario")} ({savedScenarios.length}/2)
              </Button>
              
              {savedScenarios.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="gap-2"
                  data-testid="button-add-next-scenario"
                >
                  <Plus className="w-4 h-4" />
                  {t("Tambah Skenario Berikutnya", "Add Next Scenario")}
                </Button>
              )}
              
              {savedScenarios.length >= 2 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowCompare(true)}
                  className="gap-2"
                  data-testid="button-compare-scenarios"
                >
                  <GitCompare className="w-4 h-4" />
                  {t("Bandingkan", "Compare")}
                </Button>
              )}
              
              {savedScenarios.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllScenarios}
                  className="gap-2 text-muted-foreground"
                  data-testid="button-clear-scenarios"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("Hapus Semua", "Clear All")}
                </Button>
              )}
            </div>
            
            {/* Indikator skenario tersimpan */}
            {savedScenarios.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {savedScenarios.map((scenario, idx) => (
                  <Badge 
                    key={scenario.id} 
                    variant="secondary" 
                    className="text-xs gap-1"
                  >
                    {getScenarioName(scenario.nameKey)}: {scenario.result.score}/100
                    <button 
                      onClick={() => deleteScenario(scenario.id)}
                      className="ml-1 opacity-60 hover:opacity-100"
                      data-testid={`button-delete-scenario-${idx}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {result.metrics && (
          <>
            {/* PARAMETER ANALISIS - Tampilkan semua skenario yang tersimpan */}
            {savedScenarios.length >= 2 ? (
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-primary" />
                    <span>{t("Parameter Kedua Skenario", "Parameters of Both Scenarios")}</span>
                  </CardTitle>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {t("Klik Bandingkan untuk melihat perbandingan lengkap", "Click Compare to see full comparison")}
                  </p>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-0">
                  <div className="grid md:grid-cols-2 gap-3">
                    {savedScenarios.map((scenario) => {
                      const bgClass = scenario.result.status === "AMAN" 
                        ? "border-emerald-500/30 bg-emerald-500/5" 
                        : scenario.result.status === "BERISIKO" 
                          ? "border-amber-500/30 bg-amber-500/5" 
                          : "border-rose-500/30 bg-rose-500/5";
                      return (
                        <div key={scenario.id} className={`rounded-md p-3 border ${bgClass}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{getScenarioName(scenario.nameKey)}</span>
                            <span className="font-mono font-bold">{scenario.result.score}/100</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">{t("Modal", "Capital")}: </span>
                              <span className="font-medium">USD {scenario.params.modal.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("Strategi", "Strategy")}: </span>
                              <span className="font-medium">{scenario.params.strategy}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Target: </span>
                              <span className="font-medium">{scenario.params.targetPoin}pts</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Layer: </span>
                              <span className="font-medium">{scenario.params.maxLayer}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("Pasar", "Market")}: </span>
                              <span className="font-medium">{scenario.params.marketCondition}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("Exp", "Exp")}: </span>
                              <span className="font-medium">{scenario.params.experience === "Pemula" ? t("Pemula", "Beginner") : t("Berpengalaman", "Exp")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card 
                className="mb-4 border-primary/30 bg-primary/5 cursor-pointer hover-elevate transition-all"
                onClick={() => setLocation("/")}
                data-testid="card-parameters-edit"
              >
                <CardHeader className="pb-2 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    <span>{t("Parameter Analisis Anda", "Your Analysis Parameters")}</span>
                    <Edit className="w-4 h-4 text-muted-foreground ml-auto" />
                  </CardTitle>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {t("Klik untuk mengubah parameter", "Click to edit parameters")}
                  </p>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs sm:text-sm">
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Modal", "Capital")}</div>
                      <div className="font-semibold">USD {params.modal.toLocaleString()}</div>
                    </div>
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Strategi", "Strategy")}</div>
                      <div className="font-semibold">{params.strategy}</div>
                    </div>
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Target", "Target")}</div>
                      <div className="font-semibold">{params.targetPoin} pts</div>
                    </div>
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Maks Layer", "Max Layer")}</div>
                      <div className="font-semibold">{params.maxLayer} layer</div>
                    </div>
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Kondisi Pasar", "Market Condition")}</div>
                      <div className="font-semibold">{params.marketCondition}</div>
                    </div>
                    <div className="bg-background rounded-md p-2 border">
                      <div className="text-muted-foreground text-[10px]">{t("Pengalaman", "Experience")}</div>
                      <div className="font-semibold">{params.experience === "Pemula" ? t("Pemula", "Beginner") : t("Berpengalaman", "Experienced")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BENCHMARK TESIS - PF & ER (tetap untuk kombinasi strategi + target) */}
            <Card className="mb-4">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>{t("Benchmark Tesis", "Thesis Benchmark")}</span>
                </CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {t(
                    `Metrik produktivitas untuk ${params.strategy} + ${params.targetPoin}pts (data backtesting tesis 2024-2025)`,
                    `Productivity metrics for ${params.strategy} + ${params.targetPoin}pts (thesis backtest data 2024-2025)`
                  )}
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {(() => {
                    const pfExpl = getMetricExplanation("pf", result.metrics.expectedPF, params, t);
                    return (
                      <DetailedMetricCard 
                        icon={TrendingUp} 
                        label="Profit Factor (PF)" 
                        value={result.metrics.expectedPF}
                        meaning={pfExpl.meaning}
                        status={pfExpl.status}
                        cause={pfExpl.cause}
                        recommendation={pfExpl.recommendation}
                        statusColor={pfExpl.statusColor}
                        t={t}
                      />
                    );
                  })()}
                  {(() => {
                    const erExpl = getMetricExplanation("er", result.metrics.expectedER, params, t);
                    return (
                      <DetailedMetricCard 
                        icon={Target} 
                        label="Efficiency Ratio (ER)" 
                        value={result.metrics.expectedER}
                        meaning={erExpl.meaning}
                        status={erExpl.status}
                        cause={erExpl.cause}
                        recommendation={erExpl.recommendation}
                        statusColor={erExpl.statusColor}
                        t={t}
                      />
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
            
            {/* METRIK DISESUAIKAN MODAL - ROM & MC Risk (berubah berdasarkan modal) */}
            <Card className="mb-6">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span>{t("Metrik Berdasarkan Modal Anda", "Your Capital-Based Metrics")}</span>
                </CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {t(
                    `Disesuaikan dengan modal USD ${params.modal.toLocaleString()} (referensi optimal tesis: USD 200.000)`,
                    `Adjusted for USD ${params.modal.toLocaleString()} capital (thesis optimal reference: USD 200,000)`
                  )}
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {(() => {
                    const romExpl = getMetricExplanation("rom", result.metrics.expectedROM, params, t);
                    return (
                      <DetailedMetricCard 
                        icon={Percent} 
                        label="Return on Margin (ROM)" 
                        value={result.metrics.expectedROM}
                        meaning={romExpl.meaning}
                        status={romExpl.status}
                        cause={romExpl.cause}
                        recommendation={romExpl.recommendation}
                        statusColor={romExpl.statusColor}
                        t={t}
                      />
                    );
                  })()}
                  {(() => {
                    const mcValue = parseLocalizedText(result.metrics.marginCallRisk, language);
                    const mcExpl = getMetricExplanation("mc", mcValue, params, t);
                    return (
                      <DetailedMetricCard 
                        icon={AlertTriangle} 
                        label={t("Risiko Margin Call", "Margin Call Risk")}
                        value={mcValue}
                        meaning={mcExpl.meaning}
                        status={mcExpl.status}
                        cause={mcExpl.cause}
                        recommendation={mcExpl.recommendation}
                        statusColor={mcExpl.statusColor}
                        t={t}
                      />
                    );
                  })()}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-4 text-center">
                  {t("Referensi optimal: USD 200.000 (Tesis Iriawan, UNDIP 2025)", "Optimal reference: USD 200,000 (Iriawan Thesis, UNDIP 2025)")}
                </p>
              </CardContent>
            </Card>
          </>
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

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/">
            <Button size="lg" className="h-11 sm:h-12 text-sm sm:text-base" data-testid="button-buat-skenario">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t("Buat Skenario Baru", "Create New Scenario")}
            </Button>
          </Link>
          <Link href="/literasi">
            <Button variant="outline" size="lg" className="h-11 sm:h-12 text-sm sm:text-base" data-testid="button-literasi-result">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t("Literasi Risiko", "Risk Literacy")}
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
      
      {/* Modal Perbandingan Skenario */}
      {showCompare && savedScenarios.length >= 2 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-primary" />
                {t("Perbandingan Skenario", "Scenario Comparison")}
              </CardTitle>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setShowCompare(false)}
                data-testid="button-close-compare"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {savedScenarios.map((scenario, idx) => {
                  const bgClass = scenario.result.status === "AMAN" 
                    ? "bg-emerald-500/5 border-emerald-500/20" 
                    : scenario.result.status === "BERISIKO" 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-rose-500/5 border-rose-500/20";
                  
                  const badgeClass = scenario.result.status === "AMAN"
                    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : scenario.result.status === "BERISIKO"
                      ? "text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "text-rose-600 dark:text-rose-400 border-rose-500/30";
                  
                  return (
                    <div 
                      key={scenario.id} 
                      className={`p-4 rounded-md border ${bgClass}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{getScenarioName(scenario.nameKey)}</h3>
                        <Badge 
                          variant="outline" 
                          className={badgeClass}
                        >
                          {getStatusLabel(scenario.result.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-3xl font-mono font-bold text-foreground mb-3">
                        {scenario.result.score}<span className="text-lg text-muted-foreground">/100</span>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wide mb-1">
                          {t("Parameter", "Parameters")}
                        </p>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Modal", "Capital")}:</span>
                          <span className="font-medium">USD {scenario.params.modal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Strategi", "Strategy")}:</span>
                          <span className="font-medium">{scenario.params.strategy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-medium">{scenario.params.targetPoin} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Layer:</span>
                          <span className="font-medium">{scenario.params.maxLayer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Kondisi Pasar", "Market")}:</span>
                          <span className="font-medium">{scenario.params.marketCondition}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("Pengalaman", "Experience")}:</span>
                          <span className="font-medium">{scenario.params.experience === "Pemula" ? t("Pemula", "Beginner") : t("Berpengalaman", "Experienced")}</span>
                        </div>
                        
                        {scenario.result.metrics && (
                          <>
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">PF:</span>
                              <span className="font-medium">{scenario.result.metrics.expectedPF}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ROM:</span>
                              <span className="font-medium">{scenario.result.metrics.expectedROM}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ER:</span>
                              <span className="font-medium">{scenario.result.metrics.expectedER}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Kesimpulan perbandingan */}
              <div className="mt-4 p-4 bg-muted/50 rounded-md">
                <h4 className="font-medium text-sm mb-2">{t("Kesimpulan", "Conclusion")}</h4>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const s1 = savedScenarios[0];
                    const s2 = savedScenarios[1];
                    const better = s1.result.score <= s2.result.score ? s1 : s2;
                    const diff = Math.abs(s1.result.score - s2.result.score);
                    const betterName = getScenarioName(better.nameKey);
                    
                    return t(
                      `${betterName} memiliki risiko lebih rendah dengan selisih ${diff} poin. Pertimbangkan parameter ini untuk manajemen risiko yang lebih baik.`,
                      `${betterName} has lower risk with a ${diff} point difference. Consider these parameters for better risk management.`
                    );
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
