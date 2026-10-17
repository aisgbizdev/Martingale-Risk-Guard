import { Router } from "express";
import { calculateRisk } from "../rules";
import { riskInputSchema } from "@workspace/mrg-shared/schema";
import { getHistory, getQuotes } from "../market/prices";
import { getCalendar } from "../market/calendar";
import { getArticle, getNews } from "../market/news";
import { readMarketRules } from "../market/rule-reader";
import { GetMarketContextResponse } from "@workspace/api-zod";

const app = Router();
  app.get("/market/quotes", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await getQuotes());
  });

  app.get("/market/context", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const [history, calendar, news] = await Promise.all([getHistory(), getCalendar(), getNews()]);
    const ruleAnalysis = await readMarketRules(news, calendar);
    res.json(GetMarketContextResponse.parse({ history, calendar, news, ruleAnalysis }));
  });

  app.get("/market/news/:slug", async (req, res) => {
    if (!/^[a-z0-9-]{1,220}$/.test(req.params.slug)) {
      res.status(400).json({ error: "Invalid article identifier" });
      return;
    }
    try {
      res.json(await getArticle(req.params.slug));
    } catch {
      res.status(503).json({ error: "Artikel Newsmaker belum dapat dimuat / Newsmaker article could not be loaded" });
    }
  });

  app.post("/calculate-risk", (req, res) => {
    try {
      const parseResult = riskInputSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Input tidak valid",
          details: parseResult.error.errors 
        });
      }

      const result = calculateRisk(parseResult.data);
      return res.json(result);
    } catch (error) {
      req.log.error({ err: error }, "Error calculating risk");
      return res.status(500).json({ error: "Terjadi kesalahan saat menghitung risiko" });
    }
  });

export default app;
