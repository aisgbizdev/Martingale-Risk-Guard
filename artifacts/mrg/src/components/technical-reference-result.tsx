import { useState } from "react";
import { referenceFillStage, type TechnicalReferencePlan } from "@shared/technical-reference-plan";
import { referenceDistance } from "@shared/reference-zones";
import { GuideLink } from "@/components/guide-link";

type Props = { plan: TechnicalReferencePlan; t: (id: string, en: string) => string; money: (n: number) => string };

export function TechnicalReferenceResult({ plan, t, money }: Props) {
  const [sel, setSel] = useState({ plan, count: plan.entries.length });
  const count = sel.plan === plan ? sel.count : plan.entries.length;
  let stage: ReturnType<typeof referenceFillStage> | null = null;
  try { stage = referenceFillStage(plan, count); } catch { /* explicit error below */ }
  const buy = plan.side === "buy";
  const directionName = buy ? "Buy" : "Sell";
  const entryName = (index: number) => `${directionName} ${index}`;
  const fx = (n: number) => n.toFixed(2);
  const prov = (labels: string[]) => labels.join(" + ");
  // A dev hot update can retain an in-memory snapshot from the old plan schema.
  // Do not silently reprice it or render it as a plan using the new zone rules.
  if (!plan.spacing || !plan.zones || !plan.previousSelection || !plan.stop?.members) {
    return <p role="alert" className="live-error">{t(
      "Snapshot memakai aturan lama. Hitung ulang Saran MRG untuk memakai zona D1; hasil lama tidak diubah otomatis.",
      "This snapshot uses the old rules. Recalculate the MRG suggestion to use D1 zones; old results are never rewritten automatically.")}</p>;
  }
  // Level ladder: rows ordered by price, no numeric scale, so labels cannot overlap.
  type Row = { key: string; label: string; price: number; color: string; dash?: boolean; note: string };
  const rows: Row[] = [];
  if (stage) {
    rows.push({ key: "tp", label: "TP", price: stage.target.price, color: "#2f855a", note: prov(stage.target.labels) });
    rows.push({ key: "avg", label: t(`Rerata ${count} posisi`, `${count}-entry avg`), price: stage.average, color: "#b7791f", note: `${count}/${plan.entries.length}` });
  }
  plan.entries.forEach(e => rows.push({ key: `e${e.index}`, label: entryName(e.index), price: e.price, color: e.index <= count ? "#2b6cb0" : "#9ca3af", dash: e.index > count, note: prov(e.labels) }));
  rows.push({ key: "sl", label: t("Batas batal", "Invalidation"), price: plan.stop.price, color: "#c53030", note: prov(plan.stop.labels) });
  rows.sort((a, b) => b.price - a.price);
  const rowH = 26, h = rows.length * rowH + 10;
  const label = t(
    `Skema level LGD Daily, bukan grafik waktu. ${rows.map(r => `${r.label} ${fx(r.price)}`).join(", ")}`,
    `LGD Daily level schematic, not a time chart. ${rows.map(r => `${r.label} ${fx(r.price)}`).join(", ")}`);
  return <section className="min-w-0 space-y-3 live-card" data-testid="technical-reference-result">
     <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{buy ? "Buy" : "Sell"} · {plan.strategy}</h3><GuideLink topic="strategi" compact /></div>
     <p className="live-small">{plan.source} · D1 {plan.sourceDate}</p>
    <p role="alert" className="live-error" data-testid="reference-warning">{t(
      "Referensi LGD, bukan level XUL10 presisi. Bukan perintah entry.",
      "LGD reference, not precise XUL10 levels. Not an entry instruction.")}</p>
      <p className="live-small" data-testid="reference-spacing">{t(
        `Jarak min. ${fx(plan.spacing.minimumGap)} poin · ${fx(plan.spacing.factor).replace(".", ",")} × ATR D1 ${fx(plan.spacing.atr14)}`,
        `Min. gap ${fx(plan.spacing.minimumGap)} points · ${fx(plan.spacing.factor)} × D1 ATR ${fx(plan.spacing.atr14)}`)} <GuideLink topic="atr-zona" compact /></p>
      <div className="rounded-lg border border-border p-3 space-y-2" data-testid="reference-context-status" role="status">
       <strong className="text-sm">{plan.contextStatus === "wait"
         ? t("Rencana tersedia · Tunggu agenda/kejelasan", "Plan available · Wait for event/clarity")
         : plan.contextStatus === "incomplete"
           ? t("Rencana tersedia · Konteks belum lengkap", "Plan available · Context incomplete")
           : t("Rencana tersedia · Bersyarat, bukan perintah entry", "Plan available · Conditional, not an entry instruction")}</strong>
       {plan.contextStatus === "wait" && plan.contextReasons.filter(r => r.en.startsWith("Wait for")).map((r, i) => <p className="live-small" key={i}>{t(r.id, r.en)}</p>)}
       {plan.entries.length < plan.maxLayers && <p className="live-small" data-testid="reference-fewer-layers">{t(`Struktur menyediakan ${plan.entries.length} layer dengan batas batal berikutnya. Tidak memaksakan tiga layer.`, `The structure provides ${plan.entries.length} layers with a further invalidation level. No forced third layer.`)}</p>}
     </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("Pilih asumsi layer terisi", "Choose assumed filled layers")}>
      {plan.entries.map(e => <button key={e.index} type="button" data-testid={`reference-filled-${e.index}`} aria-pressed={count === e.index}
        onClick={() => setSel({ plan, count: e.index })}
        className={`min-h-[44px] flex-1 rounded-md border px-3 text-sm font-bold ${count === e.index ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
         {e.index === 1 ? t(`${directionName} 1 saja`, `${directionName} 1 only`) : `${directionName} 1–${e.index}`}</button>)}
    </div>
    <p className="live-small">{t("Asumsi posisi terisi · bukan deteksi transaksi", "Assumed fills · not transaction detection")} <GuideLink topic="rata-rata" compact /></p>
    {!stage ? <p role="alert" className="live-error">{t("Tahap ini tidak punya TP teknikal. Pilih tahap lain.", "This stage has no technical TP. Choose another stage.")}</p> : <>
      <svg viewBox={`0 0 320 ${h}`} width="100%" role="img" aria-label={label} data-testid="reference-diagram" style={{ maxWidth: 480 }}>
        <title>{label}</title>
        <line x1="100" y1="2" x2="100" y2={h - 2} stroke="#9ca3af" strokeWidth="1" />
        {rows.map((r, i) => <g key={r.key}>
          <line x1="104" x2="210" y1={i * rowH + 15} y2={i * rowH + 15} stroke={r.color} strokeWidth="2" strokeDasharray={r.dash ? "4 3" : undefined} />
          <text x="96" y={i * rowH + 19} textAnchor="end" fontSize="11" fill="currentColor">{r.label}</text>
          <text x="216" y={i * rowH + 19} fontSize="11" fill="currentColor" className="live-mono">{fx(r.price)}</text>
        </g>)}
      </svg>
      <p className="live-small">{t("Skema level LGD · jarak garis tidak berskala · bukan grafik waktu", "LGD level schematic · lines not to scale · not a time chart")}</p>
      <table className="text-xs w-full" style={{ minWidth: 0 }} data-testid="reference-entries">
        <caption className="text-left live-small pb-1">{t("Level dari rumus Pivot/Fibonacci/High-Low D1", "Levels from Pivot/Fibonacci/High-Low D1 formulas")}</caption>
        <thead><tr><th className="text-left">Level</th><th className="text-right">{t("Harga", "Price")}</th><th className="text-right">{t("Bobot", "Weight")}</th><th className="text-right">Lot</th></tr></thead>
        <tbody>
          {plan.entries.map((e, i) => <tr key={e.index} className={e.index <= count ? "" : "text-muted-foreground"} style={e.index <= count ? undefined : { color: "#9ca3af" }}>
            <td>{entryName(e.index)}<span className="block text-[10px]">{e.index <= count ? t("asumsi terisi", "assumed filled") : t("tertunda", "pending")}</span>
              {i > 0 && <span className="block text-[10px]" data-testid={`reference-gap-${e.index}`}>{t(
              `Jarak ${fx(referenceDistance(e.price, plan.entries[i - 1].price))} poin`,
              `Gap ${fx(referenceDistance(e.price, plan.entries[i - 1].price))} points`)}</span>}</td>
            <td className="text-right live-mono">{fx(e.price)}</td><td className="text-right live-mono">{plan.weights[i]}x</td>
            <td className="text-right live-mono">{plan.firstLot === null ? "–" : plan.weights[i] * plan.firstLot}</td></tr>)}
          <tr data-testid="reference-average"><td>{t(`Rata-rata ${count} posisi`, `${count}-entry average`)} <GuideLink topic="rata-rata" compact /></td><td className="text-right live-mono">{fx(stage.average)}</td><td colSpan={2} /></tr>
          <tr data-testid="reference-tp"><td>{t("TP teknikal", "Technical TP")} <GuideLink topic="tp-batas" compact /></td><td className="text-right live-mono">{fx(stage.target.price)}</td><td colSpan={2} /></tr>
          <tr data-testid="reference-stop"><td>{t("Batas batal (tetap)", "Invalidation (fixed)")} <GuideLink topic="tp-batas" compact />
            <span className="block text-[10px]">{t(`Jarak dari ${entryName(plan.entries.length)}: ${fx(referenceDistance(plan.stop.price, plan.entries.at(-1)!.price))} poin`, `Gap from ${entryName(plan.entries.length)}: ${fx(referenceDistance(plan.stop.price, plan.entries.at(-1)!.price))} points`)}</span></td><td className="text-right live-mono">{fx(plan.stop.price)}</td><td colSpan={2} /></tr>
        </tbody>
      </table>
      {plan.firstLot !== null ? <div data-testid="reference-sizing">
        <p className="text-sm font-bold" data-testid="reference-first-lot">{t("Lot awal otomatis", "Automatic first lot")}: {plan.firstLot}</p>
        <dl className="text-sm grid grid-cols-2 gap-2">
          {stage.totalLots !== null && <><dt>{t("Total lot terisi", "Filled lots")}</dt><dd>{stage.totalLots}</dd></>}
          {stage.margin !== null && <><dt>Margin</dt><dd>{money(stage.margin)}</dd></>}
          {stage.lossAtStop !== null && <><dt>{t("Rugi di batas batal", "Loss at invalidation")}</dt><dd>{money(stage.lossAtStop)}</dd></>}
          {stage.profitAtTarget !== null && <><dt>{t("Profit di TP", "Profit at TP")}</dt><dd>{money(stage.profitAtTarget)}</dd></>}
        </dl>
        <p className="live-small">{t("Ilustrasi tanpa spread/biaya; bukan eksekusi XUL10.", "Illustration excluding spread/fees; not XUL10 execution.")} <GuideLink topic="modal-risiko" compact /></p>
      </div> : <p className="live-small" data-testid="reference-no-lot">{t(
        "Bobot ilustratif saja: belum ada lot utuh yang memenuhi batas modal simulasi. Bukan larangan entry.",
        "Illustrative weights only: no whole-lot size fits the simulation budget. Not an entry prohibition.")} <GuideLink topic="modal-risiko" compact /></p>}
    </>}
    <details className="live-details" data-testid="reference-details">
      <summary>{t("Konteks dan sumber", "Context and source")}</summary>
      {plan.contextReasons.map((r, i) => <p className="live-small" key={i}>{t(r.id, r.en)}</p>)}
      <p className="live-small">{t("Sumber", "Source")}: {plan.source} · {t("tanggal D1", "D1 date")} {plan.sourceDate} · {t("snapshot", "snapshot")} {String(plan.evaluatedAt)}</p>
      <p className="live-small">{t("Modal snapshot", "Snapshot capital")}: {money(plan.capital)}</p>
      {stage && <p className="live-small">TP {fx(stage.target.price)} · {prov(stage.target.labels)}</p>}
       <p className="live-small">{t("Harga running XUL10 saat evaluasi (hanya pembanding)", "Running XUL10 quote at evaluation (comparison only)")}: {fx(plan.selectionQuote.price)} · {plan.selectionQuote.asOf} · {plan.selectionQuote.source}</p>
      <GuideLink topic="pivot-fibo" />
        <div className="space-y-2" data-testid="reference-zone-audit">
          {[...plan.entries, plan.stop].map((zone, i) => <p key={i} className="live-small">
            {i < plan.entries.length ? entryName(i + 1) : t("Batas batal", "Invalidation")} {fx(zone.price)} · {prov(zone.labels)}
            {zone.members.length > 1 ? <> — {t("digabung, bukan entry tambahan", "grouped, not additional entries")}: {zone.members.slice(1).map(m => `${fx(m.price)} (${prov(m.labels)})`).join("; ")}</> : <> — {t("zona tersendiri", "separate zone")}</>}
          </p>)}
        </div>
    </details>
  </section>;
}
