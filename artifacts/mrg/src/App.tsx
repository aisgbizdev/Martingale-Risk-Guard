import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useLayoutEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/language-context";
import Home from "@/pages/home";
import Result from "@/pages/result";
import Literasi from "@/pages/literasi";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import LiveOverview from "@/pages/live/overview";
import PositionsPage from "@/pages/live/positions";
import AnalysisPage from "@/pages/live/analysis";
import { StudyProvider } from "@/lib/study-context";
import { PortfolioProvider } from "@/lib/portfolio-context";

function Router() {
  const [location] = useLocation();
  const calculator = location === "/" || location === "/basic";
  const guide = location === "/literasi";
  const keepCalculator = useRef(false);
  const scroll = useRef(0);
  if (calculator) keepCalculator.current = true;
  if (!calculator && !guide) keepCalculator.current = false;
  useLayoutEffect(() => {
    if (!calculator) return;
    const savedScroll = scroll.current;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, savedScroll);
      scroll.current = savedScroll;
    });
    const rememberScroll = () => { scroll.current = window.scrollY; };
    window.addEventListener("scroll", rememberScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", rememberScroll);
    };
  }, [calculator]);
  // Only keep the calculator alive for its guide round-trip. No snapshot is
  // serialized or restored as fresh; polling and staleness checks keep running.
  return (
    <>
      {(calculator || (guide && keepCalculator.current)) && <div hidden={!calculator} onClickCapture={() => { if (calculator) scroll.current = window.scrollY; }}><Home /></div>}
      {!calculator && (
    <Switch>
      <Route path="/live" component={LiveOverview} />
      <Route path="/positions" component={PositionsPage} />
      <Route path="/analysis" component={AnalysisPage} />
      <Route path="/result" component={Result} />
      <Route path="/literasi" component={Literasi} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <PortfolioProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <StudyProvider><Router /></StudyProvider>
            </WouterRouter>
          </PortfolioProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
