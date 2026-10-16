import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MRGBrandBar } from "@/components/live/mrg-brand-bar";
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
import { riskInputSchema, riskStatusOptions } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import { studyStatusLabel } from "@shared/study-market";
import { useStudy, paramsKey } from "@/lib/study-context";
import { StudyEvidence } from "@/components/study-evidence";

// Interface untuk skenario tersimpan
interface SavedScenario {
  id: string;
  nameKey: "conservative" | "aggressive"; // Key untuk bilingual
  params: RiskInput;
  result: RiskResult;
  savedAt: number;
}

export function RiskScoreMeter({ score, status, t }: { score: number; status: string; t: (id: string, en: string) => string }) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="h-3 sm:h-4 bg-muted rounded-full overflow-hidden flex">
        <div style={{ width: "35%" }} className="bg-emerald-400/20 dark:bg-emerald-400/30" />
        <div style={{ width: "25%" }} className="bg-amber-400/20 dark:bg-amber-400/30" />
        <div style={{ width: "40%" }} className="bg-rose-400/20 dark:bg-rose-400/30" />
      </div>
      <div 
        className="absolute top-0 h-3 sm:h-4 rounded-full transition-all duration-700 ease-out"
        style={{ 
          width: `${score}%`,
          background: status === "AMAN" ? 'rgb(52 211 153)' : status === "BERISIKO" ? 'rgb(251 191 36)' : 'rgb(251 113 133)'
        }}
      />
      <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
        <span>{t("Rendah · relatif", "Low · relative")}</span>
        <span>{t("Sedang · relatif", "Moderate · relative")}</span>
        <span>{t("Tinggi · relatif", "High · relative")}</span>
      </div>
    </div>
  );
}

export function StatusBadge({ status, t }: { status: string; t: (id: string, en: string) => string }) {
  if (status === "AMAN") {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-md">
        <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
        <div className="text-left">
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-300 block">
            {t("RISIKO RELATIF RENDAH", "RELATIVELY LOW RISK")}
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
          {t("TIDAK LAYAK MENURUT ATURAN STUDI", "NOT VIABLE UNDER THE STUDY RULES")}
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
  status,
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
          <span className="font-medium text-foreground min-w-[60px]">{t("Konteks studi:", "Study context:")}</span>
          <span className="text-muted-foreground">{t("Angka ini berasal dari keluaran historis studi, bukan perkiraan hasil pribadi atau kondisi live.", "This figure is a historical study output, not a personal outcome forecast or live assessment.")}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-foreground min-w-[60px]">{t("Sebab:", "Cause:")}</span>
          <span className="text-muted-foreground">{t("Metrik menjelaskan parameter historis yang dipilih; spesifikasi kontrak dan kondisi aktual tidak dievaluasi di sini.", "This metric describes the selected historical parameters; contract specifications and current conditions are not assessed here.")}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-foreground min-w-[60px]">{t("Saran:", "Advice:")}</span>
          <span className={`${colors.text} font-medium`}>{t("Bukan rekomendasi. Gunakan hanya sebagai bahan membaca keluaran studi historis.", "Not a recommendation. Use only to interpret historical study output.")}</span>
        </div>
      </div>
    </div>
  );
}

