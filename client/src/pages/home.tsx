import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, ChevronRight, AlertTriangle, TrendingUp, Layers, User, BarChart3, Info, Globe, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { riskInputSchema, type RiskInput, type RiskResult } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import appLogo from "@assets/logo_1766644590116.png";

function LiveRiskPreview({ score, status, isCalculating, t }: { 
  score: number | null; 
  status: string | null; 
  isCalculating: boolean;
  t: (id: string, en: string) => string;
}) {
  if (isCalculating) {
    return (
      <div className="p-4 bg-muted/50 rounded-md border border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">{t("Menghitung...", "Calculating...")}</span>
        </div>
      </div>
    );
  }

  if (score === null || status === null) {
    return (
      <div className="p-4 bg-muted/30 rounded-md border border-dashed border-border">
        <p className="text-sm text-muted-foreground text-center">
          {t("Masukkan modal untuk melihat preview risiko", "Enter capital to see risk preview")}
        </p>
      </div>
    );
  }

  const getStatusColor = () => {
    if (status === "AMAN") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300";
    if (status === "BERISIKO") return "bg-amber-400/10 border-amber-400/20 text-amber-600 dark:text-amber-300";
    return "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300";
  };

  const getStatusIcon = () => {
    if (status === "AMAN") return <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />;
    if (status === "BERISIKO") return <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />;
    return <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 dark:text-rose-400" />;
  };

  const getStatusLabel = () => {
    if (status === "AMAN") return t("RISIKO RELATIF RENDAH", "RELATIVELY LOW");
    if (status === "BERISIKO") return t("BERISIKO", "RISKY");
    return t("TIDAK LAYAK", "NOT VIABLE");
  };

  return (
    <div className={`p-4 rounded-md border ${getStatusColor()}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="text-lg sm:text-xl font-bold">{getStatusLabel()}</div>
            <div className="text-xs text-muted-foreground">{t("Preview Risiko", "Risk Preview")}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-mono font-bold">{score}</div>
          <div className="text-xs text-muted-foreground">/100</div>
        </div>
      </div>
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
        <div style={{ width: "35%" }} className="bg-emerald-400/30" />
        <div style={{ width: "25%" }} className="bg-amber-400/30" />
        <div style={{ width: "40%" }} className="bg-rose-400/30" />
      </div>
      <div 
        className="h-2 rounded-full -mt-2 transition-all duration-500"
        style={{ 
          width: `${score}%`,
          background: status === "AMAN" ? 'rgb(52 211 153)' : status === "BERISIKO" ? 'rgb(251 191 36)' : 'rgb(251 113 133)'
        }}
      />
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const form = useForm<RiskInput>({
    resolver: zodResolver(riskInputSchema),
    defaultValues: {
      modal: 0,
      targetPoin: "30",
      strategy: "Linear Averaging",
      maxLayer: "3",
      experience: "Pemula",
      marketCondition: "Sideways",
    },
  });

  const watchedValues = form.watch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (watchedValues.modal <= 0) {
      setLiveScore(null);
      setLiveStatus(null);
      setIsCalculating(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const calculateLiveRisk = async () => {
      setIsCalculating(true);
      try {
        const response = await fetch("/api/calculate-risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(watchedValues),
          signal: abortControllerRef.current?.signal,
        });
        
        if (currentRequestId !== requestIdRef.current) return;
        
        if (response.ok) {
          const result: RiskResult = await response.json();
          if (currentRequestId === requestIdRef.current) {
            setLiveScore(result.score);
            setLiveStatus(result.status);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error("Error calculating live risk:", error);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsCalculating(false);
        }
      }
    };

    const debounceTimer = setTimeout(calculateLiveRisk, 300);
    return () => {
      clearTimeout(debounceTimer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [watchedValues.modal, watchedValues.targetPoin, watchedValues.strategy, watchedValues.maxLayer, watchedValues.experience, watchedValues.marketCondition]);

  const onSubmit = async (data: RiskInput) => {
    setIsLoading(true);
    const params = new URLSearchParams({
      modal: data.modal.toString(),
      targetPoin: data.targetPoin,
      strategy: data.strategy,
      maxLayer: data.maxLayer,
      experience: data.experience,
      marketCondition: data.marketCondition,
    });
    setLocation(`/result?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12">
        <div className="flex justify-between items-center mb-4 gap-2">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
            <Shield className="w-4 h-4" />{t("Kembali ke ringkasan live", "Back to live overview")}
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
            <img src={appLogo} alt="Martingale Risk Guard Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {t("Simulasi Dasar", "Basic Simulation")}
            </h1>
          </div>
          
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            {t(
              "Asesmen risiko berbasis framework Financial Engineering dan Behavioral Finance untuk strategi Martingale vs Linear Averaging pada XUL10.",
              "Risk assessment based on Financial Engineering and Behavioral Finance frameworks for Martingale vs Linear Averaging strategies on XUL10."
            )}
          </p>
          
          <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 text-left">
              {t("Edukasi & mitigasi risiko", "For education & risk mitigation only")}
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="sticky top-0 z-50 bg-background pb-4">
            <LiveRiskPreview 
              score={liveScore} 
              status={liveStatus} 
              isCalculating={isCalculating}
              t={t}
            />
          </div>

          <Card>
            <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl">
                {t("Parameter Transaksi", "Trade Parameters")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("Ubah parameter dan lihat perubahan risiko secara langsung", "Adjust parameters and see risk changes in real-time")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
                <div className="space-y-4 sm:space-y-5 pb-4 sm:pb-5 border-b border-border">
                  <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t("Parameter Finansial", "Financial Parameters")}
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="modal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t("Modal Awal (USD)", "Initial Capital (USD)")}</FormLabel>
                        <div className="flex gap-2 flex-wrap mb-2">
                          {[100000, 200000, 300000].map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant={field.value === preset ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(preset)}
                              data-testid={`button-modal-${preset}`}
                            >
                              {preset === 200000 && <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />}
                              USD {preset.toLocaleString()}
                            </Button>
                          ))}
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("Atau masukkan nilai lain", "Or enter custom value")}
                            data-testid="input-modal"
                            className="h-10 sm:h-11"
                            min="0"
                            value={field.value === 100000 || field.value === 200000 || field.value === 300000 ? "" : (field.value || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? 0 : parseFloat(val));
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {t("Referensi optimal tesis: USD 200.000", "Thesis optimal reference: USD 200,000")}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetPoin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t("Target Poin per Siklus", "Target Points per Cycle")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-poin" className="h-10 sm:h-11">
                              <SelectValue placeholder={t("Pilih target poin", "Select target points")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">{t("30 poin - Konservatif", "30 points - Conservative")}</SelectItem>
                            <SelectItem value="40">{t("40 poin - Moderat", "40 points - Moderate")}</SelectItem>
                            <SelectItem value="50">{t("50 poin - Agresif", "50 points - Aggressive")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 sm:space-y-5 pb-4 sm:pb-5 border-b border-border">
                  <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t("Parameter Strategi", "Strategy Parameters")}
                  </h3>

                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t("Strategi", "Strategy")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-strategy" className="h-10 sm:h-11">
                              <SelectValue placeholder={t("Pilih strategi", "Select strategy")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Linear Averaging">Linear Averaging (1-2-3-4)</SelectItem>
                            <SelectItem value="Martingale">Martingale (1-2-4-8)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          {t("Batas Layer Maks", "Max Layer Limit")}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-max-layer" className="h-10 sm:h-11">
                              <SelectValue placeholder={t("Pilih batas layer", "Select layer limit")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">{t("3 layer - Konservatif", "3 layers - Conservative")}</SelectItem>
                            <SelectItem value="4">{t("4 layer - Moderat", "4 layers - Moderate")}</SelectItem>
                            <SelectItem value="5">{t("5 layer - Agresif", "5 layers - Aggressive")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t("Profil & Kondisi Pasar", "Profile & Market")}
                  </h3>

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t("Pengalaman Trading", "Trading Experience")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience" className="h-10 sm:h-11">
                              <SelectValue placeholder={t("Pilih pengalaman", "Select experience")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pemula">{t("Pemula (<1 tahun)", "Beginner (<1 year)")}</SelectItem>
                            <SelectItem value="Berpengalaman">{t("Berpengalaman (>3 tahun)", "Experienced (>3 years)")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t("Kondisi Pasar", "Market Condition")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-market-condition" className="h-10 sm:h-11">
                              <SelectValue placeholder={t("Pilih kondisi pasar", "Select market condition")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sideways">Sideways (Range-bound)</SelectItem>
                            <SelectItem value="Trending">{t("Trending (Arah kuat)", "Trending (Strong direction)")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-6 sm:mt-8 h-11 sm:h-12 text-sm sm:text-base"
                  disabled={isLoading}
                  data-testid="button-cek-risiko"
                >
                  {isLoading ? (
                    t("Menganalisis...", "Analyzing...")
                  ) : (
                    <>
                      {t("Lihat Detail Lengkap", "View Full Details")}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          </Card>
        </div>

        <div className="mt-6 sm:mt-8 text-center px-4">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-4">
            {t(
              "Aplikasi ini untuk edukasi, literasi risiko, dan mitigasi risiko. Keputusan pengguna adalah tanggung jawab masing-masing.",
              "This app is for education, risk literacy, and risk mitigation. User decisions are their own responsibility."
            )}
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <Link href="/privacy">
              <span className="text-muted-foreground hover:text-foreground underline cursor-pointer" data-testid="link-privacy">
                {t("Kebijakan Privasi", "Privacy Policy")}
              </span>
            </Link>
            <Link href="/terms">
              <span className="text-muted-foreground hover:text-foreground underline cursor-pointer" data-testid="link-terms">
                {t("Syarat & Ketentuan", "Terms & Conditions")}
              </span>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            © 2025 Martingale Risk Guard. {t("Hak cipta dilindungi.", "All rights reserved.")}
          </p>
        </div>
      </div>
    </div>
  );
}
