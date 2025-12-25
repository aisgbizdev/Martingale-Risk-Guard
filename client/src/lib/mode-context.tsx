import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";

export type AppMode = "public" | "internal" | "regulator";

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  modeLabel: string;
}

const modeLabels: Record<AppMode, string> = {
  public: "Public",
  internal: "Internal (WPB)",
  regulator: "Regulator/Compliance",
};

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [mode, setModeState] = useState<AppMode>("public");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlMode = params.get("mode") as AppMode;
    if (urlMode === "public" || urlMode === "internal" || urlMode === "regulator") {
      setModeState(urlMode);
    } else {
      const stored = localStorage.getItem("appMode") as AppMode;
      if (stored === "public" || stored === "internal" || stored === "regulator") {
        setModeState(stored);
      }
    }
    setIsHydrated(true);
  }, [search]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("appMode", mode);
    }
  }, [mode, isHydrated]);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set("mode", newMode);
    const newPath = window.location.pathname + "?" + params.toString();
    setLocation(newPath);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, modeLabel: modeLabels[mode] }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}

export { modeLabels };
