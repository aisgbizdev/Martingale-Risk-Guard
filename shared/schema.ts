import { z } from "zod";

export const targetPoinOptions = [30, 40, 50] as const;
export const strategyOptions = ["Martingale", "Linear Averaging"] as const;
export const layerOptions = [3, 4, 5] as const;
export const experienceOptions = ["Pemula", "Berpengalaman"] as const;
export const marketConditionOptions = ["Sideways", "Trending"] as const;
export const riskStatusOptions = ["AMAN", "BERISIKO", "TIDAK LAYAK"] as const;

export const riskInputSchema = z.object({
  modal: z.number().min(1, "Modal harus lebih dari 0"),
  targetPoin: z.enum(["30", "40", "50"]),
  strategy: z.enum(["Martingale", "Linear Averaging"]),
  maxLayer: z.enum(["3", "4", "5"]),
  experience: z.enum(["Pemula", "Berpengalaman"]),
  marketCondition: z.enum(["Sideways", "Trending"]),
});

export type RiskInput = z.infer<typeof riskInputSchema>;

export type RiskStatus = typeof riskStatusOptions[number];

export interface RiskResult {
  status: RiskStatus;
  score: number;
  reasons: string[];
  warnings: string[];
  psychologyNotes: string[];
}
