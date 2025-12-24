import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, ChevronRight, AlertTriangle, TrendingUp, Layers, User, BarChart3, Info } from "lucide-react";
import { riskInputSchema, type RiskInput } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

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
            <span className="block mb-2">
              Aplikasi edukasi untuk mengecek risiko strategi <strong>Martingale</strong> vs <strong>Linear Averaging</strong> pada XUL10 (Kontrak Gulir Berkala Emas Loco London).
            </span>
            <span className="block text-xs sm:text-sm text-muted-foreground/80">
              Educational app to check risk levels of Martingale vs Linear Averaging strategies on XUL10 gold rolling contracts.
            </span>
          </p>
          
          <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 text-left">
              Edukasi & mitigasi risiko | For education & risk mitigation only
            </span>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">
              Parameter Transaksi | Trade Parameters
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Masukkan parameter untuk mengecek tingkat risiko | Enter parameters to check risk level
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
                <div className="space-y-4 sm:space-y-5 pb-4 sm:pb-5 border-b border-border">
                  <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Parameter Finansial | Financial Parameters
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="modal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Modal Awal (USD) | Initial Capital</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Contoh / Example: 50000"
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
                          Referensi penelitian: USD 200.000 | Research reference: USD 200,000
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
                        <FormLabel className="text-sm">Target Poin per Siklus | Target Points per Cycle</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-poin" className="h-10 sm:h-11">
                              <SelectValue placeholder="Pilih target poin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 poin - Konservatif / Conservative</SelectItem>
                            <SelectItem value="40">40 poin - Moderat / Moderate</SelectItem>
                            <SelectItem value="50">50 poin - Agresif / Aggressive</SelectItem>
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
                    Parameter Strategi | Strategy Parameters
                  </h3>

                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Strategi | Strategy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-strategy" className="h-10 sm:h-11">
                              <SelectValue placeholder="Pilih strategi" />
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
                          Batas Layer Maks | Max Layer Limit
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-max-layer" className="h-10 sm:h-11">
                              <SelectValue placeholder="Pilih batas layer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">3 layer - Konservatif / Conservative</SelectItem>
                            <SelectItem value="4">4 layer - Moderat / Moderate</SelectItem>
                            <SelectItem value="5">5 layer - Agresif / Aggressive</SelectItem>
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
                    Profil & Kondisi Pasar | Profile & Market
                  </h3>

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Pengalaman Trading | Trading Experience</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience" className="h-10 sm:h-11">
                              <SelectValue placeholder="Pilih pengalaman" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pemula">Pemula / Beginner (&lt;1 tahun / year)</SelectItem>
                            <SelectItem value="Berpengalaman">Berpengalaman / Experienced (&gt;3 tahun / years)</SelectItem>
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
                        <FormLabel className="text-sm">Kondisi Pasar | Market Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-market-condition" className="h-10 sm:h-11">
                              <SelectValue placeholder="Pilih kondisi pasar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sideways">Sideways (Range-bound)</SelectItem>
                            <SelectItem value="Trending">Trending (Strong direction)</SelectItem>
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
                    "Menganalisis... | Analyzing..."
                  ) : (
                    <>
                      Cek Risiko | Check Risk
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
            <span className="block mb-1">
              Aplikasi ini untuk edukasi, literasi risiko, dan mitigasi risiko.
            </span>
            <span className="block text-muted-foreground/70">
              This app is for education, risk literacy, and risk mitigation. User decisions are their own responsibility.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
