import { useState, type ReactNode } from "react";
import type { ScenarioPlan } from "@shared/scenario-plan";
import { scenarioFillStage, type FilledScenario } from "@shared/scenario-fill-stage";

type Props = {
  plan: ScenarioPlan;
  t: (id: string, en: string) => string;
  money: (value: number) => string;
  renderDiagram: (stage: FilledScenario) => ReactNode;
};

export function MarketLayerStages({ plan, t, money, renderDiagram }: Props) {
  const [selection, setSelection] = useState({ plan, count: plan.layers });
  // A new capture resets to all layers even if its timestamps/inputs match.
  // Polls keep the same frozen plan object and cannot reset the chosen stage.
  const count = selection.plan === plan ? selection.count : plan.layers;
  let stage: FilledScenario | null = null;
  try { stage = scenarioFillStage(plan, count); } catch { /* Explicit error below; never show a fallback TP. */ }

  return <section className="min-w-0 space-y-3" data-testid="market-layer-stages" aria-label={t("Ilustrasi layer terisi", "Illustrated filled layers")}>
    <div>
      <h3 className="text-sm font-bold">{t("Kalau yang terisi…", "If these layers are filled…")}</h3>
      <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label={t("Pilih asumsi layer terisi", "Choose assumed filled layers")}>
        {plan.entries.map(e => <button key={e.index} type="button"
          data-testid={`button-filled-${e.index}`} aria-pressed={count === e.index}
          onClick={() => setSelection({ plan, count: e.index })}
          className={`min-h-[44px] flex-1 rounded-md border px-3 text-sm font-bold ${count === e.index ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
          {e.index === 1 ? t("L1 saja", "L1 only") : `L1–L${e.index}`}{e.index === plan.layers ? t(" (semua)", " (all)") : ""}
        </button>)}
      </div>
      <p className="live-small mt-2">{t("Pilihan ilustrasi, bukan deteksi posisi nyata. Harga dan lot tetap dari snapshot; layer belum terisi tidak dihitung dalam rata-rata, TP, atau margin.", "Illustration, not detection of actual positions. Prices and lots stay frozen; unfilled layers are excluded from the average, TP and margin.")}</p>
    </div>
    {!stage ? <p role="alert" className="live-error" data-testid="fill-stage-error">{t("Tahap ini tidak memiliki TP dengan harga positif. Pilih tahap lain; parameter skenario tidak diubah.", "This stage has no positive TP price. Choose another stage; scenario parameters were not changed.")}</p> : <>
      <p className="live-small" data-testid="fill-stage-summary">{t(
        `${stage.filledLayers} dari ${plan.layers} layer diasumsikan terisi · ${stage.totalLots} lot terisi`,
        `${stage.filledLayers} of ${plan.layers} layers assumed filled · ${stage.totalLots} filled lots`,
      )}</p>
      {renderDiagram(stage)}
      {stage.pendingEntries.length > 0 && <p className="live-small">{t("Garis abu-abu putus: layer rencana yang belum terisi, bukan order aktif.", "Grey dashed lines: planned unfilled layers, not active orders.")}</p>}
      <table className="text-xs w-full" style={{ minWidth: 0 }} data-testid="table-scenario">
        <caption className="text-left live-small pb-1">{t("Level XUL10 dari snapshot. Sumbu adalah harga, bukan waktu.", "Frozen XUL10 levels. The axis is price, not time.")}</caption>
        <thead><tr><th className="text-left">{t("Level", "Level")}</th><th className="text-right">{t("Harga", "Price")}</th><th className="text-right">Lot</th></tr></thead>
        <tbody>
          {plan.entries.map(e => <tr key={e.index} data-filled={e.index <= count} className={e.index <= count ? "" : "text-muted-foreground"}>
            <td>Layer {e.index}<span className="block text-[10px]">{e.index <= count ? t("Asumsi terisi", "Assumed filled") : t("Belum terisi", "Unfilled")}</span></td>
            <td className="text-right live-mono">{e.price.toFixed(2)}</td><td className="text-right live-mono">{e.lots}</td>
          </tr>)}
          <tr data-testid="fill-stage-average"><td>{t("Rata-rata terisi", "Filled average")}</td><td className="text-right live-mono">{stage.average.toFixed(2)}</td><td className="text-right live-mono">{stage.totalLots}</td></tr>
          <tr data-testid="fill-stage-tp"><td>{t("TP tahap ini", "This stage's TP")}</td><td className="text-right live-mono">{stage.tp.toFixed(2)}</td><td /></tr>
          <tr><td>{t("Titik stress tetap", "Fixed stress price")}</td><td className="text-right live-mono">{stage.stressPrice.toFixed(2)}</td><td /></tr>
        </tbody>
      </table>
      <dl className="text-sm grid grid-cols-2 gap-2" data-testid="fill-stage-totals">
        <dt>{t("Margin terisi", "Filled margin")}</dt><dd>{money(stage.margin)} ({stage.marginPercent.toFixed(1)}%)</dd>
        <dt>{t("Rugi di titik stress", "Loss at stress price")}</dt><dd>{money(stage.stressLoss)} ({stage.stressPercent.toFixed(1)}%)</dd>
        <dt>{t("Profit di TP tahap ini", "Profit at stage TP")}</dt><dd>{money(stage.targetProfit)}</dd>
      </dl>
      <p className="live-small">{t("Stress memakai titik harga skenario penuh, hanya lot terisi yang dihitung. Memilih tahap tidak mengubah lot atau penilaian kelayakan basket penuh.", "Stress uses the full scenario's fixed price, counting filled lots only. Choosing a stage does not resize lots or reassess full-basket eligibility.")}</p>
    </>}
  </section>;
}
