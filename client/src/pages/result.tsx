import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
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
  RotateCcw
} from "lucide-react";
import type { RiskResult, RiskInput } from "@shared/schema";

function RiskScoreMeter({ score, status }: { score: number; status: string }) {
  const getStatusColor = () => {
    if (status === "AMAN") return "bg-green-500";
    if (status === "BERISIKO") return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
        <div className="flex-1 bg-green-500/20 dark:bg-green-500/30" />
        <div className="flex-1 bg-amber-500/20 dark:bg-amber-500/30" />
        <div className="flex-1 bg-red-500/20 dark:bg-red-500/30" />
      </div>
      <div 
        className="absolute top-0 h-4 rounded-full transition-all duration-700 ease-out"
        style={{ 
          width: `${score}%`,
          background: `linear-gradient(to right, 
            ${score <= 39 ? 'rgb(34 197 94)' : score <= 69 ? 'rgb(245 158 11)' : 'rgb(239 68 68)'}, 
            ${score <= 39 ? 'rgb(34 197 94)' : score <= 69 ? 'rgb(245 158 11)' : 'rgb(239 68 68)'})`
        }}
      />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>AMAN (0-39)</span>
        <span>BERISIKO (40-69)</span>
        <span>TIDAK LAYAK (70-100)</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "AMAN") {
    return (
      <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-md">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        <span className="text-3xl font-bold text-green-700 dark:text-green-300">AMAN</span>
      </div>
    );
  }
  if (status === "BERISIKO") {
    return (
      <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md">
        <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        <span className="text-3xl font-bold text-amber-700 dark:text-amber-300">BERISIKO</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-md">
      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      <span className="text-3xl font-bold text-red-700 dark:text-red-300">TIDAK LAYAK</span>
    </div>
  );
}

export default function Result() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Menganalisis risiko...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h2>
            <p className="text-muted-foreground mb-4">Gagal menghitung risiko. Silakan coba lagi.</p>
            <Link href="/">
              <Button data-testid="button-kembali-error">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-md">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Hasil Analisis</h1>
          </div>
          
          <StatusBadge status={result.status} />
          
          <div className="mt-8">
            <div className="text-5xl font-mono font-bold text-foreground mb-2" data-testid="text-risk-score">
              {result.score}<span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Skor Risiko</p>
            <RiskScoreMeter score={result.score} status={result.status} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Ringkasan Alasan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2" data-testid="list-reasons">
                {result.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" />
                Peringatan Utama
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2" data-testid="list-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Catatan Psikologi Trading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3" data-testid="list-psychology">
              {result.psychologyNotes.map((note, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 bg-purple-500/10 dark:bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{index + 1}</span>
                  </div>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <FileText className="w-5 h-5" />
              Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200" data-testid="text-disclaimer">
              Aplikasi ini dibuat untuk <strong>edukasi</strong>, <strong>literasi risiko</strong>, dan <strong>mitigasi risiko</strong>. 
              Keputusan transaksi sepenuhnya tanggung jawab pengguna. Tidak ada bagian aplikasi yang dimaksudkan 
              sebagai saran investasi atau instruksi transaksi. Hasil analisis ini bersifat <strong>indikatif</strong> dan 
              tidak menjamin hasil trading yang sebenarnya.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button size="lg" data-testid="button-cek-ulang">
              <RotateCcw className="w-5 h-5 mr-2" />
              Cek Ulang dengan Parameter Lain
            </Button>
          </Link>
        </div>

        <Separator className="my-8" />

        <div className="text-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Parameter yang Dianalisis</h3>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">Modal: ${params.modal.toLocaleString()}</Badge>
            <Badge variant="secondary">Target: {params.targetPoin} poin</Badge>
            <Badge variant="secondary">Strategi: {params.strategy}</Badge>
            <Badge variant="secondary">Layer: {params.maxLayer}</Badge>
            <Badge variant="secondary">{params.experience}</Badge>
            <Badge variant="secondary">Pasar: {params.marketCondition}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
