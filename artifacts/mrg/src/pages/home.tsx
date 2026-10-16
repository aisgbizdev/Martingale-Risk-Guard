import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MRGBrandBar } from "@/components/live/mrg-brand-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, ChevronRight, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { riskInputSchema } from "@shared/schema";
import { quoteIsFresh } from "@shared/live-types";
import { getStudyReference, getStudyWarnings } from "@shared/study-market";
import { useLanguage } from "@/lib/language-context";
import { useMarket } from "@/hooks/use-market";
import { useStudy, paramsKey, type StudyDraft } from "@/lib/study-context";
import { StudyEvidence } from "@/components/study-evidence";

const KEYS = ["modal", "targetPoin", "strategy", "maxLayer", "experience", "marketCondition"] as const;

export default function Home() {
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { draft, setDraft, setSnapshot } = useStudy();
  const market = useMarket();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ctx = market.context.isError ? null : market.context.data;
  const reference = getStudyReference(ctx, market.now, market.online);
  const set = (patch: Partial<StudyDraft>) => { setError(null); setDraft({ ...draft, ...patch }); };

  // Hydrate from URL (Back links / shared links). Never infer a D1 confirmation.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // The in-memory draft is newer than the form URL after an edit and Back.
    if (!q.has("modal") || draft.modal !== "") return;
    const fromUrl = {
      modal: q.get("modal") ?? "", targetPoin: q.get("targetPoin") ?? "30", strategy: q.get("strategy") ?? "Linear Averaging",
      maxLayer: q.get("maxLayer") ?? "3", experience: q.get("experience") ?? "Pemula", marketCondition: q.get("marketCondition") ?? "",
    };
    const same = KEYS.every((k) => k === "modal" ? Number(draft.modal) === Number(fromUrl.modal) : draft[k] === fromUrl[k]);
    if (!same) setDraft({ ...draft, ...fromUrl, d1Key: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A changed D1 evidence invalidates an earlier confirmation.
  useEffect(() => {
    if (draft.d1Key && reference.key !== draft.d1Key) {
      setDraft({ ...draft, d1Key: null, marketCondition: "" });
      setNotice(t("Data D1 berubah atau tidak lagi segar, jadi konfirmasi sebelumnya dicabut. Pilih kondisi pasar lagi.", "D1 evidence changed or is no longer fresh, so the earlier confirmation was withdrawn. Choose the market condition again."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.key, draft.d1Key]);

  const confirmD1 = () => {
    if (reference.status !== "ready" || !reference.key) return;
    setNotice(null);
    setDraft({ ...draft, marketCondition: "Trending", d1Key: reference.key });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = riskInputSchema.safeParse({ ...draft, modal: Number(draft.modal) });
    if (!draft.modal || !(Number(draft.modal) > 0)) return setError(t("Isi modal skenario dengan angka positif.", "Enter a positive scenario capital."));
    if (!draft.marketCondition) return setError(t("Pilih kondisi pasar: Sideways atau Trending.", "Choose a market condition: Sideways or Trending."));
    if (!parsed.success) return setError(t("Ada input yang belum valid. Periksa keenam isian.", "Some input is invalid. Check all six fields."));
    const capturedAt = Date.now();
    const submittedReference = getStudyReference(ctx, capturedAt, market.online);
    const confirmedD1 = !!draft.d1Key && submittedReference.status === "ready" && submittedReference.key === draft.d1Key && draft.marketCondition === "Trending";
    if (draft.d1Key && !confirmedD1) {
      setDraft({ ...draft, d1Key: null, marketCondition: "" });
      return setError(t("Konfirmasi D1 sudah tidak berlaku. Konfirmasi ulang atau pilih manual.", "The D1 confirmation no longer applies. Reconfirm or choose manually."));
    }
    const p = parsed.data;
    setSnapshot({
      paramsKey: paramsKey(p), capturedAt, reference: submittedReference,
      warnings: getStudyWarnings(ctx, capturedAt, market.online),
      calendar: ctx ? { status: ctx.calendar.status, complete: ctx.calendar.complete, generatedAt: ctx.calendar.generatedAt, receivedAt: ctx.calendar.receivedAt } : null,
      quote: market.usableQuote && quoteIsFresh(market.usableQuote, capturedAt) ? market.usableQuote : null,
      contextError: market.context.isError, confirmedD1,
    });
    const params = new URLSearchParams({
      modal: String(p.modal), targetPoin: p.targetPoin, strategy: p.strategy,
      maxLayer: p.maxLayer, experience: p.experience, marketCondition: p.marketCondition,
    });
    setLocation(`/result?${params.toString()}`);
  };

  const trendWord = reference.analysis?.trend === "up" ? t("naik", "up") : t("turun", "down");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-3 sm:px-6 sm:py-6">
        <MRGBrandBar />
        <div className="flex justify-between items-center mb-4 gap-2">
          <Link href="/live" className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold hover:bg-muted" data-testid="link-live-summary">
            <Shield className="w-4 h-4" />{t("Ringkasan pasar live (opsional)", "Live market summary (optional)")}
          </Link>
          <Button variant="default" onClick={() => setLanguage(language === "id" ? "en" : "id")} className="gap-2" data-testid="button-language-toggle">
            <Globe className="w-4 h-4" />{language === "id" ? "English" : "Indonesia"}
          </Button>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{t("Martingale vs Linear Averaging", "Martingale vs Linear Averaging")}</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed mt-2">
            {t("Simulator edukasi untuk pemula: isi enam hal, tekan Cek Risiko, dapatkan satu ringkasan. Bukan order broker, bukan sinyal entry/exit.", "Educational simulator for beginners: fill six fields, press Cek Risiko, get one summary. Not a broker order, not an entry/exit signal.")}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">{t("Edukasi & mitigasi risiko", "For education & risk mitigation only")}</span>
          </div>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">{t("Skenario Anda", "Your scenario")}</CardTitle>
            <CardDescription>{t("Tidak perlu harga, lot, ekuitas, atau catatan posisi.", "No price, lots, equity, or position records needed.")}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={submit} className="live-stack" noValidate>
              <div className="live-form-grid">
                <div className="live-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="f-modal">{t("Modal skenario (USD)", "Scenario capital (USD)")}</label>
                  <div className="flex gap-2 flex-wrap">
                    {[100000, 200000, 300000].map((v) => (
                      <Button key={v} type="button" size="sm" variant={Number(draft.modal) === v ? "default" : "outline"} onClick={() => set({ modal: String(v) })} data-testid={`button-modal-${v}`}>
                        USD {v.toLocaleString("id-ID")}
                      </Button>
                    ))}
                  </div>
                  <input id="f-modal" type="number" inputMode="decimal" min="0" step="any" value={draft.modal} onChange={(e) => set({ modal: e.target.value })} placeholder={t("Contoh: 200000", "Example: 200000")} data-testid="input-modal" aria-invalid={!!error && !(Number(draft.modal) > 0)} />
                  <span className="live-small">{t("Modal skenario untuk simulasi, bukan saldo akun dan bukan anjuran setoran. USD 200.000 hanyalah contoh dari aturan studi.", "Scenario capital for simulation, not an account balance or a recommended deposit. USD 200,000 is only an example from the study rules.")}</span>
                </div>
                <div className="live-field">
                  <label htmlFor="f-target">{t("Target poin per siklus", "Target points per cycle")}</label>
                  <select id="f-target" value={draft.targetPoin} onChange={(e) => set({ targetPoin: e.target.value })} data-testid="select-target-poin">
                    <option value="30">{t("30 poin", "30 points")}</option>
                    <option value="40">{t("40 poin", "40 points")}</option>
                    <option value="50">{t("50 poin", "50 points")}</option>
                  </select>
                  <span className="live-small">{t("Parameter studi, bukan level harga transaksi.", "A study parameter, not a trade price level.")}</span>
                </div>
                <div className="live-field">
                  <label htmlFor="f-strategy">{t("Strategi", "Strategy")}</label>
                  <select id="f-strategy" value={draft.strategy} onChange={(e) => set({ strategy: e.target.value })} data-testid="select-strategy">
                    <option value="Linear Averaging">Linear Averaging (1-2-3-4)</option>
                    <option value="Martingale">Martingale (1-2-4-8)</option>
                  </select>
                  <span className="live-small">{t("Martingale melipatgandakan ukuran; Linear menambah ukuran tetap.", "Martingale doubles size; Linear adds a fixed amount.")}</span>
                </div>
                <div className="live-field">
                  <label htmlFor="f-layer">{t("Batas layer maksimum", "Maximum layer limit")}</label>
                  <select id="f-layer" value={draft.maxLayer} onChange={(e) => set({ maxLayer: e.target.value })} data-testid="select-max-layer">
                    <option value="3">{t("3 layer", "3 layers")}</option>
                    <option value="4">{t("4 layer", "4 layers")}</option>
                    <option value="5">{t("5 layer", "5 layers")}</option>
                  </select>
                </div>
                <div className="live-field">
                  <label htmlFor="f-exp">{t("Pengalaman", "Experience")}</label>
                  <select id="f-exp" value={draft.experience} onChange={(e) => set({ experience: e.target.value })} data-testid="select-experience">
                    <option value="Pemula">{t("Pemula (kurang dari 1 tahun)", "Beginner (under 1 year)")}</option>
                    <option value="Berpengalaman">{t("Berpengalaman (lebih dari 3 tahun)", "Experienced (over 3 years)")}</option>
                  </select>
                  <span className="live-small">{t("Pengalaman 1-3 tahun: pilih Pemula untuk sementara.", "1-3 years of experience: choose Beginner for now.")}</span>
                </div>
                <div className="live-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="f-market">{t("Kondisi pasar", "Market condition")}</label>
                  <select id="f-market" value={draft.marketCondition} onChange={(e) => set({ marketCondition: e.target.value, d1Key: null })} data-testid="select-market-condition" aria-invalid={!!error && !draft.marketCondition}>
                    <option value="">{t("Pilih kondisi pasar", "Choose market condition")}</option>
                    <option value="Sideways">{t("Sideways (bergerak mendatar)", "Sideways (range-bound)")}</option>
                    <option value="Trending">{t("Trending (arah kuat)", "Trending (strong direction)")}</option>
                  </select>
                </div>
              </div>

              <section className="mrg-market-helper" aria-live="polite" data-testid="market-helper">
                <strong>{t("Saran dari data pasar (opsional)", "Suggestion from market data (optional)")}</strong>
                {reference.status === "ready" ? (
                  <>
                    <p>{t(`Referensi emas harian sedang ${trendWord} (close, MA20, MA50 searah). Ini dapat mengisi kondisi pasar sebagai Trending, hanya jika Anda setuju.`, `The daily gold reference is trending ${trendWord} (close, MA20, MA50 aligned). It can fill the market condition as Trending, only if you agree.`)}</p>
                    <p className="live-small">
                      LGD Daily · D1 · {t("candle tertutup", "closed candle")} {reference.analysis!.lastDate}
                      {" · "}{t("diterima", "received")} {new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "medium" }).format(new Date(reference.receivedAt!))} WIB.
                      {" "}{t("Emas referensi, bukan kepastian arah XUL10.", "Gold reference, not a certain XUL10 direction.")}
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={confirmD1} disabled={!!draft.d1Key && draft.marketCondition === "Trending"} data-testid="button-confirm-d1">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {draft.d1Key ? t("Trending dari D1 dikonfirmasi", "Trending from D1 confirmed") : t("Gunakan Trending dari referensi ini", "Use Trending from this reference")}
                    </Button>
                  </>
                ) : (
                  <p>{reference.status === "mixed"
                    ? t("Referensi harian campuran, belum pasti. Pilih kondisi pasar sendiri.", "The daily reference is mixed, not certain. Choose the market condition yourself.")
                    : t("Data pasar tidak tersedia atau tidak segar. Pilih kondisi pasar sendiri; perhitungan tetap bisa dijalankan.", "Market data is unavailable or not fresh. Choose the market condition yourself; the calculation still works.")}</p>
                )}
                {notice && <p role="status" className="live-error">{notice}</p>}
                <details className="live-details">
                  <summary>{t("Lihat dasar data", "See the evidence")}</summary>
                  <StudyEvidence reference={reference} warnings={getStudyWarnings(ctx, market.now, market.online)} quote={market.usableQuote} calendar={ctx ? ctx.calendar : null} />
                </details>
              </section>

              {error && <p role="alert" className="live-error" data-testid="text-form-error">{error}</p>}
              <Button type="submit" size="lg" className="w-full h-12" data-testid="button-cek-risiko">
                {t("Cek Risiko", "Cek Risiko")}<ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center px-4">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-4">
            {t("Aplikasi ini untuk edukasi, literasi risiko, dan mitigasi risiko. Keputusan pengguna adalah tanggung jawab masing-masing.", "This app is for education, risk literacy, and risk mitigation. User decisions are their own responsibility.")}
          </p>
          <div className="flex justify-center gap-4 text-xs flex-wrap">
            <Link href="/literasi" className="text-muted-foreground hover:text-foreground underline">{t("Literasi", "Literacy")}</Link>
            <Link href="/positions" className="text-muted-foreground hover:text-foreground underline">{t("Posisi", "Positions")}</Link>
            <Link href="/analysis" className="text-muted-foreground hover:text-foreground underline">{t("Analisis", "Analysis")}</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline" data-testid="link-privacy">{t("Kebijakan Privasi", "Privacy Policy")}</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground underline" data-testid="link-terms">{t("Syarat & Ketentuan", "Terms & Conditions")}</Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">© 2025 Martingale Risk Guard. {t("Hak cipta dilindungi.", "All rights reserved.")}</p>
        </div>
      </div>
    </div>
  );
}
