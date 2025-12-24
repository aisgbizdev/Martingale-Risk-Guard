import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, ChevronRight, AlertTriangle, TrendingUp, Layers, User, BarChart3, Info, Globe } from "lucide-react";
import { riskInputSchema, type RiskInput } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
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

        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-md">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Martingale Risk Guard
            </h1>
          </div>
          
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            {t(
              "Aplikasi edukasi untuk mengecek risiko strategi Martingale vs Linear Averaging pada XUL10 (Kontrak Gulir Berkala Emas Loco London).",
              "Educational app to check risk levels of Martingale vs Linear Averaging strategies on XUL10 gold rolling contracts."
            )}
          </p>
          
          <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 text-left">
              {t("Edukasi & mitigasi risiko", "For education & risk mitigation only")}
            </span>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              {t("Parameter Transaksi", "Trade Parameters")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("Masukkan parameter untuk mengecek tingkat risiko", "Enter parameters to check risk level")}
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
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("Contoh: 50000", "Example: 50000")}
                            data-testid="input-modal"
                            className="h-10 sm:h-11"
                            min="0"
                            value={field.value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? 0 : parseFloat(val));
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {t("Referensi penelitian: USD 200.000", "Research reference: USD 200,000")}
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
                      {t("Cek Risiko", "Check Risk")}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 text-center px-4">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {t(
              "Aplikasi ini untuk edukasi, literasi risiko, dan mitigasi risiko. Keputusan pengguna adalah tanggung jawab masing-masing.",
              "This app is for education, risk literacy, and risk mitigation. User decisions are their own responsibility."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
