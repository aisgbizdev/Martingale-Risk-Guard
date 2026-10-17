import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RiskInput } from "@shared/schema";
import { StatusBadge, RiskScoreMeter, StudySummary } from "@/pages/result";
import { MRGBrandBar } from "@/components/live/mrg-brand-bar";

import { Button } from "@/components/ui/button";
import { Globe, AlertTriangle, CheckCircle } from "lucide-react";
import { riskInputSchema } from "@shared/schema";
import { calendarIsFresh, quoteIsFresh } from "@shared/live-types";
import { getStudyReference, getStudyWarnings } from "@shared/study-market";
import { useLanguage } from "@/lib/language-context";
import { useMarket } from "@/hooks/use-market";
import { useStudy, paramsKey, type StudyDraft } from "@/lib/study-context";
import { PwaInstall } from "@/components/live/pwa-install";
import { StudyEvidence } from "@/components/study-evidence";
import { ScenarioWorkspace } from "@/components/scenario-workspace";
import { studyRequestOptions } from "@/lib/study-request";

const KEYS = ["modal", "targetPoin", "strategy", "maxLayer", "experience", "marketCondition"] as const;

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const { draft, setDraft, snapshot: rawSnap, setSnapshot, calculatorDraft } = useStudy();
  const market = useMarket();
  const [manual, setManual] = useState(() => calculatorDraft?.mode === "manual" || new URLSearchParams(window.location.search).has("modal"));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<RiskInput | null>(null);
  const [requestRevision, setRequestRevision] = useState(0);
  const current = submitted && paramsKey(submitted) === paramsKey({ ...draft, modal: Number(draft.modal) }) ? submitted : null;
  const stale = !!submitted && !current;
  const calc = useQuery(studyRequestOptions(submitted, requestRevision));
  const resultRef = useRef<HTMLElement | null>(null);
  const justSubmitted = useRef(false);
  useEffect(() => {
    if (!justSubmitted.current || !current || !calc.data) return;
    justSubmitted.current = false;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [calc.data, current]);
  const snap = current && rawSnap && rawSnap.paramsKey === paramsKey(current) ? rawSnap : null;

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

  const fail = (message: string) => { setError(message); return false; };
  const submitStudy = (override: Partial<StudyDraft> = {}): boolean => {
    const d: StudyDraft = { ...draft, ...override };
    const parsed = riskInputSchema.safeParse({ ...d, modal: Number(d.modal) });
    if (!d.modal || !(Number(d.modal) > 0)) return fail(t("Isi modal skenario dengan angka positif.", "Enter a positive scenario capital."));
    if (!d.marketCondition) return fail(t("Pilih kondisi pasar: Sideways atau Trending.", "Choose a market condition: Sideways or Trending."));
    if (!parsed.success) return fail(t("Ada input yang belum valid. Periksa keenam isian.", "Some input is invalid. Check all six fields."));
    setError(null);
    const capturedAt = Date.now();
    const submittedReference = getStudyReference(ctx, capturedAt, market.online);
    const confirmedD1 = !!d.d1Key && submittedReference.status === "ready" && submittedReference.key === d.d1Key && d.marketCondition === "Trending";
    if (d.d1Key && !confirmedD1) {
      setDraft({ ...d, d1Key: null, marketCondition: "" });
      return fail(t("Konfirmasi D1 sudah tidak berlaku. Konfirmasi ulang atau pilih manual.", "The D1 confirmation no longer applies. Reconfirm or choose manually."));
    }
    const p = parsed.data;
    setSnapshot(structuredClone({
      paramsKey: paramsKey(p), capturedAt, reference: submittedReference,
      warnings: getStudyWarnings(ctx, capturedAt, market.online),
      calendar: ctx ? { status: ctx.calendar.status, complete: ctx.calendar.complete, generatedAt: ctx.calendar.generatedAt, receivedAt: ctx.calendar.receivedAt } : null,
      quote: market.usableQuote && quoteIsFresh(market.usableQuote, capturedAt) ? market.usableQuote : null,
      contextError: market.context.isError, confirmedD1,
    }));
    const params = new URLSearchParams({
      modal: String(p.modal), targetPoin: p.targetPoin, strategy: p.strategy,
      maxLayer: p.maxLayer, experience: p.experience, marketCondition: p.marketCondition,
    });
    setSubmitted(p);
    setRequestRevision(revision => revision + 1);
    window.history.replaceState(window.history.state, "", `?${params.toString()}`);
    justSubmitted.current = true;
    return true;
  };

  const liveWarnings = getStudyWarnings(ctx, market.now, market.online);
  const calendarFresh = market.online && calendarIsFresh(ctx?.calendar, market.now);
  const trendWord = reference.analysis?.trend === "up" ? t("naik", "up") : t("turun", "down");

  const studyFields = (
    <div className="live-stack" data-testid="study-fields">
      <div className="live-form-grid">
        <div className="live-field">
          <label htmlFor="f-target">{t("Target poin per siklus", "Target points per cycle")}</label>
          <select id="f-target" value={draft.targetPoin} onChange={(e) => set({ targetPoin: e.target.value })} data-testid="select-target-poin">
            <option value="30">{t("30 poin", "30 points")}</option>
            <option value="40">{t("40 poin", "40 points")}</option>
            <option value="50">{t("50 poin", "50 points")}</option>
          </select>
        </div>
        <div className="live-field">
          <label htmlFor="f-strategy">{t("Strategi studi", "Study strategy")}</label>
          <select id="f-strategy" value={draft.strategy} onChange={(e) => set({ strategy: e.target.value })} data-testid="select-strategy">
            <option value="Linear Averaging">Linear Averaging (1-2-3-4)</option>
            <option value="Martingale">Martingale (1-2-4-8)</option>
          </select>
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
      <p className="live-small">{t("Parameter studi aturan lama, bukan level harga. Default: Linear Averaging, 30 poin, 3 layer, Pemula.", "Study-rule parameters, not price levels. Defaults: Linear Averaging, 30 points, 3 layers, Beginner.")}</p>
      {error && <p role="alert" className="live-error" data-testid="text-form-error">{error}</p>}
    </div>
  );

  const studyResult = (
    <section id="hasil-cek" ref={resultRef} aria-live="polite" data-testid="inline-result" className="rounded-lg border border-border p-3 sm:p-4">
      <h3 className="font-bold mb-2">{t("Hasil studi (aturan lama)", "Study result (original rules)")}</h3>
      {!submitted && <p className="text-sm text-muted-foreground">{t("Isi parameter studi lalu tekan hitung. Hasil muncul di sini.", "Fill the study parameters and calculate. The result appears here.")}</p>}
      {stale && <p role="status" className="live-error" data-testid="text-result-stale">{t("Input berubah. Hasil sebelumnya tidak berlaku lagi; hitung ulang.", "Inputs changed. The earlier result no longer applies; recalculate.")}</p>}
      {current && calc.isLoading && !calc.isError && <p className="text-sm text-muted-foreground">{t("Menghitung...", "Calculating...")}</p>}
      {current && calc.isError && (
        <div><p className="live-error">{t("Gagal menghitung risiko. Tidak ada hasil pengganti.", "Failed to calculate. No substitute result.")}</p>
          <Button variant="outline" size="sm" onClick={() => calc.refetch()}>{t("Coba lagi", "Retry")}</Button></div>
      )}
      {current && calc.data && !calc.isError && (
        <div className="live-stack">
          <p className="text-xs font-semibold text-muted-foreground">{t("Hasil aturan studi untuk skenario Anda, bukan ukuran risiko akun realtime.", "Study-rule output for your scenario, not a live account-risk measure.")}</p>
          <div className="text-center"><StatusBadge status={calc.data.status} t={t} />
            <div className="text-4xl font-mono font-bold mt-3" data-testid="text-risk-score">{calc.data.score}<span className="text-xl text-muted-foreground">/100</span></div>
            <div className="mt-2"><RiskScoreMeter score={calc.data.score} status={calc.data.status} t={t} /></div>
          </div>
          <StudySummary result={calc.data} params={current} snapshot={snap} language={language} t={t} compact />
        </div>
      )}
    </section>
  );

  const glance = (
    <section className="mrg-market-helper rounded-lg border border-border p-3" data-testid="market-glance">
      <strong>{t("Konteks pasar saat ini", "Current market context")}</strong>
      <p className="live-small" data-testid="text-quote-status">
        {market.usableQuote ? `XUL10 ${market.usableQuote.price.toLocaleString("id-ID", { maximumFractionDigits: 2 })} · ${t("segar", "fresh")}` : t("Harga XUL10 tidak tersedia atau tidak segar; tidak ditampilkan sebagai live.", "No fresh live XUL10 price; nothing is shown as live.")}
        {" · "}{calendarFresh ? t("Kalender lengkap & segar", "Calendar complete & fresh") : t("Kalender belum dapat dinilai", "Calendar cannot be assessed")}
      </p>
      {liveWarnings.length > 0 && <ul className="mrg-summary-notes" data-testid="list-context-warnings">{liveWarnings.map((w, i) => <li key={i}>{t(w.id, w.en)}</li>)}</ul>}
      <div data-testid="market-helper">
        {reference.status === "ready" ? (
          <>
            <p>{t(`Referensi emas D1: tren ${trendWord}. Gunakan sebagai kondisi skenario jika sesuai.`, `Daily gold reference: trending ${trendWord}. Use it as the scenario condition if appropriate.`)}</p>
            <p className="live-small">{t("LGD Daily · emas referensi, bukan harga XUL10 yang identik.", "LGD Daily · reference gold, not an identical XUL10 price.")}</p>
            <Button type="button" variant="outline" size="sm" onClick={confirmD1} disabled={!!draft.d1Key && draft.marketCondition === "Trending"} data-testid="button-confirm-d1">
              <CheckCircle className="w-4 h-4 mr-1" />
              {draft.d1Key ? t("Trending dari D1 dikonfirmasi", "Trending from D1 confirmed") : t("Gunakan Trending dari referensi ini", "Use Trending from this reference")}
            </Button>
          </>
        ) : (
          <p>{reference.status === "mixed"
            ? t("Referensi harian campuran, belum pasti. Pilih kondisi pasar sendiri.", "The daily reference is mixed, not certain. Choose the market condition yourself.")
            : t("Data pasar tidak tersedia atau tidak segar. Mode manual tetap bisa dihitung.", "Market data is unavailable or not fresh. Manual mode still calculates.")}</p>
        )}
        {notice && <p role="status" className="live-error">{notice}</p>}
        <details className="live-details">
          <summary>{t("Lihat dasar data", "See the evidence")}</summary>
          <StudyEvidence reference={reference} warnings={liveWarnings} quote={market.usableQuote} calendar={ctx ? ctx.calendar : null} />
        </details>
      </div>
    </section>
  );

  const capitalField = (
          <div className="live-field w-full">
            <label htmlFor="f-modal">{t("Modal skenario (USD)", "Scenario capital (USD)")}</label>
            <div className="flex gap-2 flex-wrap">
              {[100000, 200000, 300000].map(v => <Button key={v} type="button" size="sm" variant={Number(draft.modal) === v ? "default" : "outline"} onClick={() => set({ modal: String(v) })} data-testid={`button-modal-${v}`}>USD {v.toLocaleString("id-ID")}</Button>)}
            </div>
            <input id="f-modal" type="number" inputMode="decimal" min="0" max="1000000000000" step="any" value={draft.modal} onChange={e => set({ modal: e.target.value })} placeholder={t("Masukkan modal Anda", "Enter your capital")} data-testid="input-modal" />
            <span className="live-small">{t("Modal simulasi, bukan saldo akun atau anjuran setoran.", "Simulation capital, not an account balance or deposit advice.")}</span>
          </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mrg-check-page max-w-6xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
        <PwaInstall toolbarId="mrg-install-toolbar" />
        <header className="mrg-calculator-toolbar">
          <MRGBrandBar />
          <div className="mrg-calculator-actions">
          <span id="mrg-install-toolbar" className="live-header-install" />
          <Button variant="default" onClick={() => setLanguage(language === "id" ? "en" : "id")} className="gap-2" aria-label={t("Ganti ke bahasa Inggris", "Switch to Indonesian")} data-testid="button-language-toggle">
            <Globe className="w-4 h-4" />{language === "id" ? "EN" : "ID"}
          </Button>
          </div>
        </header>

        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">{t("Martingale vs Linear Averaging", "Martingale vs Linear Averaging")}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mt-1">
            {t("Isi modal → pilih Buy atau Sell → pelajari skenarionya.", "Enter capital → choose Buy or Sell → explore the scenario.")}
          </p>
          <div className="mt-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">{t("Edukasi risiko · bukan sinyal atau transaksi broker", "Risk education · not trading signals or broker orders")}</span>
          </div>
        </div>

        <ScenarioWorkspace capital={draft.modal} capitalField={capitalField} market={market} initialMode={manual ? "manual" : "market"} onModeChange={(m) => setManual(m === "manual")} study={{
          fields: studyFields, result: studyResult, glance,
          values: { strategy: draft.strategy === "Martingale" ? "Martingale" : "Linear Averaging", targetPoin: draft.targetPoin, maxLayer: draft.maxLayer, experience: draft.experience },
          defaults: { strategy: "Linear Averaging", targetPoin: "30", maxLayer: "3", experience: "Pemula" },
          onChange: (patch) => set(patch),
          submit: submitStudy,
        }} />
        <div className="mt-6 text-center px-4">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-4">
            {t("Aplikasi ini untuk edukasi, literasi risiko, dan mitigasi risiko. Keputusan pengguna adalah tanggung jawab masing-masing.", "This app is for education, risk literacy, and risk mitigation. User decisions are their own responsibility.")}
          </p>
          <div className="flex justify-center gap-4 text-xs flex-wrap">
            <Link href="/literasi" className="text-muted-foreground hover:text-foreground underline">{t("Literasi", "Literacy")}</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline" data-testid="link-privacy">{t("Kebijakan Privasi", "Privacy Policy")}</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground underline" data-testid="link-terms">{t("Syarat & Ketentuan", "Terms & Conditions")}</Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">© 2025 Martingale Risk Guard. {t("Hak cipta dilindungi.", "All rights reserved.")}</p>
        </div>
      </div>
    </div>
  );
}
