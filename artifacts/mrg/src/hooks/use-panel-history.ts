import { useEffect, useRef, useState } from "react";

export type PositionPanel = "entry" | "settings" | "simulation";
type PanelEntry = { panel: PositionPanel; depth: 1 | 2; path: string };
const key = "mrgPositionPanel";

function readEntry(): PanelEntry | null {
  const entry = window.history.state?.[key];
  if (!entry || entry.path !== window.location.pathname ||
      !["entry", "settings", "simulation"].includes(entry.panel) ||
      !(entry.depth === 1 || (entry.depth === 2 && entry.panel === "settings"))) return null;
  return entry;
}

// History contains navigation only, never portfolio drafts or simulation snapshots.
// Forward/reload can reopen a panel, but its discarded working data stays discarded.
export function usePanelHistory(
  onNavigate: (next: PositionPanel | null, previous: PositionPanel | null, nested: boolean) => void,
) {
  const [activePanel, setActivePanel] = useState<PositionPanel | null>(null);
  const current = useRef<PanelEntry | null>(null);
  const navigating = useRef(false);
  const callback = useRef(onNavigate);
  callback.current = onNavigate;

  useEffect(() => {
    const sync = () => {
      const next = readEntry();
      const previous = current.current;
      current.current = next;
      navigating.current = false;
      callback.current(next?.panel ?? null, previous?.panel ?? null, next?.depth === 2);
      setActivePanel(next?.panel ?? null);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const dismissPanel = () => {
    if (navigating.current || !current.current) return;
    navigating.current = true;
    // Consume the opening entry instead of pushing an empty/closed-panel entry.
    // A nested settings entry returns to simulation; ordinary panels return to base.
    window.history.back();
  };

  const openPanel = (panel: PositionPanel, nested = false) => {
    if (navigating.current) return;
    const previous = current.current;
    const entry: PanelEntry = {
      panel, depth: nested && previous?.panel === "simulation" ? 2 : 1,
      path: window.location.pathname,
    };
    const state = { ...window.history.state, [key]: entry };
    // Switching ordinary panels uses the same history slot: only one is active.
    if (previous && !nested) window.history.replaceState(state, "", window.location.href);
    else window.history.pushState(state, "", window.location.href);
    current.current = entry;
    setActivePanel(panel);
  };

  return { activePanel, openPanel, dismissPanel };
}
