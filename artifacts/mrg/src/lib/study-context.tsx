import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Copy, LiveQuote } from "@shared/live-types";
import type { StudyReference } from "@shared/study-market";
import type { ContractProfileId } from "@shared/scenario-contract";
export { paramsKey } from "@shared/study-identity";

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

export interface CalculatorDraft {
  controls: {
    side: "buy" | "sell" | null;
    strategy: "Linear Averaging" | "Martingale";
    layers: number;
    target: number;
    spacing: number;
  };
  mode: "market" | "manual";
  contractProfile?: ContractProfileId;
}

interface Ctx {
  draft: StudyDraft;
  setDraft: (d: StudyDraft) => void;
  snapshot: StudySnapshot | null;
  setSnapshot: (s: StudySnapshot | null) => void;
  calculatorDraft: CalculatorDraft | null;
  setCalculatorDraft: (d: CalculatorDraft) => void;
}
const StudyCtx = createContext<Ctx | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<StudyDraft>(initialDraft);
  const [snapshot, setSnapshot] = useState<StudySnapshot | null>(null);
  const [calculatorDraft, setCalculatorDraft] = useState<CalculatorDraft | null>(null);
  const value = useMemo(() => ({ draft, setDraft, snapshot, setSnapshot, calculatorDraft, setCalculatorDraft }), [draft, snapshot, calculatorDraft]);
  return <StudyCtx.Provider value={value}>{children}</StudyCtx.Provider>;
}

export function useStudy() {
  const c = useContext(StudyCtx);
  if (!c) throw new Error("StudyProvider missing");
  return c;
}
