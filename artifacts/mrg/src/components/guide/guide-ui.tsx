import type { ReactNode } from "react";
import { useLanguage } from "@/lib/language-context";

export type T = (id: string, en: string) => string;

export function GuideSection({ id, number, title, lead, children }: {
  id: string; number: string; title: string; lead?: string; children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="live-card scroll-mt-24 space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      data-testid={`section-${id}`}
    >
      <header>
        <p className="live-small live-mono uppercase tracking-widest">{number}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
      </header>
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export function Sub({ children }: { children: ReactNode }) {
  return <h3 className="pt-1">{children}</h3>;
}

export function Formula({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className="m-0">
      {label && <figcaption className="live-small mb-1">{label}</figcaption>}
      <pre className="live-mono m-0 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/60 p-3 text-[12.5px] leading-6">{children}</pre>
    </figure>
  );
}

export function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
      <div className="space-y-1 text-[13px] break-words [&_p]:[overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

export function Caveat({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[13px] text-foreground">{children}</p>;
}

export function Bilingual({ id, en }: { id: ReactNode; en: ReactNode }) {
  const { language } = useLanguage();
  return <div>{language === "id" ? id : en}</div>;
}

export function DataTable({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        {caption && <caption className="live-small pb-1 text-left">{caption}</caption>}
        <thead>
          <tr className="border-b border-border">
            {head.map(h => <th key={h} scope="col" className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50">
              {r.map((c, j) => <td key={j} className={`px-2 py-1.5 align-top ${j > 0 ? "live-mono" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
