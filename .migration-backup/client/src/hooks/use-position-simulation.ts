import { useMemo, useState } from "react";
import type { LiveQuote, MarketContext, Position, PositionSettings } from "@shared/live-types";
import { positionSchema } from "@shared/live-types";
import { compareSimulation } from "@shared/position-risk";
import { usePortfolio } from "@/lib/portfolio-context";
import type { MarketHook } from "./use-market";

interface Snapshot {
  at: number;
  quote: LiveQuote | null;
  context: MarketContext | null;
  settings: PositionSettings;
  positions: Position[];
  candidate: Position;
  signature: string;
}

export function usePositionSimulation(side: Position["side"], market: MarketHook) {
  const { portfolio, addPosition } = usePortfolio();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const group = portfolio.positions.filter((p) => p.side === side);
  const signature = JSON.stringify({ positions: group, settings: portfolio.settings });
  const create = () => {
    setSnapshot({
      at: market.now, quote: market.usableQuote,
      context: market.context.isError ? null : market.context.data ?? null,
      positions: group.map((p) => ({ ...p })), settings: { ...portfolio.settings }, signature,
      candidate: {
        id: "simulation", symbol: "XUL10", side,
        entry: market.usableQuote?.price ?? 0,
        lots: group.at(-1)?.lots ?? 0, enteredAt: null,
      },
    });
  };
  const candidateValid = snapshot ? positionSchema.safeParse(snapshot.candidate).success : false;
  const comparison = useMemo(() => {
    if (!snapshot || !candidateValid) return null;
    return compareSimulation(
      snapshot.positions, snapshot.candidate, snapshot.settings, snapshot.quote, snapshot.context, snapshot.at,
    );
  }, [snapshot, candidateValid]);
  return {
    snapshot: snapshot?.candidate.side === side ? snapshot : null,
    comparison: snapshot?.candidate.side === side ? comparison : null,
    candidateValid,
    outdated: !!snapshot && snapshot.signature !== signature,
    create,
    update: (patch: Partial<Pick<Position, "entry" | "lots">>) =>
      setSnapshot((s) => s ? { ...s, candidate: { ...s.candidate, ...patch } } : s),
    doubleLastLot: () => setSnapshot((s) => s ? {
      ...s, candidate: { ...s.candidate, lots: (s.positions.at(-1)?.lots ?? 0) * 2 },
    } : s),
    refreshReference: () => setSnapshot((s) => {
      if (!s) return s;
      return {
        ...s, at: market.now, quote: market.usableQuote,
        context: market.context.isError ? null : market.context.data ?? null,
        candidate: { ...s.candidate, entry: market.usableQuote?.price ?? s.candidate.entry },
      };
    }),
    close: () => setSnapshot(null),
    record: () => {
      if (!snapshot || snapshot.signature !== signature) {
        throw new Error("Catatan atau batas berubah. Buat ulang simulasi sebelum mencatatnya. / Positions or limits changed. Recreate the simulation before recording.");
      }
      const parsed = positionSchema.parse(snapshot.candidate);
      const { id: _id, ...input } = parsed;
      addPosition(input);
      setSnapshot(null);
    },
  };
}
