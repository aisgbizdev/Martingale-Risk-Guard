import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type Term = "exposure" | "ma" | "atr" | "support" | "resistance" | "d1" | "lot" | "layers" | "limits" | "averaging" | "martingale" | "simulation";

const copy: Record<Term, { label: string; labelEn: string; id: string; en: string }> = {
  exposure: {
    label: "Indeks eksposur",
    labelEn: "Exposure index",
    id: "Indeks heuristik awal yang belum dikalibrasi. Bukan probabilitas rugi, ukuran risiko seluruh rekening, atau tanda posisi aman.",
    en: "An initial, uncalibrated heuristic. Not a loss probability, whole-account risk measure, or a claim that a position is safe.",
  },
  ma: {
    label: "MA20 / MA50",
    labelEn: "MA20 / MA50",
    id: "Rata-rata harga penutupan 20 dan 50 hari pada referensi LGD Daily. Ini ringkasan historis, bukan arah harga berikutnya.",
    en: "20- and 50-day average closes from the LGD Daily reference. Historical context, not a forecast of the next price move.",
  },
  atr: {
    label: "ATR14",
    labelEn: "ATR14",
    id: "Ukuran rentang pergerakan harian historis. Bukan prediksi, batas kerugian, atau ukuran uang.",
    en: "A measure of historical daily range. Not a forecast, loss limit, or monetary amount.",
  },
  support: {
    label: "Dukungan",
    labelEn: "Support",
    id: "Titik rendah referensi dalam jendela historis. Bukan lantai harga yang dijamin.",
    en: "A reference low within the historical window. Not a guaranteed price floor.",
  },
  resistance: {
    label: "Resistansi",
    labelEn: "Resistance",
    id: "Titik tinggi referensi dalam jendela historis. Bukan batas kenaikan yang dijamin.",
    en: "A reference high within the historical window. Not a guaranteed price ceiling.",
  },
  d1: {
    label: "Referensi D1",
    labelEn: "D1 reference",
    id: "D1 berarti kerangka harian. LGD Daily adalah referensi harga emas dan tidak identik dengan harga kontrak XUL10.",
    en: "D1 means a daily timeframe. LGD Daily is a gold-price reference, not the same as the XUL10 contract price.",
  },
  lot: {
    label: "Lot",
    labelEn: "Lots",
    id: "Ukuran yang Anda catat untuk posisi. Konversi kontrak dan nilai uang tidak diverifikasi oleh MRG.",
    en: "The size you record for a position. MRG does not verify contract conversion or monetary value.",
  },
  layers: {
    label: "Layer",
    labelEn: "Layers",
    id: "Jumlah catatan posisi dalam satu rangkaian. Menambah layer tidak berarti ukuran tiap posisi otomatis bertambah.",
    en: "The number of position records in a series. Adding a layer does not automatically increase each position's size.",
  },
  limits: {
    label: "Batas pilihan Anda",
    labelEn: "Your chosen limits",
    id: "Input pribadi untuk perbandingan indeks, bukan batas broker, margin, atau kapasitas aman rekening. Nilai lebih besar tidak membuat posisi aman.",
    en: "Personal inputs for the index comparison, not broker limits, margin, or safe account capacity. Larger values do not make a position safe.",
  },
  averaging: {
    label: "Averaging",
    labelEn: "Averaging",
    id: "Menambah catatan posisi pada harga lain dapat mengubah rata-rata berbobot. Ukuran layer baru tidak harus meningkat; rata-rata yang membaik tidak membuat eksposur lebih aman atau menjamin impas.",
    en: "Adding a position record at another price can change the weighted average. A new layer does not have to be larger; an improved average does not make exposure safer or guarantee break-even.",
  },
  martingale: {
    label: "Martingale",
    labelEn: "Martingale",
    id: "Menggandakan ukuran adalah skenario pilihan bergaya Martingale. MRG tidak melakukannya otomatis, tidak mengirim order, dan penggandaan tidak menjamin pemulihan.",
    en: "Doubling size is a chosen Martingale-style scenario. MRG does not do it automatically or send orders, and doubling does not guarantee recovery.",
  },
  simulation: {
    label: "Simulasi",
    labelEn: "Simulation",
    id: "Perbandingan hipotetis memakai snapshot acuan. Tidak mengeksekusi transaksi; ubah acuan hanya melalui tombol perbarui yang tersedia.",
    en: "A hypothetical comparison using a reference snapshot. It does not execute a trade; change the reference only with the available refresh control.",
  },
};

export function TermHelp({ term }: { term: Term }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 280, maxHeight: 170 });
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const detail = copy[term];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    const viewport = window.visualViewport;
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    viewport?.addEventListener("resize", close);
    viewport?.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      viewport?.removeEventListener("resize", close);
      viewport?.removeEventListener("scroll", close);
    };
  }, [open]);

  return <span className="live-term-help" ref={root} onKeyDownCapture={(event) => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }}>
    <button type="button" className="live-term-help-trigger" aria-label={t(`Bantuan istilah: ${detail.label}`, `Term help: ${detail.labelEn}`)} aria-expanded={open} aria-controls={id} onClick={(event) => {
      if (!open) {
        const rect = event.currentTarget.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewLeft = viewport?.offsetLeft ?? 0;
        const viewTop = viewport?.offsetTop ?? 0;
        const viewWidth = viewport?.width ?? window.innerWidth;
        const viewHeight = viewport?.height ?? window.innerHeight;
        const width = Math.min(300, viewWidth - 32);
        const spaceBelow = viewTop + viewHeight - rect.bottom;
        const maxHeight = Math.max(24, viewHeight - 32);
        const estimatedHeight = Math.min(170, maxHeight);
        const maxTop = Math.max(viewTop + 8, viewTop + viewHeight - estimatedHeight - 8);
        setPosition({
          left: Math.min(Math.max(viewLeft + 16, rect.left), Math.max(viewLeft + 16, viewLeft + viewWidth - width - 16)),
          top: spaceBelow >= estimatedHeight + 8 ? Math.min(maxTop, rect.bottom + 8) : Math.min(maxTop, Math.max(viewTop + 8, rect.top - estimatedHeight - 8)),
          width,
          maxHeight,
        });
      }
      setOpen((value) => !value);
  }}>
      {open ? <X size={15} aria-hidden="true" /> : <CircleHelp size={16} aria-hidden="true" />}
    </button>
    <span className="live-term-help-popover" id={id} style={position} hidden={!open} role="region" aria-label={t(`Penjelasan ${detail.label}`, `${detail.labelEn} explanation`)}>
      <strong>{t(detail.label, detail.labelEn)}</strong>
      <span>{t(detail.id, detail.en)}</span>
    </span>
  </span>;
}
