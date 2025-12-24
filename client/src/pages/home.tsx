import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, ChevronRight, AlertTriangle, TrendingUp, Layers, User, BarChart3 } from "lucide-react";
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
      maxLayer: "5",
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
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-md">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">RiskCheck XUL10</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Aplikasi edukasi untuk mengecek risiko penggunaan strategi <strong>Martingale</strong> vs <strong>Linear Averaging</strong> pada transaksi Kontrak Gulir Berkala Emas Loco London (XUL10) dalam konteks SPA PBK.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300">Edukasi & mitigasi risiko, bukan rekomendasi transaksi</span>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">Parameter Transaksi</CardTitle>
            <CardDescription>
              Masukkan parameter untuk mengecek tingkat risiko strategi trading Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6 pb-6 border-b border-border">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Parameter Finansial
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="modal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modal Awal (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Contoh: 5000"
                            data-testid="input-modal"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetPoin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Poin per Siklus</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-poin">
                              <SelectValue placeholder="Pilih target poin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 poin (Konservatif)</SelectItem>
                            <SelectItem value="40">40 poin (Moderat)</SelectItem>
                            <SelectItem value="50">50 poin (Agresif)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6 pb-6 border-b border-border">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Parameter Strategi
                  </h3>

                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategi</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-strategy">
                              <SelectValue placeholder="Pilih strategi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Linear Averaging">Linear Averaging</SelectItem>
                            <SelectItem value="Martingale">Martingale</SelectItem>
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
                        <FormLabel className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Batas Layer Maksimal
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-max-layer">
                              <SelectValue placeholder="Pilih batas layer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">3 layer (Konservatif)</SelectItem>
                            <SelectItem value="4">4 layer (Moderat)</SelectItem>
                            <SelectItem value="5">5 layer (Agresif)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profil & Kondisi Pasar
                  </h3>

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pengalaman Trading</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-experience">
                              <SelectValue placeholder="Pilih pengalaman" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pemula">Pemula (&lt;1 tahun)</SelectItem>
                            <SelectItem value="Berpengalaman">Berpengalaman (&gt;3 tahun)</SelectItem>
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
                        <FormLabel>Kondisi Pasar</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-market-condition">
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
                  className="w-full mt-8"
                  disabled={isLoading}
                  data-testid="button-cek-risiko"
                >
                  {isLoading ? (
                    "Menganalisis..."
                  ) : (
                    <>
                      Cek Risiko
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Aplikasi ini dibuat untuk edukasi, literasi risiko, dan mitigasi risiko. 
            Keputusan transaksi sepenuhnya tanggung jawab pengguna.
          </p>
        </div>
      </div>
    </div>
  );
}