// Helper function untuk mendapatkan penjelasan metrik
function getMetricExplanation(
  metricType: "pf" | "rom" | "er" | "mc",
  value: number | string,
  _params: { strategy: string; targetPoin: string; modal: number; maxLayer: string; marketCondition: string },
  t: (id: string, en: string) => string
): { meaning: string; status: string; cause: string; recommendation: string; statusColor: "green" | "yellow" | "red" } {
  const resultText = typeof value === "string" ? Number.parseFloat(value.replace("%", "")) : value;
  const number = Number.isFinite(resultText) ? resultText : null;
  const modelNote = t(
    "Keluaran aturan kalkulator lama untuk simulasi studi historis; bukan estimasi rekening atau hasil pribadi.",
    "Legacy calculator-rule output for a historical-study simulation; not an account or personal-outcome estimate."
  );
  const noAdvice = t("Bukan rekomendasi atau saran mengubah modal, strategi, atau posisi.", "Not advice to change capital, strategy, or positions.");
  const base = {
    meaning: modelNote,
    cause: t("Label mengikuti aturan model lama dan parameter simulasi yang dipilih; kondisi live tidak dinilai.", "The label follows legacy model rules and selected simulation inputs; live conditions are not assessed."),
    recommendation: noAdvice,
  };

  if (metricType === "pf") {
    return {
      ...base,
      status: t("Label PF dari aturan studi", "Study-rule PF label"),
      statusColor: number !== null && number >= 3 ? "green" : number !== null && number >= 1 ? "yellow" : "red",
    };
  }
  if (metricType === "rom") {
    return {
      ...base,
      meaning: t("ROM keluaran aturan studi; bukan proyeksi return atau ukuran margin akun.", "ROM output from study rules; not a return forecast or account-margin measure."),
      status: t("ROM keluaran aturan studi", "Study-rule ROM output"),
      statusColor: number !== null && number >= 300 ? "green" : number !== null && number >= 100 ? "yellow" : "red",
    };
  }
  if (metricType === "er") {
    return {
      ...base,
      status: t("Label ER dari aturan studi", "Study-rule ER label"),
      statusColor: number !== null && number >= 1 ? "green" : number !== null && number >= 0.7 ? "yellow" : "red",
    };
  }
  const mcText = typeof value === "string" ? value.toLowerCase() : "";
  const mcLevel = mcText.includes("rendah") || mcText.includes("low") || mcText.includes("very low")
    ? "low"
    : mcText.includes("sedang") || mcText.includes("medium") ? "moderate" : "high";
  return {
    ...base,
    meaning: t("Label MC dari aturan studi; bukan hitungan margin call aktual.", "MC label from study rules; not an actual margin-call calculation."),
    status: t("Label MC dari aturan studi", "Study-rule MC label"),
    cause: t("Spesifikasi kontrak, ekuitas, leverage, margin, dan stop-out tidak dievaluasi oleh kalkulator dasar.", "Contract specifications, equity, leverage, margin, and stop-out are not evaluated by the basic calculator."),
    statusColor: mcLevel === "low" ? "green" : mcLevel === "moderate" ? "yellow" : "red",
  };
}

const LEGACY_ADVICE = /optimal|200[.,]000|tambah modal|add capital|deposit|setoran/i;

