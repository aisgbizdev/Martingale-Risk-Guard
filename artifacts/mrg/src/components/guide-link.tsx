import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";

export function GuideLink({ topic = "cara-pakai", compact = false }: { topic?: string; compact?: boolean }) {
  const { t } = useLanguage();
  return <Link href={`/literasi#${topic}`}
    className={compact
      ? "inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border border-primary/25 text-primary text-xs font-bold hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
      : "inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"}
    aria-label={t(`Panduan: ${topic.replaceAll("-", " ")}`, `Guide: ${topic.replaceAll("-", " ")}`)}>
    {compact ? "?" : t("Panduan & Literasi", "Guide & Literacy")}
  </Link>;
}
