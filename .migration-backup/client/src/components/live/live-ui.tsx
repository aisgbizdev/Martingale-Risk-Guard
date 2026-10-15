import type { ReactNode } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import type { PositionRisk } from "@shared/position-risk";
import type { Copy } from "@shared/live-types";
import { useLanguage } from "@/lib/language-context";
import { TermHelp } from "@/components/live/term-help";

export function Text({ id, en }: Copy) { const { t } = useLanguage(); return <>{t(id, en)}</>; }
export function PageIntro({ kicker, title, children, action, compact = false }: { kicker: string; title: string; children?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return <div className="live-page-intro">
    <div className="live-row" style={{ alignItems: "center", flexWrap: "wrap" }}>
      <div><div className="live-kicker">{kicker}</div><h1 className="live-title">{title}</h1></div>{action}
    </div>
    {!compact && children && <details className="live-intro-copy"><summary><Text id="Tentang halaman ini" en="About this page" /></summary><div className="live-subtitle">{children}</div></details>}
  </div>;
}
export function Panel({ title, eyebrow, action, children, className = "", id, "data-testid": dataTestId }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string; "data-testid"?: string }) {
  return <section id={id} data-testid={dataTestId} className={`live-card ${className}`}><div className="live-row" style={{ alignItems: "start", marginBottom: 16 }}><div>{eyebrow && <div className="live-kicker" style={{ marginBottom: 6 }}>{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  const { t } = useLanguage();
  return <div className="live-alert" role="alert" style={{ borderLeftColor: "hsl(var(--destructive))" }}><div className="live-row" style={{ justifyContent: "start" }}><AlertCircle size={17} /><span>{message}</span>{retry && <button className="live-icon-btn" onClick={retry}><RefreshCw size={14} />{t("Coba lagi", "Retry")}</button>}</div></div>;
}
export const INITIAL_HEURISTIC_WARNING_ID = "Indeks heuristik awal, bukan probabilitas rugi. Batas yang besar tidak membuat posisi aman.";
export const WHOLE_ACCOUNT_RISK_REASON_ID = "Indeks memakai batas pribadi dan referensi emas harian; bukan risiko seluruh rekening.";
export function RiskSummary({ risk, detailed = false, compact = false, showCalibrationNote = true, omitReasonIds = [], omitWarningIds = [] }: {
  risk: PositionRisk;
  detailed?: boolean;
  compact?: boolean;
  showCalibrationNote?: boolean;
  omitReasonIds?: string[];
  omitWarningIds?: string[];
}) {
  const { t } = useLanguage();
  const label = risk.level === "unavailable" ? t("Belum tersedia", "Unavailable") : risk.level === "low" ? t("Relatif rendah", "Relatively low") : risk.level === "moderate" ? t("Relatif sedang", "Relatively moderate") : t("Relatif tinggi", "Relatively high");
  const color = risk.level === "high" ? "#a84f43" : risk.level === "moderate" ? "#a17b31" : "#477e78";
  const reasons = (detailed ? risk.reasons : risk.reasons.slice(0, 3)).filter((reason) => !omitReasonIds.includes(reason.id));
  const warnings = risk.warnings.filter((warning) => !omitWarningIds.includes(warning.id));
  return <div className={`risk-summary${compact ? " risk-summary-compact" : ""}`}>
     <div className="live-row" style={{ alignItems: "baseline" }}><div><span className="live-inline-help"><span className="live-kicker">{t("Indeks eksposur posisi", "Position exposure index")}</span><TermHelp term="exposure" /></span><div style={{ fontSize: 22, fontWeight: 700, color }}>{label}</div></div><strong className="live-mono" style={{ fontSize: 36, color }}>{risk.score ?? "—"}<span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>/100</span></strong></div>
    <div className="live-riskbar" aria-label={t("Rentang relatif rendah 0 sampai 35, sedang 36 sampai 60, tinggi 61 sampai 100", "Relative low 0 to 35, moderate 36 to 60, high 61 to 100")}><span/><span/><span/></div>
    <div className="live-row live-small"><span>0–35 {t("rendah", "low")}</span><span>36–60 {t("sedang", "moderate")}</span><span>61–100 {t("tinggi", "high")}</span></div>
     {showCalibrationNote && <p className="live-small risk-summary-note" style={{ marginTop: 12 }}>{t("Indeks heuristik awal yang belum dikalibrasi. Bukan probabilitas rugi, ukuran risiko seluruh rekening, atau penilaian bahwa posisi aman.", "An initial, uncalibrated heuristic. Not a loss probability, whole-account risk measure, or a claim that a position is safe.")}</p>}
     {(reasons.length > 0 || warnings.length > 0) && <div className="live-stack risk-summary-items" style={{ marginTop: 12 }}>{[...reasons, ...warnings].map((reason, i) => <div key={`${reason.id}-${i}`} className="live-small"><AlertCircle size={13} style={{ display: "inline", marginRight: 6 }} /><Text {...reason} /></div>)}</div>}
  </div>;
}
export function Field({ label, value, onChange, error, type = "number", placeholder, hint, step = "any", min = "0", required = false, help }: {
  label: string; value: string | number; onChange: (value: string) => void; error?: string; type?: string; placeholder?: string; hint?: string; step?: string; min?: string; required?: boolean; help?: ReactNode;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div className="live-field"><div className="live-field-label-row"><label htmlFor={id}>{label}{required && " *"}</label>{help}</div><input id={id} type={type} inputMode={type === "number" ? "decimal" : undefined} min={min} step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />{error && <span id={`${id}-error`} className="live-error">{error}</span>}{hint && !error && <span id={`${id}-hint`} className="live-small">{hint}</span>}</div>;
}
export function LoadingBlock({ label }: { label: string }) { return <div aria-label={label} className="live-stack"><div className="live-skeleton" style={{ width: "38%" }}/><div className="live-skeleton" style={{ height: 38 }}/><div className="live-skeleton" style={{ width: "70%" }}/></div>; }