export function StudySummary({ result, params, snapshot, language, t, compact = false }: {
  result: RiskResult; params: RiskInput; snapshot: ReturnType<typeof useStudy>["snapshot"];
  language: "id" | "en"; t: (id: string, en: string) => string; compact?: boolean;
}) {
  const mart = params.strategy === "Martingale";
  const trend = params.marketCondition === "Trending";
  const label = studyStatusLabel(result.status);
  const sentences = [
    t(`Skenario ini dinilai "${label.id}" oleh aturan studi MRG, dengan skor ${result.score} dari 100.`, `This scenario is rated "${label.en}" by the MRG study rules, with a score of ${result.score} out of 100.`),
    mart
      ? t("Martingale menggandakan ukuran setiap layer (1-2-4-8), sehingga rangkaian rugi dapat membesar dengan cepat.", "Martingale doubles each layer (1-2-4-8), so a losing sequence can grow quickly.")
      : t("Linear Averaging menambah ukuran dengan langkah tetap (1-2-3-4), jadi pertumbuhannya lebih landai daripada penggandaan, tetapi tetap bisa rugi.", "Linear Averaging adds size in fixed steps (1-2-3-4), so it grows more gently than doubling, but losses are still possible."),
    trend
      ? t("Kondisi pasar yang Anda pilih adalah Trending; arah kuat yang melawan posisi menekan strategi averaging karena layer terus bertambah.", "You chose a Trending market; a strong move against the position pressures averaging because layers keep being added.")
      : t("Kondisi pasar yang Anda pilih adalah Sideways; strategi averaging biasanya lebih tahan di pasar mendatar, tetapi pasar bisa berubah arah kapan saja.", "You chose a Sideways market; averaging usually holds up better in a flat market, but markets can break direction at any time."),
    t(`Batas ${params.maxLayer} layer membatasi jumlah penambahan, namun tidak menghilangkan risiko.`, `The ${params.maxLayer}-layer limit caps the number of additions, but does not remove the risk.`),
    t(`Modal USD ${params.modal.toLocaleString("id-ID")} adalah modal skenario untuk simulasi, bukan jaminan ketahanan akun dan bukan anjuran setoran.`, `The USD ${params.modal.toLocaleString("en-US")} capital is a simulation scenario, not a guarantee of account resilience nor a recommended deposit.`),
  ];
  const warnings = result.warnings.map(w => parseLocalizedText(w, language)).filter(w => !LEGACY_ADVICE.test(w)).slice(0, 3);
  const notes = result.psychologyNotes.map(w => parseLocalizedText(w, language)).slice(0, 4);
  const shown = compact ? sentences.slice(0, 3) : sentences;
  const warningsBox = warnings.length > 0 && (
    <div className="mrg-summary-box" data-testid="summary-warnings">
      <strong className="text-sm">{t("Peringatan penting", "Important warnings")}</strong>
      <ul className="mrg-summary-notes">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
    </div>
  );
  const notesBox = notes.length > 0 && (
    <div className="mrg-summary-box" data-testid="summary-psychology">
      <strong className="text-sm">{t("Catatan perilaku", "Behavior notes")}</strong>
      <ul className="mrg-summary-notes">{notes.map((w, i) => <li key={i}>{w}</li>)}</ul>
    </div>
  );
  const sourceBox = (
    <div className="mrg-summary-box" data-testid="summary-source">
      <strong className="text-sm">{t("Sumber, waktu, dan batas", "Source, time, and limits")}</strong>
      {snapshot ? (
        <>
          <p className="live-small" style={{ margin: "4px 0" }}>
            {snapshot.confirmedD1
              ? t("Kondisi Trending dikonfirmasi Anda dari referensi D1 di bawah.", "You confirmed the Trending condition from the D1 reference below.")
              : t("Kondisi pasar dipilih manual; ini bukan penilaian live lengkap.", "The market condition was chosen manually; this is not a complete live assessment.")}
          </p>
          <StudyEvidence reference={snapshot.reference} warnings={snapshot.warnings} quote={snapshot.quote} calendar={snapshot.calendar} frozenAt={snapshot.capturedAt} />
        </>
      ) : (
        <p className="live-small">{t("Konteks pasar tidak dipertahankan (halaman dimuat ulang atau dibuka dari tautan). Keenam input tetap dari URL dan hasil aturan studi tetap dapat dibaca; konfirmasi D1 tidak disimpulkan.", "Market context was not retained (page reloaded or opened from a link). The six inputs still come from the URL and the study-rule result is readable; no D1 confirmation is inferred.")}</p>
      )}
      <p className="live-small" style={{ marginTop: 6 }}>{t("Edukasi dan mitigasi risiko, bukan saran transaksi atau order broker. Hasil dari aturan studi historis, bukan prediksi.", "Education and risk mitigation, not trading advice or a broker order. Output of historical study rules, not a forecast.")}</p>
    </div>
  );
  return (
    <div className="mrg-summary" data-testid="study-summary">
      <p className="text-xs text-muted-foreground">{t("Skor aturan studi, bukan probabilitas rugi. Ambang: 0-35 relatif rendah, 36-60 berisiko, 61-100 tidak layak menurut aturan studi.", "Study-rule score, not a loss probability. Thresholds: 0-35 relatively low, 36-60 risky, 61-100 not viable under the study rules.")}</p>
      <div className="mrg-summary-box">
        {shown.map((x, i) => <p key={i} style={{ marginBottom: 6 }}>{x}</p>)}
      </div>
      {warningsBox}
      {compact ? (
        <details className="live-details" data-testid="summary-more">
          <summary>{t("Catatan perilaku dan sumber (opsional)", "Behavior notes and sources (optional)")}</summary>
          {notesBox}{sourceBox}
        </details>
      ) : (<>{notesBox}{sourceBox}</>)}
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
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const searchParams = new URLSearchParams(window.location.search);
  
  // State untuk fitur Compare Scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenariosLoaded, setScenariosLoaded] = useState(false);
  const [scenarioStorageError, setScenarioStorageError] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  
  // Load saved scenarios dari localStorage saat mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("riskcheck_scenarios");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length > 2 || parsed.some((item) =>
          !item || typeof item.id !== "string" || !["conservative", "aggressive"].includes(item.nameKey) ||
          !Number.isFinite(item.savedAt) || !riskInputSchema.safeParse(item.params).success ||
          !item.result || !Number.isFinite(item.result.score) || item.result.score < 0 || item.result.score > 100 ||
          !riskStatusOptions.includes(item.result.status) ||
          ["reasons", "warnings", "psychologyNotes"].some(key => !Array.isArray(item.result[key]) || item.result[key].some((value: unknown) => typeof value !== "string")) ||
          !item.result.metrics || ["expectedPF", "expectedROM", "expectedER", "marginCallRisk"].some(key => typeof item.result.metrics[key] !== "string")
        )) throw new Error("Invalid saved study scenarios");
        setSavedScenarios(parsed);
      }
    } catch { setScenarioStorageError(true); }
    setScenariosLoaded(true);
  }, []);
  
  // Persist before updating the UI; never overwrite unreadable scenarios.
  const persistScenarios = (next: SavedScenario[]) => {
    if (!scenariosLoaded || scenarioStorageError) return;
    try {
      if (next.length) localStorage.setItem("riskcheck_scenarios", JSON.stringify(next));
      else localStorage.removeItem("riskcheck_scenarios");
      setSavedScenarios(next);
    } catch { setScenarioStorageError(true); }
  };
  
  const { snapshot: rawSnapshot, draft, setDraft } = useStudy();
  const params: RiskInput = {
    modal: Number(searchParams.get("modal") || "0"),
    targetPoin: (searchParams.get("targetPoin") as "30" | "40" | "50") || "30",
    strategy: (searchParams.get("strategy") as "Martingale" | "Linear Averaging") || "Linear Averaging",
    maxLayer: (searchParams.get("maxLayer") as "3" | "4" | "5") || "3",
    experience: (searchParams.get("experience") as "Pemula" | "Berpengalaman") || "Pemula",
    marketCondition: (searchParams.get("marketCondition") || "") as "Sideways" | "Trending",
  };
  const inputsValid = ["modal", "targetPoin", "strategy", "maxLayer", "experience", "marketCondition"]
    .every(key => searchParams.has(key)) && riskInputSchema.safeParse(params).success;
  const backHref = `/?${new URLSearchParams({ modal: String(params.modal), targetPoin: params.targetPoin, strategy: params.strategy, maxLayer: params.maxLayer, experience: params.experience, marketCondition: params.marketCondition }).toString()}`;
  const snapshot = rawSnapshot && inputsValid && rawSnapshot.paramsKey === paramsKey(params) ? rawSnapshot : null;
  const inputKey = paramsKey(params);
  useEffect(() => {
    if (!inputsValid) return;
    const same = Number(draft.modal) === params.modal && draft.targetPoin === params.targetPoin &&
      draft.strategy === params.strategy && draft.maxLayer === params.maxLayer &&
      draft.experience === params.experience && draft.marketCondition === params.marketCondition;
    if (!same) setDraft({ ...params, modal: String(params.modal), d1Key: null });
    // Keep the submitted input on Back, even if the previous form URL is older.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, inputsValid]);

  const { data: result, isLoading, error, refetch } = useQuery<RiskResult>({
    enabled: inputsValid,
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
    if (status === "AMAN") return t("Risiko relatif rendah · aturan studi", "Relatively low risk · study rules");
    if (status === "BERISIKO") return t("Berisiko · aturan studi", "Risky · study rules");
    return t("Tidak layak menurut aturan studi", "Not viable under study rules");
  };

  // Helper functions untuk scenario management
  const saveScenario = (nameKey: "conservative" | "aggressive") => {
    if (!result) return;
    if (savedScenarios.length >= 2) {
      // Hapus yang paling lama jika sudah ada 2
      persistScenarios([...savedScenarios.slice(1), {
        id: Date.now().toString(),
        nameKey,
        params,
        result,
        savedAt: Date.now()
      }]);
    } else {
      persistScenarios([...savedScenarios, {
        id: Date.now().toString(),
        nameKey,
        params,
        result,
        savedAt: Date.now()
      }]);
    }
  };

  const deleteScenario = (id: string) => {
    persistScenarios(savedScenarios.filter(s => s.id !== id));
  };

  const clearAllScenarios = () => {
    if (!window.confirm(t("Hapus semua skenario studi yang tersimpan di browser ini?", "Delete all saved study scenarios in this browser?"))) return;
    persistScenarios([]);
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
              {inputsValid ? t("Gagal menghitung risiko. Tidak ada hasil pengganti yang ditampilkan.", "Failed to calculate risk. No substitute result is shown.") : t("Tautan ini belum memuat keenam input yang valid.", "This link does not contain six valid inputs.")}
            </p>
            {inputsValid && <Button variant="outline" className="mr-2" onClick={() => refetch()} data-testid="button-retry-result">{t("Coba lagi", "Retry")}</Button>}
            <Link href={backHref} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground" data-testid="button-kembali-error">
              <ArrowLeft className="w-4 h-4" />{t("Kembali", "Back")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
        <MRGBrandBar />
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
          <div className="mx-auto mb-4 max-w-2xl rounded-md border border-primary/25 bg-primary/5 px-4 py-3 text-left text-xs leading-relaxed text-muted-foreground">
            {t("Hasil memakai aturan studi historis. Referensi pasar hanya membantu memilih kondisi dan memberi peringatan, bukan mengkalibrasi ulang skor. Angka bukan perkiraan profit pribadi, margin call, atau margin safety; bukan rekomendasi menambah modal atau mengubah strategi.", "Results use historical study rules. Market references only help choose a condition and provide warnings, not recalibrate the score. Figures are not personal profit, margin-call, or margin-safety estimates; not recommendations to add capital or change strategies.")}
          </div>
          
          <StatusBadge status={result.status} t={t} />
          
          {result.status === "AMAN" && (
            <p className="mt-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-md px-3 py-2 max-w-md mx-auto">
              {t(
                "Kategori ini hanya klasifikasi relatif dari model studi historis, bukan penilaian posisi live atau klaim aman.",
                "This category is only a relative classification from a historical study model, not a live position assessment or safety claim."
              )}
            </p>
          )}
          
          <div className="mt-6 sm:mt-8">
            <div className="text-4xl sm:text-5xl font-mono font-bold text-foreground mb-2" data-testid="text-risk-score">
              {result.score}<span className="text-xl sm:text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {t("Skor aturan studi (bukan probabilitas)", "Study-rule score (not a probability)")}
            </p>
            <RiskScoreMeter score={result.score} status={result.status} t={t} />
            
            <div className="mt-6"><StudySummary result={result} params={params} snapshot={snapshot} language={language} t={t} /></div>
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-md">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1.5 -mt-0.5" />
                {t(
                  "Silakan ubah parameter (target poin, layer, atau strategi) untuk melihat bagaimana risiko berubah.",
                  "Try adjusting parameters (target points, layers, or strategy) to see how risk changes."
                )}
              </p>
            </div>
            
            {scenarioStorageError && <div role="alert" className="mt-4 rounded-md border border-destructive/30 p-3 text-sm">
              {t("Skenario lokal tidak dapat dibaca atau disimpan. Data lama tidak ditimpa; kalkulasi tetap tersedia. Jika data rusak, gunakan Reset data lokal di halaman Posisi setelah mempertimbangkan penghapusannya.", "Local study scenarios cannot be read or saved. Existing data is not overwritten; calculation remains available. For corrupt records, use Local data reset on the Positions page after considering the deletion.")}
            </div>}
            {/* Tombol Simpan & Bandingkan Skenario */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href={backHref} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" data-testid="button-buat-skenario-top">
                <Plus className="w-4 h-4" />{t("Buat Skenario", "Create Scenario")}
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
                disabled={!scenariosLoaded || scenarioStorageError}
              >
                <Save className="w-4 h-4" />
                {t("Simpan Skenario", "Save Scenario")} ({savedScenarios.length}/2)
              </Button>
              
              {savedScenarios.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(backHref)}
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

        <details className="live-details mb-4 rounded-md border border-border bg-card px-4" data-testid="details-result">
          <summary className="cursor-pointer py-3 text-sm font-semibold">{t("Detail opsional: alasan, metrik, dan parameter", "Optional details: reasons, metrics, and parameters")}</summary>
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
                onClick={() => setLocation(backHref)}
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
                    "Keluaran historis aturan studi untuk parameter terpilih (backtest tesis 2024–2025); bukan perkiraan hasil pribadi.",
                    "Historical study-rule output for the selected inputs (2024–2025 thesis backtest); not a personal outcome forecast."
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
                  <span>{t("Keluaran aturan studi · input modal", "Study-rule output · capital input")}</span>
                </CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {t(
                    `Input modal simulasi USD ${params.modal.toLocaleString()}; USD 200.000 adalah nilai acuan historis model, bukan modal optimal pribadi.`,
                    `Simulation capital input USD ${params.modal.toLocaleString()}; USD 200,000 is a historical model reference, not a personal optimal capital amount.`
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
                        label={t("ROM keluaran aturan studi", "Study-rule ROM output")}
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
                        label={t("Label MC dari aturan studi", "Study-rule MC label")}
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
                  {t("Nilai acuan historis model: USD 200.000 (Tesis Iriawan, UNDIP 2025); bukan rekomendasi modal.", "Historical model reference: USD 200,000 (Iriawan Thesis, UNDIP 2025); not a capital recommendation.")}
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
              <span>{t("Catatan keluaran aturan studi lama", "Legacy study-rule output notes")}</span>
            </CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {t("Catatan berikut berasal dari aturan kalkulator historis; bukan penilaian posisi live atau saran personal.", "The following notes come from historical calculator rules; they are not a live-position assessment or personal advice.")}
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
                    <span className="text-muted-foreground leading-relaxed">{t("Keluaran aturan studi lama:", "Legacy study-rule output:")} {text}</span>
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
                {t("Konteks historis studi 2024–2025; bukan proyeksi pribadi, kondisi live, atau jaminan margin.", "Historical 2024–2025 study context; not a personal forecast, live condition, or margin guarantee.")}
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-3" data-testid="list-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm p-2 sm:p-3 bg-amber-500/5 border border-amber-500/10 rounded-md">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground leading-relaxed">{t("Catatan historis model:", "Historical model note:")} {parseLocalizedText(warning, language)}</span>
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

        </details>

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
          <Link href={backHref} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground" data-testid="button-buat-skenario">
            <Plus className="w-5 h-5" />{t("Buat Skenario Baru", "Create New Scenario")}
          </Link>
          <Link href="/literasi" className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm" data-testid="button-literasi-result">
            <FileText className="w-5 h-5" />{t("Literasi Risiko", "Risk Literacy")}
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
                      `${betterName} menghasilkan skor aturan studi lama ${diff} poin lebih rendah pada perbandingan tersimpan; ini bukan bukti risiko personal lebih rendah atau saran memilih parameter.`,
                      `${betterName} has a ${diff}-point lower legacy study-rule score in this saved comparison; this is not evidence of lower personal risk or advice to select these inputs.`
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
