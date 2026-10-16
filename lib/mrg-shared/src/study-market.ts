import {
  calendarIsFresh, jakartaDate,
  type Copy, type DailyAnalysis, type MarketContext,
} from "./live-types";
import type { RiskStatus } from "./schema";

export interface StudyReference {
  status: "ready" | "mixed" | "unavailable";
  analysis: DailyAnalysis | null;
  receivedAt: string | null;
  key: string | null;
}

const copy = (id: string, en: string): Copy => ({ id, en });

// This supplies only an explicitly confirmed study input, never position-risk points.
// Series length/gaps are checked by the existing server-side daily adapter.
export function getStudyReference(
  context: MarketContext | null | undefined,
  now = Date.now(),
  online = true,
): StudyReference {
  const history = context?.history;
  const unavailable: StudyReference = {
    status: "unavailable", analysis: null, receivedAt: history?.receivedAt ?? null, key: null,
  };
  const analysis = history?.analysis;
  if (!online || history?.status !== "ready" || !analysis || !Number.isFinite(now)) return unavailable;
  const receivedAge = now - Date.parse(history.receivedAt);
  const today = jakartaDate(now);
  const lastDay = Date.parse(`${analysis.lastDate}T00:00:00Z`);
  const dayAge = Date.parse(`${today}T00:00:00Z`) - lastDay;
  if (!Number.isFinite(receivedAge) || receivedAge < -10_000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(analysis.lastDate) ||
    !Number.isFinite(lastDay) || new Date(lastDay).toISOString().slice(0, 10) !== analysis.lastDate ||
    dayAge < 86_400_000 || dayAge > 4 * 86_400_000 ||
    analysis.source !== "LGD Daily" || analysis.timeframe !== "D1" || analysis.basis !== "gold-reference" ||
    !Number.isInteger(analysis.candleCount) || analysis.candleCount < 50 ||
    ![analysis.lastClose, analysis.ma20, analysis.ma50, analysis.atr14, analysis.atrBaseline]
      .every(value => Number.isFinite(value) && value > 0)) return unavailable;
  const trend = analysis.lastClose > analysis.ma20 && analysis.ma20 > analysis.ma50 ? "up"
    : analysis.lastClose < analysis.ma20 && analysis.ma20 < analysis.ma50 ? "down" : "mixed";
  if (analysis.trend !== trend) return unavailable;
  return {
    status: trend === "mixed" ? "mixed" : "ready",
    analysis, receivedAt: history.receivedAt,
    key: JSON.stringify([history.receivedAt, analysis]),
  };
}

export function getStudyWarnings(
  context: MarketContext | null | undefined,
  now = Date.now(),
  online = true,
): Copy[] {
  const warnings: Copy[] = [];
  const reference = getStudyReference(context, now, online);
  if (reference.analysis) {
    const { atr14, atrBaseline } = reference.analysis;
    warnings.push(copy(
      `ATR14 D1 ${atr14.toFixed(2)} dibanding median 20 ATR sebelumnya ${atrBaseline.toFixed(2)}: rentang harian referensi ${atr14 > atrBaseline ? "lebih besar" : atr14 < atrBaseline ? "lebih kecil" : "sama"}. Bukan jarak layer XUL10 atau bukti aman; tidak menambah skor.`,
      `D1 ATR14 ${atr14.toFixed(2)} versus the median of 20 prior ATRs ${atrBaseline.toFixed(2)}: the reference daily range is ${atr14 > atrBaseline ? "larger" : atr14 < atrBaseline ? "smaller" : "equal"}. Not XUL10 layer spacing or proof of safety; no score added.`,
    ));
  } else {
    warnings.push(copy(
      "Referensi D1/ATR belum dapat dinilai: data tidak tersedia, usang, atau koneksi terputus. Pilih kondisi manual; bukan penilaian live lengkap.",
      "D1/ATR reference cannot be assessed: data is unavailable, stale, or offline. Choose the condition manually; this is not a complete live assessment.",
    ));
  }
  const calendar = context?.calendar;
  if (!online || !calendarIsFresh(calendar, now) || calendar?.timezone !== "Asia/Jakarta") {
    warnings.push(copy(
      "Kalender belum dapat dinilai: perlu data lengkap Newsmaker dengan waktu pembuatan maksimal 15 menit. Tidak adanya data bukan berarti tidak ada agenda berisiko.",
      "Calendar cannot be assessed: complete Newsmaker data generated within 15 minutes is required. Missing data does not mean there are no risky events.",
    ));
    return warnings;
  }
  let nearCount = 0;
  let uncertain = false;
  for (const event of calendar.events) {
    if (event.currency !== "USD") continue;
    const at = event.at ? Date.parse(event.at) : NaN;
    const minutes = (at - now) / 60_000;
    if ((event.impact === "high" && !Number.isFinite(at)) ||
      (event.impact === "unknown" && (!Number.isFinite(at) || (minutes >= -15 && minutes <= 120)))) {
      uncertain = true;
    }
    if (event.impact !== "high" || !Number.isFinite(at) || minutes < -15 || minutes > 120) continue;
    nearCount++;
    const time = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short",
    }).format(new Date(at));
    warnings.push(copy(
      `Agenda USD high impact menurut Newsmaker: ${event.name}, ${time} WIB. Dalam jendela 120 menit sebelum–15 menit sesudah; bukan prediksi arah atau dampak aktual, tidak menambah skor.`,
      `High-impact USD event reported by Newsmaker: ${event.name}, ${time} WIB. Within 120 minutes before–15 minutes after; not an actual impact or direction forecast, no score added.`,
    ));
  }
  if (uncertain) warnings.push(copy(
    "Sebagian agenda USD memiliki waktu/dampak tidak pasti; kedekatan seluruh agenda belum dapat dinilai.",
    "Some USD events have uncertain times/impact; proximity of all events cannot be assessed.",
  ));
  if (!nearCount) warnings.push(copy(
    "Tidak ditemukan agenda USD high impact bertanggal dalam jendela peringatan pada snapshot kalender. Bukan bukti pasar aman atau dampak rilis sudah selesai.",
    "No timed high-impact USD event was found in the warning window in this calendar snapshot. Not evidence of safety or that release effects have ended.",
  ));
  return warnings;
}

export function studyStatusLabel(status: RiskStatus): Copy {
  if (status === "AMAN") return copy("Risiko relatif rendah", "Relatively low risk");
  if (status === "BERISIKO") return copy("Berisiko", "Risky");
  return copy("Tidak layak menurut aturan studi", "Not viable under study rules");
}
