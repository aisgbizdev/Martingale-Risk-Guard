import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Copy, LiveQuote } from "@shared/live-types";
import type { StudyReference } from "@shared/study-market";
import type { RiskInput } from "@shared/schema";

export interface StudyDraft {
  modal: string;
  targetPoin: string;
  strategy: string;
  maxLayer: string;
  experience: string;
  marketCondition: string; // "" = not chosen yet
  d1Key: string | null; // key of D1 evidence the user confirmed
}

export const initialDraft: StudyDraft = {
  modal: "", targetPoin: "30", strategy: "Linear Averaging", maxLayer: "3",
  experience: "Pemula", marketCondition: "", d1Key: null,
};

export interface StudySnapshot {
  paramsKey: string;
  capturedAt: number;
  reference: StudyReference;
  warnings: Copy[];
  quote: LiveQuote | null;
  contextError: boolean;
  calendar: { status: "ready" | "unavailable" | "missing"; complete: boolean; generatedAt: string | null; receivedAt: string | null } | null;
  confirmedD1: boolean;
}

export function paramsKey(p: Pick<RiskInput, "modal" | "targetPoin" | "strategy" | "maxLayer" | "experience" | "marketCondition">) {
  return [Number(p.modal), p.targetPoin, p.strategy, p.maxLayer, p.experience, p.marketCondition].join("|");
}

interface Ctx {
  draft: StudyDraft;
  setDraft: (d: StudyDraft) => void;
  snapshot: StudySnapshot | null;
  setSnapshot: (s: StudySnapshot | null) => void;
}
const StudyCtx = createContext<Ctx | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<StudyDraft>(initialDraft);
  const [snapshot, setSnapshot] = useState<StudySnapshot | null>(null);
  const value = useMemo(() => ({ draft, setDraft, snapshot, setSnapshot }), [draft, snapshot]);
  return <StudyCtx.Provider value={value}>{children}</StudyCtx.Provider>;
}

export function useStudy() {
  const c = useContext(StudyCtx);
  if (!c) throw new Error("StudyProvider missing");
  return c;
}
