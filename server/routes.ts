import type { Express } from "express";
import { createServer, type Server } from "http";
import { calculateRisk } from "./rules";
import { riskInputSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/calculate-risk", (req, res) => {
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
      console.error("Error calculating risk:", error);
      return res.status(500).json({ error: "Terjadi kesalahan saat menghitung risiko" });
    }
  });

  return httpServer;
}
