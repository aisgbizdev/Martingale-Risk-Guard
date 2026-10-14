import { createContext, useContext, useState, type ReactNode } from "react";
import {
  EMPTY_SETTINGS, portfolioSchema, positionSchema, settingsSchema,
  type Portfolio, type Position, type PositionSettings,
} from "@shared/live-types";

const KEY = "mrg_portfolio_v1";
const empty = (): Portfolio => ({ version: 1, positions: [], settings: { ...EMPTY_SETTINGS } });

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { portfolio: empty(), error: null as string | null, blocked: false };
    const result = portfolioSchema.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error("Invalid saved data");
    return { portfolio: result.data, error: null as string | null, blocked: false };
  } catch {
    return {
      portfolio: empty(), blocked: true,
      error: "Data lokal tidak dapat dibaca. Data lama belum ditimpa; hapus data MRG untuk mulai ulang. / Local data could not be read. Existing data was not overwritten; reset MRG data to start again.",
    };
  }
}

export function usePortfolioState() {
  const [loaded] = useState(loadPortfolio);
  const [portfolio, setPortfolio] = useState(loaded.portfolio);
  const [error, setError] = useState<string | null>(loaded.error);
  const [blocked, setBlocked] = useState(loaded.blocked);

  const commit = (next: Portfolio) => {
    if (blocked) throw new Error(error ?? "Local storage is unavailable");
    const parsed = portfolioSchema.parse(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {
      const message = "Penyimpanan gagal; perubahan belum disimpan. / Storage failed; changes were not saved.";
      setError(message);
      throw new Error(message);
    }
    setPortfolio(parsed);
    setError(null);
  };
  return {
    portfolio, error, blocked,
    addPosition: (input: Omit<Position, "id">) => {
      const position = positionSchema.parse({ ...input, id: crypto.randomUUID() });
      commit({ ...portfolio, positions: [...portfolio.positions, position] });
    },
    updatePosition: (id: string, input: Omit<Position, "id">) => {
      if (!portfolio.positions.some((p) => p.id === id)) throw new Error("Position is no longer available");
      const position = positionSchema.parse({ ...input, id });
      commit({ ...portfolio, positions: portfolio.positions.map((p) => p.id === id ? position : p) });
    },
    removePosition: (id: string) => commit({ ...portfolio, positions: portfolio.positions.filter((p) => p.id !== id) }),
    clearPositions: () => commit({ ...portfolio, positions: [] }),
    saveSettings: (settings: PositionSettings) => commit({ ...portfolio, settings: settingsSchema.parse(settings) }),
    resetPortfolio: () => {
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem("riskcheck_scenarios");
        localStorage.removeItem("mrg_welcome_seen");
      } catch {
        const message = "Data lokal belum dapat dihapus. / Local data could not be deleted.";
        setError(message);
        throw new Error(message);
      }
      setPortfolio(empty()); setBlocked(false); setError(null);
    },
  };
}

type PortfolioContextValue = ReturnType<typeof usePortfolioState>;
const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const state = usePortfolioState();
  return <PortfolioContext.Provider value={state}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("PortfolioProvider is required");
  return context;
}
