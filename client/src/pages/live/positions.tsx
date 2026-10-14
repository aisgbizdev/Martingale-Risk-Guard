import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronUp, CopyPlus, Pencil, Plus, RotateCcw, Save, Settings2, Trash2 } from "lucide-react";
import type { Position, PositionSettings } from "@shared/live-types";
import { evaluatePositionRisk, stressScenarios, summarizePositions } from "@shared/position-risk";
import { useMarket } from "@/hooks/use-market";
import { usePositionSimulation } from "@/hooks/use-position-simulation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { AdaptivePanel } from "@/components/live/adaptive-panel";
import { ErrorBox, Field, PageIntro, Panel, RiskSummary } from "@/components/live/live-ui";
import { TermHelp } from "@/components/live/term-help";

const show = (value: number | null, digits = 3) => value === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
const positive = (raw: string) => raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) > 0;
type PositionForm = { side: Position["side"]; entry: string; lots: string; enteredAt: string };
type ActivePanel = "entry" | "settings" | "simulation" | null;
const blankPosition = (side: Position["side"] = "buy"): PositionForm => ({ side, entry: "", lots: "", enteredAt: "" });
function numberText(value: number | null) { return value === null ? "" : String(value); }
function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

export default function PositionsPage() {
  const market = useMarket();
  const { portfolio, error: storageError, blocked, addPosition, updatePosition, removePosition, clearPositions, saveSettings, resetPortfolio } = usePortfolio();
  const { t } = useLanguage();
  const buySim = usePositionSimulation("buy", market);
  const sellSim = usePositionSimulation("sell", market);
  const simulationCleanup = useRef({ buy: buySim.close, sell: sellSim.close });
  simulationCleanup.current = { buy: buySim.close, sell: sellSim.close };
  const [form, setForm] = useState<PositionForm>(blankPosition());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [settings, setSettings] = useState<PositionSettings>(portfolio.settings);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<Record<string, string>>({});
  const [simulationSide, setSimulationSide] = useState<Position["side"]>("buy");
  const [candidateEntry, setCandidateEntry] = useState("");
  const [candidateLots, setCandidateLots] = useState("");
  const [recordConfirm, setRecordConfirm] = useState(false);
  const [stressPercent, setStressPercent] = useState("3");
  const [simulationPausedForSettings, setSimulationPausedForSettings] = useState(false);
  const panelOpenerRef = useRef<HTMLElement | null>(null);
  useEffect(() => () => {
    simulationCleanup.current.buy();
    simulationCleanup.current.sell();
  }, []);
  const customStress = Number(stressPercent);
  const stressValid = stressPercent.trim() !== "" && Number.isFinite(customStress) && customStress > 0 && customStress < 100;
  const sim = simulationSide === "buy" ? buySim : sellSim;
  const groups = useMemo(() => (["buy", "sell"] as const).map((side) => {
    const positions = portfolio.positions.filter((p) => p.side === side);
    return { side, positions, summary: summarizePositions(positions) };
  }), [portfolio.positions]);

  const setSetting = (key: keyof PositionSettings, raw: string) => {
    setSettings((old) => ({ ...old, [key]: raw.trim() ? Number(raw) : null }));
    setSettingsFieldErrors((old) => ({ ...old, [key]: "" }));
    setSettingsSaved(false);
  };
  const openEntry = (opener?: HTMLElement) => {
    if (opener) panelOpenerRef.current = opener;
    if (activePanel === "simulation") closeSimulation();
    if (activePanel === "settings") closeSettings();
    if (simulationPausedForSettings) closeSimulation();
    setActionError("");
    setActivePanel("entry");
  };
  const closeEntry = () => {
    setActivePanel(null);
    setEditingId(null);
    setForm(blankPosition());
    setFormError("");
  };
  const openSettings = (opener?: HTMLElement) => {
    if (opener) panelOpenerRef.current = opener;
    if (activePanel === "simulation") closeSimulation();
    if (activePanel === "entry") closeEntry();
    setSettings(portfolio.settings);
    setSettingsError("");
    setSettingsFieldErrors({});
    setSettingsSaved(false);
    setActivePanel("settings");
  };
  const switchFromSimulationToSettings = () => {
    panelOpenerRef.current = document.getElementById("simulation-controls");
    setSimulationPausedForSettings(true);
    setSettings(portfolio.settings);
    setSettingsError("");
    setSettingsFieldErrors({});
    setSettingsSaved(false);
    setActivePanel("settings");
  };
  const closeSettings = () => {
    setActivePanel(null);
    setSettings(portfolio.settings);
    setSettingsFieldErrors({});
    setSettingsError("");
    setSettingsSaved(false);
  };
  const submitPosition = () => {
    const errors: string[] = [];
    if (!positive(form.entry)) errors.push(t("Harga masuk harus berupa angka positif.", "Entry price must be a positive number."));
    if (!positive(form.lots)) errors.push(t("Lot harus berupa angka positif.", "Lots must be a positive number."));
    if (form.enteredAt && Number.isNaN(new Date(form.enteredAt).getTime())) errors.push(t("Waktu masuk tidak valid.", "Entry time is invalid."));
    if (blocked) {
      setFormError(t("Penyimpanan lokal diblokir. Data yang ada tidak akan ditimpa.", "Local storage is blocked. Existing data will not be overwritten."));
      return;
    }
    if (errors.length) { setFormError(errors.join(" ")); return; }
    try {
      const input = { symbol: "XUL10" as const, side: form.side, entry: Number(form.entry), lots: Number(form.lots), enteredAt: form.enteredAt ? new Date(form.enteredAt).toISOString() : null };
      if (editingId) updatePosition(editingId, input); else addPosition(input);
      setActionError("");
      closeEntry();
    } catch (error) { setFormError(error instanceof Error ? error.message : t("Posisi belum tersimpan.", "Position was not saved.")); }
  };
  const edit = (position: Position, opener?: HTMLElement) => {
    if (opener) panelOpenerRef.current = opener;
    setEditingId(position.id);
    setForm({ side: position.side, entry: String(position.entry), lots: String(position.lots), enteredAt: position.enteredAt ? localDateTime(position.enteredAt) : "" });
    setFormError("");
    setActionError("");
    setActivePanel("entry");
  };
  const openSimulation = (opener?: HTMLElement) => {
    if (opener) panelOpenerRef.current = opener;
    if (simulationPausedForSettings && sim.snapshot) {
      setSimulationPausedForSettings(false);
      setActivePanel("simulation");
      return;
    }
    if (activePanel === "simulation") {
      closeSimulation();
      setActivePanel("simulation");
      return;
    }
    if (activePanel === "entry") closeEntry();
    if (activePanel === "settings") closeSettings();
    setActionError("");
    setRecordConfirm(false);
    setCandidateEntry("");
    setCandidateLots("");
    setActivePanel("simulation");
  };
  const startSimulation = () => {
    setActionError("");
    setRecordConfirm(false);
    (simulationSide === "buy" ? buySim : sellSim).create();
    setCandidateEntry(market.usableQuote ? String(market.usableQuote.price) : "");
    const last = portfolio.positions.filter((p) => p.side === simulationSide).at(-1);
    setCandidateLots(last ? String(last.lots) : "");
  };
  const updateCandidate = (key: "entry" | "lots", raw: string) => {
    if (key === "entry") setCandidateEntry(raw); else setCandidateLots(raw);
    sim.update({ [key]: raw.trim() && Number.isFinite(Number(raw)) ? Number(raw) : 0 });
    setRecordConfirm(false);
  };
  const closeSimulation = () => {
    buySim.close();
    sellSim.close();
    setSimulationPausedForSettings(false);
    setRecordConfirm(false);
    setCandidateEntry("");
    setCandidateLots("");
    setActionError("");
    setActivePanel((current) => current === "simulation" ? null : current);
  };
  const onSimulationOpenChange = (open: boolean) => {
    if (!open) closeSimulation();
    else setActivePanel("simulation");
  };
  const record = () => {
    if (blocked) {
      setActionError(t("Penyimpanan lokal diblokir. Catatan simulasi tidak ditambahkan.", "Local storage is blocked. The simulated record was not added."));
      setRecordConfirm(false);
      return;
    }
    if (!candidateEntry.trim() || !candidateLots.trim() || !positive(candidateEntry) || !positive(candidateLots) || !sim.candidateValid || sim.outdated) {
      setActionError(t("Masukkan harga dan lot positif, lalu buat ulang simulasi jika posisi atau batas berubah.", "Enter a positive price and lot, and recreate the simulation if positions or limits changed."));
      setRecordConfirm(false);
      return;
    }
    try { sim.record(); setRecordConfirm(false); setActionError(""); setCandidateEntry(""); setCandidateLots(""); }
    catch (error) { setActionError(error instanceof Error ? error.message : t("Simulasi belum dapat dicatat.", "Simulation could not be recorded.")); setRecordConfirm(false); }
  };
  const doSaveSettings = () => {
    const nextErrors: Record<string, string> = {};
    (["capital", "equity", "maxLots", "targetPriceDistance", "layerSpacingPrice"] as const).forEach((key) => {
      const value = settings[key];
      if (value !== null && (!Number.isFinite(value) || value <= 0)) nextErrors[key] = t("Masukkan nilai positif atau kosongkan.", "Enter a positive value or leave blank.");
    });
    if (settings.maxLayers !== null && (!Number.isInteger(settings.maxLayers) || settings.maxLayers <= 0 || settings.maxLayers > 200)) {
      nextErrors.maxLayers = t("Masukkan jumlah layer 1–200 berupa bilangan bulat atau kosongkan.", "Enter a whole-number layer limit from 1–200 or leave blank.");
    }
    setSettingsFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setSettingsError(""); return; }
    if (blocked) {
      setSettingsError(t("Penyimpanan lokal diblokir. Pengaturan tidak disimpan.", "Local storage is blocked. Settings were not saved."));
      return;
    }
    try {
      saveSettings(settings);
      setSettingsError("");
      setSettingsFieldErrors({});
      setSettingsSaved(true);
      setActionError("");
      if (!simulationPausedForSettings) setActivePanel(null);
    }
    catch (error) { setSettingsError(error instanceof Error ? error.message : t("Pengaturan gagal disimpan.", "Settings could not be saved.")); }
  };
  const openGuideStep = (panel: Exclude<ActivePanel, null>, opener: HTMLElement) => {
    if (panel === "entry") openEntry(opener);
    if (panel === "settings") openSettings(opener);
    if (panel === "simulation") openSimulation(opener);
  };
  const onPanelCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    if (activePanel !== null) return;
    const opener = panelOpenerRef.current;
    if (opener?.isConnected) {
      opener.focus();
      return;
    }
    document.getElementById("simulation-controls")?.focus();
  };

  return <LiveShell>
    <PageIntro compact kicker={t("Posisi · perangkat ini saja", "Positions · this device only")} title={t("Catat, lalu bandingkan.", "Record, then compare.")} />
    <nav className="live-learning-steps" aria-label={t("Langkah penggunaan", "How to use these tools")}>
      <span className="live-learning-caption">{t("Mulai di sini", "Start here")}</span>
      <button type="button" onClick={(event) => openGuideStep("entry", event.currentTarget)}><span>1</span>{t("Catat posisi", "Record a position")}</button>
      <button type="button" onClick={(event) => openGuideStep("settings", event.currentTarget)}><span>2</span>{t("Atur batas", "Set limits")}</button>
      <button type="button" onClick={(event) => openGuideStep("simulation", event.currentTarget)}><span>3</span>{t("Bandingkan simulasi", "Compare a simulation")}</button>
    </nav>
    {(storageError || actionError) && <div style={{ marginTop: 16 }}><ErrorBox message={actionError || storageError || ""} /></div>}
    {blocked && <div style={{ marginTop: 12 }} className="live-alert">{t("Penyimpanan lokal diblokir karena data tersimpan tidak dapat dibaca. Jangan timpa data yang ada.", "Local storage is blocked because existing data could not be read. Existing data will not be overwritten.")}</div>}

    <div className="live-grid live-position-workspace" data-testid="positions-workspace">
      <div className="live-position-left-column" data-testid="positions-entry-records">
        <button id={activePanel === "entry" ? undefined : "position-entry-controls"} data-testid={activePanel === "entry" ? undefined : "positions-entry"} type="button" className="live-section-toggle" aria-expanded={activePanel === "entry"} onClick={(event) => openEntry(event.currentTarget)}>
          <span className="live-section-icon"><Plus size={19}/></span><span className="live-section-copy"><strong>{t("Buka catatan", "Open entry form")}</strong><small>{t("Input manual · XUL10 · tanpa order", "Manual entry · XUL10 · no orders")}</small></span><span className="live-section-cta">{t("Buka", "Open")}</span>
        </button>
        <Panel data-testid="positions-records" className="live-position-records" title={t("Rangkaian posisi", "Position series")} eyebrow={`${portfolio.positions.length} ${t("catatan tersimpan lokal", "local records")}`} action={<div className="live-row" style={{ flexWrap: "wrap" }}>
          {portfolio.positions.length > 0 && <button className="live-button danger" onClick={() => { if (window.confirm(t("Hapus semua catatan posisi? Tindakan ini tidak dapat dibatalkan.", "Delete all position records? This cannot be undone."))) try { clearPositions(); setActionError(""); } catch (e) { setActionError(String(e)); } }}><Trash2 size={14}/>{t("Hapus semua posisi", "Delete all positions")}</button>}
          <button className="live-button danger" onClick={() => { if (window.confirm(t("Hapus portfolio, preferensi, dan skenario dasar tersimpan di perangkat ini?", "Delete the portfolio, preferences, and saved basic scenarios on this device?"))) try { resetPortfolio(); setSettings({ capital: null, equity: null, currency: "USD", maxLots: null, maxLayers: null, targetPriceDistance: null, layerSpacingPrice: null }); setSettingsFieldErrors({}); setSettingsError(""); setActionError(""); } catch (e) { setActionError(String(e)); } }}><RotateCcw size={14}/>{t("Reset data lokal", "Reset local data")}</button>
        </div>}>
          {portfolio.positions.length === 0 ? <div className="live-alert">{t("Belum ada posisi. Catatan yang Anda tambahkan hanya disimpan di penyimpanan browser perangkat ini.", "No positions yet. Records you add stay in this device browser storage.")}</div> :
            <div className="live-grid" style={{ margin: 0 }}>{groups.filter((g) => g.positions.length).map(({ side, positions, summary }) => {
              const risk = evaluatePositionRisk(positions, portfolio.settings, market.usableQuote, market.context.isError ? null : market.context.data ?? null, market.now);
              return <div key={side} className="live-card live-span-6">
                <div className="live-row"><h3>{side === "buy" ? t("Sisi buy", "Buy side") : t("Sisi sell", "Sell side")}</h3><span className="live-pill">{show(summary.totalLots, 4)} {t("lot", "lots")}</span></div>
                <details className="live-details" style={{ marginTop: 10 }}><summary>{t("Lihat catatan posisi", "View position records")} · {positions.length}</summary><div className="live-list" style={{ marginTop: 8 }}>{positions.map((p, index) => <div className="live-position" key={p.id}>
                  <div><div className="live-kicker">{t("Layer", "Layer")} {index + 1} · XUL10</div><strong className="live-mono">{show(p.entry)} <span className="live-small">× {show(p.lots, 4)} {t("lot", "lots")}</span></strong><div className="live-small">{p.enteredAt ? new Date(p.enteredAt).toLocaleString() : t("Waktu tidak dicatat", "Time not recorded")}</div></div>
                  <div className="live-row" style={{ gap: 4 }}><button className="live-icon-btn" onClick={(event) => edit(p, event.currentTarget)} aria-label={t("Ubah posisi", "Edit position")}><Pencil size={14}/></button><button className="live-icon-btn" onClick={() => { if (window.confirm(t("Hapus catatan posisi ini?", "Delete this position record?"))) try { removePosition(p.id); setActionError(""); } catch (e) { setActionError(String(e)); } }} aria-label={t("Hapus posisi", "Delete position")}><Trash2 size={14}/></button></div>
                </div>)}</div></details>
                <div style={{ marginTop: 15 }}><RiskSummary risk={risk} detailed/></div>
                {risk.components.length > 0 && <details className="live-details" style={{ marginTop: 14 }}><summary>{t("Lihat rincian indeks dan formula", "View index details and formulas")}</summary><div className="live-stack" style={{ marginTop: 12 }}>{risk.components.map((component) => <div className="live-row live-small" key={component.key} style={{ alignItems: "start" }}><span style={{ flex: 1 }}><strong>{t(component.label.id, component.label.en)}</strong><br/>{t(component.explanation.id, component.explanation.en)}</span><strong className="live-mono">{component.points === null ? "—" : show(component.points, 1)} / {component.max}</strong></div>)}</div></details>}
                {market.usableQuote && <div className="live-alert" style={{ marginTop: 12 }}>
                  <strong>{t("Stress hipotetis · harga, bukan uang", "Hypothetical stress · price, not money")}</strong>
                  <details className="live-details"><summary>{t("Lihat skenario harga", "View price scenarios")}</summary>
                    {stressScenarios(positions, market.usableQuote.price).map((scenario) => <div key={scenario.percent} className="live-row" style={{ marginTop: 7 }}><span>{scenario.percent}% {t("melawan posisi", "adverse move")}</span><strong className="live-mono">{show(scenario.scenarioPrice)} · {t("jarak adverse", "adverse distance")} {show(scenario.adverseDistance)}</strong></div>)}
                    {stressValid && stressScenarios(positions, market.usableQuote.price, [customStress]).map((scenario) => <div key="custom" className="live-row" style={{ marginTop: 7 }}><span>{scenario.percent}% · {t("pilihan Anda", "your choice")}</span><strong className="live-mono">{show(scenario.scenarioPrice)} · {t("jarak adverse", "adverse distance")} {show(scenario.adverseDistance)}</strong></div>)}
                  </details>
                  <p className="live-small" style={{ marginTop: 9 }}>{t("Skenario ini bukan batas kerugian terburuk atau simulasi likuiditas, spread, maupun margin call.", "These scenarios are not a worst-case loss bound or a simulation of liquidity, spreads, or margin calls.")}</p>
                </div>}
                {portfolio.settings.maxLots !== null && <p className="live-small" style={{ marginTop: 12 }}>{t("Sisa batas lot pilihan Anda", "Remaining chosen lot limit")}: {show(Math.max(0, portfolio.settings.maxLots - summary.totalLots), 4)} · {t("bukan kapasitas aman rekening", "not safe account capacity")}</p>}
                {portfolio.settings.maxLayers !== null && <p className="live-small">{t("Sisa batas layer pilihan Anda", "Remaining chosen layer limit")}: {Math.max(0, portfolio.settings.maxLayers - summary.layers)}</p>}
              </div>;
            })}</div>}
        </Panel>
      </div>

      <Panel id="settings-controls" data-testid="positions-settings" className="live-position-settings" title={t("Batas & preferensi", "Limits & preferences")} eyebrow={t("Bukan target atau rekomendasi", "Not a target or recommendation")} action={<button type="button" className="live-button live-section-settings-button" onClick={(event) => openSettings(event.currentTarget)} aria-expanded={activePanel === "settings"} aria-label={t("Tampilkan pengaturan", "Show settings")}><Settings2 size={16}/>{t("Atur batas", "Edit limits")}</button>}>
        <p className="live-small">{t("Modal dan ekuitas dipisahkan. Tidak ada klaim P/L uang, margin, atau risiko rekening; ukuran kontrak dan konversi poin belum tervalidasi.", "Capital and equity are separate. No monetary P/L, margin, or account-risk claims; contract size and point conversion are not verified.")}</p>
        <div className="live-row" style={{ marginTop: 14 }}><span className="live-small">{t("Mata uang", "Currency")}</span><strong>{portfolio.settings.currency}</strong></div>
        <div className="live-row" style={{ marginTop: 9 }}><span className="live-inline-help"><span className="live-small">{t("Batas lot / layer", "Lot / layer limit")}</span><TermHelp term="limits"/><TermHelp term="layers"/></span><strong>{portfolio.settings.maxLots ?? "—"} / {portfolio.settings.maxLayers ?? "—"}</strong></div>
        <div className="live-row" style={{ marginTop: 9 }}><span className="live-small">{t("Target / jarak layer", "Target / layer spacing")}</span><strong>{show(portfolio.settings.targetPriceDistance)} / {show(portfolio.settings.layerSpacingPrice)}</strong></div>
      </Panel>

      <details className="live-disclosure live-span-12"><summary>{t("Skenario tekanan pilihan Anda", "Your chosen stress scenario")}</summary><Panel className="live-span-12" title={t("Skenario tekanan pilihan Anda", "Your chosen stress scenario")} eyebrow={t("Simulasi harga · bukan prediksi", "Price simulation · not a prediction")}>
        <Field label={t("Pergerakan melawan posisi (%)", "Adverse price move (%)")} value={stressPercent} onChange={setStressPercent} error={!stressValid ? t("Masukkan persentase lebih dari 0 dan kurang dari 100.", "Enter a percentage greater than 0 and less than 100.") : undefined} hint={t("Hasil muncul di setiap rangkaian bila harga feed masih baru. Persentase ini bukan probabilitas kejadian.", "Results appear in each series when the feed price is fresh. This percentage is not an event probability.")}/>
      </Panel></details>
      <button id="simulation-controls" data-testid="positions-simulation" type="button" className="live-section-toggle live-span-12" aria-expanded={activePanel === "simulation"} onClick={(event) => openSimulation(event.currentTarget)}>
        <span className="live-section-icon"><CopyPlus size={19}/></span><span className="live-section-copy"><strong>{t("Simulasi tambah layer", "Simulate another layer")}</strong><small>{t("Perbandingan hipotetis · snapshot terpisah · tanpa transaksi", "Hypothetical comparison · separate snapshot · no trade")}</small></span><span className="live-section-cta">{t("Buka", "Open")}</span>
      </button>
      <div className="live-span-12 live-small">{t("Data posisi tersimpan lokal tanpa cloud sync. Reset lokal juga menghapus preferensi MRG dan skenario kalkulator dasar yang tersimpan.", "Position data stays local without cloud sync. Local reset also removes MRG preferences and saved basic calculator scenarios.")}</div>
    </div>

    <AdaptivePanel open={activePanel === "entry"} onOpenChange={(open) => open ? setActivePanel("entry") : closeEntry()} onCloseAutoFocus={onPanelCloseAutoFocus}
      title={editingId ? t("Ubah posisi", "Edit position") : t("Tambah catatan posisi", "Add a position record")}
      description={t("Input pengguna · tidak terhubung ke broker", "User input · not connected to a broker")}
      panelId="position-entry-controls" testId="positions-entry" closeLabel={t("Tutup form posisi", "Close position form")}
      footer={<><button type="button" className="live-button" onClick={closeEntry}>{t("Batal", "Cancel")}</button><button type="button" className="live-button primary" disabled={blocked} onClick={submitPosition}>{editingId ? <Save size={15}/> : <Plus size={15}/>} {editingId ? t("Simpan perubahan", "Save changes") : t("Catat posisi", "Record position")}</button></>}>
      <div className="live-alert mrg-panel-warning">{t("Catatan manual di perangkat ini saja. Tidak ada order yang dikirim. Indeks eksposur belum dikalibrasi dan bukan penilaian keamanan rekening.", "Manual record on this device only. No orders are sent. The exposure index is uncalibrated and is not an account-safety assessment.")}</div>
      {blocked && <div className="live-alert" role="alert" style={{ marginTop: 12 }}>{storageError || t("Penyimpanan lokal diblokir. Data yang ada tidak akan ditimpa.", "Local storage is blocked. Existing data will not be overwritten.")}</div>}
      {storageError && !blocked && <div style={{ marginTop: 12 }}><ErrorBox message={storageError}/></div>}
      <div className="live-form-grid mrg-panel-fields">
        <div className="live-field"><label htmlFor="position-side">{t("Arah posisi", "Position direction")}</label><select id="position-side" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as Position["side"] })}><option value="buy">{t("Buy", "Buy")}</option><option value="sell">{t("Sell", "Sell")}</option></select></div>
        <Field label={t("Harga masuk XUL10", "XUL10 entry price")} value={form.entry} onChange={(entry) => setForm({ ...form, entry })} error={formError && !positive(form.entry) ? t("Masukkan harga positif.", "Enter a positive price.") : undefined} required />
        <Field label={t("Lot", "Lots")} value={form.lots} onChange={(lots) => setForm({ ...form, lots })} error={formError && !positive(form.lots) ? t("Masukkan lot positif.", "Enter a positive lot amount.") : undefined} required help={<TermHelp term="lot"/>} />
        <Field label={t("Waktu masuk (opsional)", "Entry time (optional)")} type="datetime-local" value={form.enteredAt} onChange={(enteredAt) => setForm({ ...form, enteredAt })} />
      </div>
      <div className="live-inline-help live-inline-note"><span className="live-small">{t("Menambah catatan layer tidak otomatis menambah ukuran.", "Adding a recorded layer does not automatically increase size.")}</span><TermHelp term="averaging"/></div>
      {formError && <div className="live-error" role="alert" style={{ marginTop: 10 }}>{formError}</div>}
    </AdaptivePanel>

    <AdaptivePanel open={activePanel === "settings"} onOpenChange={(open) => open ? setActivePanel("settings") : closeSettings()} onCloseAutoFocus={onPanelCloseAutoFocus}
      title={t("Batas & preferensi", "Limits & preferences")}
      description={t("Input pribadi untuk perbandingan; bukan target atau rekomendasi.", "Personal inputs for comparison; not a target or recommendation.")}
      panelId="settings-panel-controls" testId="positions-settings-dialog" closeLabel={t("Tutup pengaturan", "Close settings")}
      footer={<><button type="button" className="live-button" onClick={closeSettings}>{t("Batalkan perubahan", "Discard changes")}</button><button type="button" className="live-button primary" disabled={blocked} onClick={doSaveSettings}><Save size={15}/>{t("Simpan batas", "Save limits")}</button></>}>
      <div className="live-alert mrg-panel-warning">{t("Modal dan ekuitas adalah input terpisah. Tidak ada klaim P/L uang, margin, atau risiko rekening. Ukuran kontrak dan konversi poin belum tervalidasi.", "Capital and equity are separate inputs. No monetary P/L, margin, or account-risk claims. Contract size and point conversion are unverified.")}</div>
      {blocked && <div className="live-alert" role="alert" style={{ marginTop: 12 }}>{storageError || t("Penyimpanan lokal diblokir; perubahan tidak dapat disimpan.", "Local storage is blocked; changes cannot be saved.")}</div>}
      {storageError && !blocked && <div style={{ marginTop: 12 }}><ErrorBox message={storageError}/></div>}
      {simulationPausedForSettings && <div className="live-row mrg-return-simulation"><span className="live-small">{t("Snapshot simulasi dijeda dan tidak diperbarui.", "The simulation snapshot is paused and has not been refreshed.")}</span><button type="button" className="live-button" onClick={(event) => openSimulation(event.currentTarget)}>{t("Kembali ke simulasi", "Return to simulation")}</button></div>}
      <div className="live-form-grid mrg-panel-fields mrg-settings-fields">
        <div className="live-field"><label htmlFor="settings-currency">{t("Mata uang nominal", "Amount currency")}</label><select id="settings-currency" value={settings.currency} onChange={(e) => { setSettings({ ...settings, currency: e.target.value as "USD" | "IDR" }); setSettingsSaved(false); }}><option>USD</option><option>IDR</option></select></div>
        <Field label={t("Modal (opsional)", "Capital (optional)")} value={numberText(settings.capital)} onChange={(v) => setSetting("capital", v)} error={settingsFieldErrors.capital} />
        <Field label={t("Ekuitas berjalan (opsional)", "Current equity (optional)")} value={numberText(settings.equity)} onChange={(v) => setSetting("equity", v)} error={settingsFieldErrors.equity} />
        <Field label={t("Batas total lot", "Total lot limit")} value={numberText(settings.maxLots)} onChange={(v) => setSetting("maxLots", v)} error={settingsFieldErrors.maxLots} hint={t("Diperlukan untuk indeks lot.", "Required for the lot index.")} help={<TermHelp term="limits"/>} />
        <Field label={t("Batas jumlah layer", "Layer count limit")} value={numberText(settings.maxLayers)} onChange={(v) => setSetting("maxLayers", v)} error={settingsFieldErrors.maxLayers} step="1" hint={t("Diperlukan untuk indeks layer.", "Required for the layer index.")} help={<TermHelp term="layers"/>} />
        <Field label={t("Target jarak harga (opsional)", "Target price distance (optional)")} value={numberText(settings.targetPriceDistance)} onChange={(v) => setSetting("targetPriceDistance", v)} error={settingsFieldErrors.targetPriceDistance} hint={t("Satuan harga mentah; spesifikasi poin tidak diverifikasi.", "Raw price units; point specification is unverified.")} />
        <Field label={t("Jarak layer (opsional)", "Layer spacing (optional)")} value={numberText(settings.layerSpacingPrice)} onChange={(v) => setSetting("layerSpacingPrice", v)} error={settingsFieldErrors.layerSpacingPrice} hint={t("Terpisah dari target; satuan harga mentah.", "Separate from target; raw price units.")} />
      </div>
      {settingsSaved && <div className="live-alert" role="status" style={{ marginTop: 12 }}>{simulationPausedForSettings && sim.outdated ? t("Batas tersimpan. Snapshot simulasi tetap dibekukan dan kini usang; kembali untuk melihat peringatannya.", "Limits saved. The simulation snapshot remains frozen and is now outdated; return to see its warning.") : t("Batas tersimpan di perangkat ini.", "Limits saved on this device.")}</div>}
      {settingsError && <div className="live-error" role="alert" style={{ marginTop: 12 }}>{settingsError}</div>}
    </AdaptivePanel>

    <AdaptivePanel open={activePanel === "simulation"} onOpenChange={onSimulationOpenChange} onCloseAutoFocus={onPanelCloseAutoFocus}
      title={t("Simulasikan tambahan layer", "Compare an additional layer")}
      description={t("Snapshot terpisah · tidak ada transaksi", "Separate snapshot · no trade execution")}
      panelId="simulation-panel-controls" testId="positions-simulation-panel" closeLabel={t("Tutup simulasi", "Close simulation")}
      footer={<><button type="button" className="live-button" onClick={closeSimulation}>{t("Tutup simulasi", "Close simulation")}</button>{sim.snapshot && <button type="button" className="live-button primary" disabled={!sim.candidateValid || sim.outdated || blocked || !positive(candidateEntry) || !positive(candidateLots)} onClick={() => { if (recordConfirm) record(); else setRecordConfirm(true); }}><Check size={15}/>{recordConfirm ? t("Ya, tambahkan ke catatan", "Yes, add to records") : t("Catat sebagai posisi manual", "Record as manual position")}</button>}</>}>
      <div className="live-alert mrg-panel-warning"><strong>{t("Simulasi hipotetis · tanpa order", "Hypothetical simulation · no orders")}</strong><p>{t("Acuan dibekukan sampai Anda memilih perbarui. Perubahan posisi atau batas membuat snapshot usang. Indeks belum dikalibrasi; jangan gunakan sebagai ukuran aman rekening.", "Reference stays frozen until you explicitly refresh it. Position or limit changes make the snapshot outdated. The index is uncalibrated; do not use it as an account-safety measure.")}</p></div>
      {!market.usableQuote && <div className="live-alert" role="status" style={{ marginTop: 12 }}>{t("Harga live tidak tersedia saat ini. Masukkan harga hipotetis sendiri; acuan live tidak diasumsikan.", "Live price is currently unavailable. Enter your own hypothetical price; no live reference is assumed.")}</div>}
      {blocked && <div className="live-alert" role="alert" style={{ marginTop: 12 }}>{storageError || t("Penyimpanan lokal diblokir. Simulasi tidak dapat dicatat sebagai posisi.", "Local storage is blocked. The simulation cannot be recorded as a position.")}</div>}
      {storageError && !blocked && <div style={{ marginTop: 12 }}><ErrorBox message={storageError}/></div>}
      <div className="live-inline-help live-sim-help"><span className="live-small">{t("Layer tambahan adalah skenario averaging pilihan Anda, bukan order otomatis.", "An added layer is your chosen averaging scenario, not an automatic order.")}</span><TermHelp term="averaging"/><TermHelp term="simulation"/></div>
      {!sim.snapshot ? <div className="mrg-simulation-start">
        <div className="live-field"><label htmlFor="simulation-side">{t("Sisi rangkaian", "Series direction")}</label><select id="simulation-side" value={simulationSide} onChange={(e) => setSimulationSide(e.target.value as Position["side"])}><option value="buy">{t("Buy", "Buy")}</option><option value="sell">{t("Sell", "Sell")}</option></select></div>
        <button type="button" className="live-button primary" onClick={startSimulation}><CopyPlus size={15}/>{t("Buat simulasi", "Create simulation")}</button>
      </div> : <>
        <div className="live-form-grid mrg-panel-fields">
          <Field label={t("Harga hipotetis", "Hypothetical entry price")} value={candidateEntry} onChange={(v) => updateCandidate("entry", v)} error={candidateEntry && !positive(candidateEntry) ? t("Harus positif.", "Must be positive.") : undefined} required />
          <Field label={t("Lot hipotetis", "Hypothetical lots")} value={candidateLots} onChange={(v) => updateCandidate("lots", v)} error={candidateLots && !positive(candidateLots) ? t("Harus positif.", "Must be positive.") : undefined} required />
        </div>
        <div className="live-row mrg-sim-actions">
          <span className="live-action-with-help"><button type="button" className="live-button" onClick={() => { const last = sim.snapshot?.positions.at(-1); if (!last) { setActionError(t("Belum ada posisi terakhir untuk menggandakan lot.", "There is no last position lot to double.")); return; } sim.doubleLastLot(); setCandidateLots(String(last.lots * 2)); setActionError(""); setRecordConfirm(false); }}><ChevronUp size={15}/>{t("Gandakan lot terakhir", "Double last lot")}</button><TermHelp term="martingale"/></span>
          <button type="button" className="live-button" disabled={!market.usableQuote} onClick={() => { sim.refreshReference(); if (market.usableQuote) setCandidateEntry(String(market.usableQuote.price)); setRecordConfirm(false); }}>{t("Gunakan harga terbaru untuk simulasi", "Use latest price for simulation")}</button>
          <button type="button" className="live-button" onClick={switchFromSimulationToSettings}>{t("Atur batas", "Set limits")}</button>
        </div>
        {sim.outdated && <div className="live-error" role="alert" style={{ marginTop: 12 }}>{t("Snapshot usang. Buat ulang simulasi sebelum mencatat.", "Snapshot is outdated. Recreate the simulation before recording.")}</div>}
        {sim.comparison && <div className="live-grid mrg-simulation-comparison">
          {[{ label: t("Sebelum", "Before"), risk: sim.comparison.before }, { label: t("Sesudah hipotetis", "Hypothetical after"), risk: sim.comparison.after }].map((item) => <div key={item.label} className="live-card live-span-6"><h3>{item.label}</h3><div className="live-grid mrg-simulation-metrics">
            <div className="live-metric live-span-4"><span className="live-small">{t("Total lot", "Total lots")}</span><strong>{show(item.risk.summary.totalLots, 4)}</strong></div>
            <div className="live-metric live-span-4"><span className="live-small">{t("Layer", "Layers")}</span><strong>{item.risk.summary.layers}</strong></div>
            <div className="live-metric live-span-4"><span className="live-small">{t("Rata-rata berbobot", "Weighted average")}</span><strong style={{ fontSize: 15 }}>{show(item.risk.summary.averageEntry)}</strong></div>
          </div><RiskSummary risk={item.risk}/></div>)}
        </div>}
        {sim.comparison && <div className="live-alert" style={{ marginTop: 12 }}>{sim.comparison.warning.id} / {sim.comparison.warning.en}<br/>{t("Snapshot:", "Snapshot:")} {new Date(sim.snapshot.at).toLocaleString()} · {t("harga acuan", "reference price")} {sim.snapshot.quote ? show(sim.snapshot.quote.price) : t("tidak tersedia", "unavailable")}. {t("Chart/ref harga emas harian bukan identik dengan kontrak XUL10.", "Daily gold reference and chart are not identical to the XUL10 contract.")}</div>}
        {!sim.comparison && <div className="live-small" style={{ marginTop: 12 }}>{t("Perbandingan muncul setelah harga dan lot positif dimasukkan.", "Comparison appears after a positive price and lot are entered.")}</div>}
        {actionError && <div className="live-error" role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
        {recordConfirm && <div className="live-alert mrg-record-confirm" role="alertdialog" aria-label={t("Konfirmasi catatan manual", "Confirm manual record")}><strong>{t("Konfirmasi catatan manual", "Confirm manual record")}</strong><p>{t("Ini hanya menyalin input ke catatan lokal. Tidak ada order yang dikirim, dan aplikasi tidak tahu apakah transaksi dilakukan.", "This only copies your input into local records. No order is sent, and the app cannot know whether a trade occurred.")}</p><button type="button" className="live-button" onClick={() => setRecordConfirm(false)}>{t("Batal", "Cancel")}</button></div>}
      </>}
    </AdaptivePanel>
  </LiveShell>;
}
