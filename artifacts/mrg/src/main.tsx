import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Dev modules are not a reliable offline app shell. Register the built PWA on
// every secure production host, including published Replit domains.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const register = () => navigator.serviceWorker.register("/sw.js")
    .catch(() => console.warn("MRG offline setup failed; online mode remains available."));
  if (document.readyState === "complete") void register();
  else window.addEventListener("load", register, { once: true });
}
