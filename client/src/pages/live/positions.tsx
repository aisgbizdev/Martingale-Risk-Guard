import { useMemo, useState } from "react";
import { Check, ChevronUp, CopyPlus, Pencil, Plus, RotateCcw, Save, Settings2, Trash2, X } from "lucide-react";
import type { Position, PositionSettings } from "@shared/live-types";
import { evaluatePositionRisk, stressScenarios, summarizePositions } from "@shared/position-risk";
import { useMarket } from "@/hooks/use-market";
import { usePositionSimulation } from "@/hooks/use-position-simulation";
import { usePortfolio } from "@/lib/portfolio-context";
import { useLanguage } from "@/lib/language-context";
import { LiveShell } from "@/components/live/live-shell";
import { ErrorBox, Field, PageIntro, Panel, RiskSummary } from "@/components/live/live-ui";
import { TermHelp } from "@/components/live/term-help";

const show = (value: number | null, digits = 3) => value === null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
const positive = (raw: string) => Number.isFinite(Number(raw)) && Number(raw) > 0;
const nullable = (raw: string) => raw.trim() === "" ? null : Number(raw);
type PositionForm = { side: Position["side"]; entry: string; lots: string; enteredAt: string };
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
  const [form, setForm] = useState<PositionForm>(blankPosition());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [settings, setSettings] = useState<PositionSettings>(portfolio.settings);
  const [settingsError, setSettingsError] = useState("");
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [simulationSide, setSimulationSide] = useState<Position["side"]>("buy");
  const [candidateEntry, setCandidateEntry] = useState("");
  const [candidateLots, setCandidateLots] = useState("");
  const [recordConfirm, setRecordConfirm] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [stressPercent, setStressPercent] = useState("3");
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
  };
  const submitPosition = () => {
    const errors: string[] = [];
    if (!positive(form.entry)) errors.push(t("Harga masuk harus berupa angka positif.", "Entry price must be a positive number."));
    if (!positive(form.lots)) errors.push(t("Lot harus berupa angka positif.", "Lots must be a positive number."));
    if (errors.length) { setFormError(errors.join(" ")); return; }
    try {
      const input = { symbol: "XUL10" as const, side: form.side, entry: Number(form.entry), lots: Number(form.lots), enteredAt: form.enteredAt ? new Date(form.enteredAt).toISOString() : null };
      if (editingId) updatePosition(editingId, input); else addPosition(input);
      setEditingId(null); setForm(blankPosition(form.side)); setFormError(""); setActionError(""); setEntryOpen(false);
    } catch (error) { setFormError(error instanceof Error ? error.message : t("Posisi belum tersimpan.", "Position was not saved.")); }
  };
  const edit = (position: Position) => {
    setEditingId(position.id);
    setForm({ side: position.side, entry: String(position.entry), lots: String(position.lots), enteredAt: position.enteredAt ? localDateTime(position.enteredAt) : "" });
    setFormError("");
    setEntryOpen(true);
    window.requestAnimationFrame(() => document.getElementById("position-entry-controls")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const startSimulation = () => {
    setSimulationOpen(true);
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
  };
  const closeSimulation = () => { sim.close(); setRecordConfirm(false); setCandidateEntry(""); setCandidateLots(""); setSimulationOpen(false); };
  const record = () => {
    if (!candidateEntry.trim() || !candidateLots.trim() || !positive(candidateEntry) || !positive(candidateLots) || !sim.candidateValid || sim.outdated) {
      setActionError(t("Masukkan harga dan lot positif, lalu buat ulang simulasi jika posisi atau batas berubah.", "Enter a positive price and lot, and recreate the simulation if positions or limits changed."));
      return;
    }
    try { sim.record(); setRecordConfirm(false); setActionError(""); setCandidateEntry(""); setCandidateLots(""); }
    catch (error) { setActionError(error instanceof Error ? error.message : t("Simulasi belum dapat dicatat.", "Simulation could not be recorded.")); }
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
    if (Object.keys(nextErrors).length) {
      setSettingsError("");
      return;
    }
    try { saveSettings(settings); setSettingsError(""); setSettingsFieldErrors({}); setActionError(""); setSettingsOpen(false); }
    catch (error) { setSettingsError(error instanceof Error ? error.message : t("Pengaturan gagal disimpan.", "Settings could not be saved.")); }
  };
  const openGuideStep = (open: () => void, targetId: string) => {
    open();
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  return <LiveShell>
    <PageIntro kicker={t("Posisi · perangkat ini saja", "Positions · this device only")} title={t("Catat, lalu bandingkan.", "Record, then compare.")}>
      {t("Isi posisi secara manual. Simulasi layer adalah perbandingan hipotetis; mencatat simulasi tidak mengeksekusi order dan tidak membuktikan transaksi dilakukan.", "Enter positions manually. Layer simulation is hypothetical; recording it does not execute an order or verify a trade occurred.")}
    </PageIntro>
    <nav className="live-learning-steps" aria-label={t("Langkah penggunaan", "How to use these tools")}>
      <span className="live-learning-caption">{t("Mulai di sini", "Start here")}</span>
      <button type="button" onClick={() => openGuideStep(() => setEntryOpen(true), "position-entry-controls")}><span>1</span>{t("Catat posisi", "Record a position")}</button>
      <button type="button" onClick={() => openGuideStep(() => setSettingsOpen(true), "settings-controls")}><span>2</span>{t("Atur batas", "Set limits")}</button>
      <button type="button" onClick={() => openGuideStep(() => setSimulationOpen(true), "simulation-controls")}><span>3</span>{t("Bandingkan simulasi", "Compare a simulation")}</button>
    </nav>
    {(storageError || actionError) && <div style={{ marginTop: 16 }}><ErrorBox message={actionError || storageError || ""} /></div>}
    {blocked && <div style={{ marginTop: 12 }} className="live-alert">{t("Penyimpanan lokal diblokir karena data tersimpan tidak dapat dibaca. Jangan timpa data yang ada.", "Local storage is blocked because existing data could not be read. Existing data will not be overwritten.")}</div>}
    <div className="live-grid">
      {entryOpen ? <Panel id="position-entry-controls" className="live-span-7" title={editingId ? t("Ubah posisi", "Edit position") : t("Tambah catatan posisi", "Add a position record")} eyebrow={t("Input pengguna · tidak terhubung ke broker", "User input · not connected to a broker")} action={<button type="button" className="live-icon-btn live-form-close" onClick={() => setEntryOpen(false)} aria-label={t("Tutup form posisi", "Close position form")}><X size={16}/></button>}>
        <div className="live-form-grid">
          <div className="live-field"><label htmlFor="position-side">{t("Arah posisi", "Position direction")}</label><select id="position-side" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as Position["side"] })}><option value="buy">{t("Buy", "Buy")}</option><option value="sell">{t("Sell", "Sell")}</option></select></div>
          <Field label={t("Harga masuk XUL10", "XUL10 entry price")} value={form.entry} onChange={(entry) => setForm({ ...form, entry })} error={formError && !positive(form.entry) ? t("Masukkan harga positif.", "Enter a positive price.") : undefined} required />
          <Field label={t("Lot", "Lots")} value={form.lots} onChange={(lots) => setForm({ ...form, lots })} error={formError && !positive(form.lots) ? t("Masukkan lot positif.", "Enter a positive lot amount.") : undefined} required help={<TermHelp term="lot"/>} />
          <Field label={t("Waktu masuk (opsional)", "Entry time (optional)")} type="datetime-local" value={form.enteredAt} onChange={(enteredAt) => setForm({ ...form, enteredAt })} />
        </div>
        <div className="live-inline-help live-inline-note"><span className="live-small">{t("Menambah catatan layer tidak otomatis menambah ukuran.", "Adding a recorded layer does not automatically increase size.")}</span><TermHelp term="averaging"/></div>
        {formError && <div className="live-error" role="alert" style={{ marginTop: 10 }}>{formError}</div>}
        <div className="live-row" style={{ justifyContent: "start", marginTop: 16, flexWrap: "wrap" }}>
          <button className="live-button primary" disabled={blocked} onClick={submitPosition}>{editingId ? <Save size={15}/> : <Plus size={15}/>} {editingId ? t("Simpan perubahan", "Save changes") : t("Catat posisi", "Record position")}</button>
          {editingId && <button className="live-button" onClick={() => { setEditingId(null); setForm(blankPosition()); setFormError(""); }}><X size={15}/>{t("Batal", "Cancel")}</button>}
        </div>
      </Panel> : <button id="position-entry-controls" type="button" className="live-section-toggle live-span-12" aria-expanded={false} onClick={() => setEntryOpen(true)}>
        <span className="live-section-icon">{editingId ? <Pencil size={18}/> : <Plus size={19}/>}</span><span className="live-section-copy"><strong>{editingId ? t("Ubah posisi", "Edit position") : t("Catat posisi", "Record a position")}</strong><small>{editingId ? t("Lanjutkan perubahan pada catatan manual", "Continue editing this manual record") : t("Input manual · XUL10 · tanpa order", "Manual entry · XUL10 · no orders")}</small></span><span className="live-section-cta">{t("Buka", "Open")}</span>
      </button>}
      <Panel id="settings-controls" className="live-span-5" title={t("Batas & preferensi", "Limits & preferences")} eyebrow={t("Bukan target atau rekomendasi", "Not a target or recommendation")} action={<button className="live-button live-section-settings-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-label={t("Tampilkan pengaturan", "Show settings")}><Settings2 size={16}/>{settingsOpen ? t("Tutup", "Close") : t("Atur batas", "Edit limits")}</button>}>
        <p className="live-small">{t("Modal dan ekuitas dipisahkan. Tidak ada klaim P/L uang, margin, atau risiko rekening; ukuran kontrak dan konversi poin belum tervalidasi.", "Capital and equity are separate. No monetary P/L, margin, or account-risk claims; contract size and point conversion are not verified.")}</p>
        <div className="live-row" style={{ marginTop: 14 }}><span className="live-small">{t("Mata uang", "Currency")}</span><strong>{portfolio.settings.currency}</strong></div>
        <div className="live-row" style={{ marginTop: 9 }}><span className="live-inline-help"><span className="live-small">{t("Batas lot / layer", "Lot / layer limit")}</span><TermHelp term="limits"/><TermHelp term="layers"/></span><strong>{portfolio.settings.maxLots ?? "—"} / {portfolio.settings.maxLayers ?? "—"}</strong></div>
        <div className="live-row" style={{ marginTop: 9 }}><span className="live-small">{t("Target / jarak layer", "Target / layer spacing")}</span><strong>{show(portfolio.settings.targetPriceDistance)} / {show(portfolio.settings.layerSpacingPrice)}</strong></div>
        {settingsOpen && <div className="live-stack" style={{ marginTop: 16 }}>
          <div className="live-field"><label htmlFor="settings-currency">{t("Mata uang nominal", "Amount currency")}</label><select id="settings-currency" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value as "USD" | "IDR" })}><option>USD</option><option>IDR</option></select></div>
          <div className="live-form-grid">
            <Field label={t("Modal (opsional)", "Capital (optional)")} value={numberText(settings.capital)} onChange={(v) => setSetting("capital", v)} error={settingsFieldErrors.capital} />
            <Field label={t("Ekuitas berjalan (opsional)", "Current equity (optional)")} value={numberText(settings.equity)} onChange={(v) => setSetting("equity", v)} error={settingsFieldErrors.equity} />
            <Field label={t("Batas total lot", "Total lot limit")} value={numberText(settings.maxLots)} onChange={(v) => setSetting("maxLots", v)} error={settingsFieldErrors.maxLots} hint={t("Diperlukan untuk indeks lot.", "Required for the lot index.")} help={<TermHelp term="limits"/>} />
            <Field label={t("Batas jumlah layer", "Layer count limit")} value={numberText(settings.maxLayers)} onChange={(v) => setSetting("maxLayers", v)} error={settingsFieldErrors.maxLayers} step="1" hint={t("Diperlukan untuk indeks layer.", "Required for the layer index.")} help={<TermHelp term="layers"/>} />
            <Field label={t("Target jarak harga (opsional)", "Target price distance (optional)")} value={numberText(settings.targetPriceDistance)} onChange={(v) => setSetting("targetPriceDistance", v)} error={settingsFieldErrors.targetPriceDistance} hint={t("Satuan harga mentah; spesifikasi poin tidak diverifikasi.", "Raw price units; point specification is unverified.")} />
            <Field label={t("Jarak layer (opsional)", "Layer spacing (optional)")} value={numberText(settings.layerSpacingPrice)} onChange={(v) => setSetting("layerSpacingPrice", v)} error={settingsFieldErrors.layerSpacingPrice} hint={t("Terpisah dari target; satuan harga mentah.", "Separate from target; raw price units.")} />
          </div>
          {settingsError && <div className="live-error" role="alert">{settingsError}</div>}
          <div className="live-row" style={{ justifyContent: "start" }}><button className="live-button primary" onClick={doSaveSettings}><Save size={15}/>{t("Simpan batas", "Save limits")}</button><button className="live-button" onClick={() => { setSettings(portfolio.settings); setSettingsFieldErrors({}); setSettingsError(""); }}>{t("Batalkan perubahan", "Discard changes")}</button></div>
        </div>}
      </Panel>
      <Panel className="live-span-12" title={t("Rangkaian posisi", "Position series")} eyebrow={`${portfolio.positions.length} ${t("catatan tersimpan lokal", "local records")}`} action={<div className="live-row" style={{ flexWrap: "wrap" }}>
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
                <div className="live-row" style={{ gap: 4 }}><button className="live-icon-btn" onClick={() => edit(p)} aria-label={t("Ubah posisi", "Edit position")}><Pencil size={14}/></button><button className="live-icon-btn" onClick={() => { if (window.confirm(t("Hapus catatan posisi ini?", "Delete this position record?"))) try { removePosition(p.id); setActionError(""); } catch (e) { setActionError(String(e)); } }} aria-label={t("Hapus posisi", "Delete position")}><Trash2 size={14}/></button></div>
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
      <details className="live-disclosure live-span-12"><summary>{t("Skenario tekanan pilihan Anda", "Your chosen stress scenario")}</summary><Panel className="live-span-12" title={t("Skenario tekanan pilihan Anda", "Your chosen stress scenario")} eyebrow={t("Simulasi harga · bukan prediksi", "Price simulation · not a prediction")}>
        <Field label={t("Pergerakan melawan posisi (%)", "Adverse price move (%)")} value={stressPercent} onChange={setStressPercent} error={!stressValid ? t("Masukkan persentase lebih dari 0 dan kurang dari 100.", "Enter a percentage greater than 0 and less than 100.") : undefined} hint={t("Hasil muncul di setiap rangkaian bila harga feed masih baru. Persentase ini bukan probabilitas kejadian.", "Results appear in each series when the feed price is fresh. This percentage is not an event probability.")}/>
      </Panel></details>
      {!sim.snapshot && !simulationOpen ? <button id="simulation-controls" type="button" className="live-section-toggle live-span-12" aria-expanded={false} onClick={() => setSimulationOpen(true)}>
        <span className="live-section-icon"><CopyPlus size={19}/></span><span className="live-section-copy"><strong>{t("Simulasi tambah layer", "Simulate another layer")}</strong><small>{t("Perbandingan hipotetis · snapshot terpisah · tanpa transaksi", "Hypothetical comparison · separate snapshot · no trade")}</small></span><span className="live-section-cta">{t("Buka", "Open")}</span>
      </button> : <Panel id="simulation-controls" className="live-span-12" title={t("Simulasikan tambahan layer", "Compare an additional layer")} eyebrow={t("Snapshot terpisah · tidak ada transaksi", "Separate snapshot · no trade execution")} action={sim.snapshot && <button className="live-icon-btn" onClick={closeSimulation} aria-label={t("Tutup simulasi", "Close simulation")}><X size={15}/></button>}>
        <div className="live-inline-help live-sim-help"><span className="live-small">{t("Layer tambahan adalah skenario averaging pilihan Anda, bukan order otomatis.", "An added layer is your chosen averaging scenario, not an automatic order.")}</span><TermHelp term="averaging"/><TermHelp term="simulation"/></div>
        {!sim.snapshot ? <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap" }}>
          <div className="live-field" style={{ minWidth: 150 }}><label htmlFor="simulation-side">{t("Sisi rangkaian", "Series direction")}</label><select id="simulation-side" value={simulationSide} onChange={(e) => setSimulationSide(e.target.value as Position["side"])}><option value="buy">{t("Buy", "Buy")}</option><option value="sell">{t("Sell", "Sell")}</option></select></div>
          <button className="live-button primary" onClick={startSimulation}><CopyPlus size={15}/>{t("Buat simulasi", "Create simulation")}</button>
        </div> : <>
          <div className="live-alert">{t("Gunakan harga dan lot hipotetis yang Anda masukkan. Acuan dan waktu dibekukan sampai Anda memilih perbarui acuan. Perubahan posisi atau batas membuat snapshot usang.", "Use your own hypothetical price and lot. The reference and time are frozen until you explicitly refresh it. Position or limit changes make this snapshot outdated.")}</div>
          <div className="live-form-grid" style={{ marginTop: 16 }}>
            <Field label={t("Harga hipotetis", "Hypothetical entry price")} value={candidateEntry} onChange={(v) => updateCandidate("entry", v)} error={candidateEntry && !positive(candidateEntry) ? t("Harus positif.", "Must be positive.") : undefined} required />
            <Field label={t("Lot hipotetis", "Hypothetical lots")} value={candidateLots} onChange={(v) => updateCandidate("lots", v)} error={candidateLots && !positive(candidateLots) ? t("Harus positif.", "Must be positive.") : undefined} required />
          </div>
          <div className="live-row" style={{ justifyContent: "start", flexWrap: "wrap", marginTop: 14 }}>
            <span className="live-action-with-help"><button className="live-button" onClick={() => { const last = sim.snapshot?.positions.at(-1); if (!last) { setActionError(t("Belum ada posisi terakhir untuk menggandakan lot.", "There is no last position lot to double.")); return; } sim.doubleLastLot(); setCandidateLots(String(last.lots * 2)); setActionError(""); }}><ChevronUp size={15}/>{t("Gandakan lot terakhir", "Double last lot")}</button><TermHelp term="martingale"/></span>
            <button className="live-button" disabled={!market.usableQuote} onClick={() => { sim.refreshReference(); if (market.usableQuote) setCandidateEntry(String(market.usableQuote.price)); }}>{t("Gunakan harga terbaru untuk simulasi", "Use latest price for simulation")}</button>
            <button className="live-button" onClick={closeSimulation}>{t("Tutup simulasi", "Close simulation")}</button>
          </div>
          {sim.outdated && <div className="live-error" role="alert" style={{ marginTop: 12 }}>{t("Snapshot usang. Buat ulang simulasi sebelum mencatat.", "Snapshot is outdated. Recreate it before recording.")}</div>}
          {sim.comparison && <div className="live-grid" style={{ margin: "14px 0 0" }}>
            {[{ label: t("Sebelum", "Before"), risk: sim.comparison.before }, { label: t("Sesudah hipotetis", "Hypothetical after"), risk: sim.comparison.after }].map((item) => <div key={item.label} className="live-card live-span-6"><h3>{item.label}</h3><div className="live-grid" style={{ margin: "12px 0" }}>
              <div className="live-metric live-span-4"><span className="live-small">{t("Total lot", "Total lots")}</span><strong>{show(item.risk.summary.totalLots, 4)}</strong></div>
              <div className="live-metric live-span-4"><span className="live-small">{t("Layer", "Layers")}</span><strong>{item.risk.summary.layers}</strong></div>
              <div className="live-metric live-span-4"><span className="live-small">{t("Rata-rata berbobot", "Weighted average")}</span><strong style={{ fontSize: 15 }}>{show(item.risk.summary.averageEntry)}</strong></div>
            </div><RiskSummary risk={item.risk}/></div>)}
          </div>}
          {sim.comparison && <div className="live-alert" style={{ marginTop: 12 }}>{sim.comparison.warning.id} / {sim.comparison.warning.en}<br/>{t("Snapshot:", "Snapshot:")} {new Date(sim.snapshot.at).toLocaleString()} · {t("harga acuan", "reference price")} {sim.snapshot.quote ? show(sim.snapshot.quote.price) : t("tidak tersedia", "unavailable")}. {t("Chart/ref harga emas harian bukan identik dengan kontrak XUL10.", "Daily gold reference and chart are not identical to XUL10.")}</div>}
          {!sim.comparison && <div className="live-small" style={{ marginTop: 12 }}>{t("Perbandingan muncul setelah harga dan lot positif dimasukkan.", "Comparison appears after a positive price and lot are entered.")}</div>}
          {actionError && <div className="live-error" role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
            {!recordConfirm ? <button className="live-button primary" style={{ marginTop: 14 }} disabled={!sim.candidateValid || sim.outdated || !positive(candidateEntry) || !positive(candidateLots)} onClick={() => setRecordConfirm(true)}><Check size={15}/>{t("Catat sebagai posisi manual", "Record as manual position")}</button> :
            <div className="live-alert" style={{ marginTop: 14 }} role="alertdialog"><strong>{t("Konfirmasi catatan manual", "Confirm manual record")}</strong><p>{t("Ini hanya menyalin input ke catatan lokal. Tidak ada order yang dikirim, dan aplikasi tidak tahu apakah transaksi dilakukan.", "This only copies your input into local records. No order is sent, and the app cannot know whether a trade occurred.")}</p><button className="live-button primary" onClick={record}>{t("Ya, tambahkan ke catatan", "Yes, add to records")}</button><button className="live-button" style={{ marginLeft: 8 }} onClick={() => setRecordConfirm(false)}>{t("Batal", "Cancel")}</button></div>}
        </>}
      </Panel>}
      <div className="live-span-12 live-small">{t("Data posisi tersimpan lokal tanpa cloud sync. Reset lokal juga menghapus preferensi MRG dan skenario kalkulator dasar yang tersimpan.", "Position data stays local without cloud sync. Local reset also removes MRG preferences and saved basic calculator scenarios.")}</div>
    </div>
  </LiveShell>;
}
