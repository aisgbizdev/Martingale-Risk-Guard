import { Switch, Route, Router as WouterRouter } from "wouter";
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
import { PortfolioProvider } from "@/lib/portfolio-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LiveOverview} />
      <Route path="/positions" component={PositionsPage} />
      <Route path="/analysis" component={AnalysisPage} />
      <Route path="/basic" component={Home} />
      <Route path="/result" component={Result} />
      <Route path="/literasi" component={Literasi} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
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
            <Router />
            </WouterRouter>
          </PortfolioProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
