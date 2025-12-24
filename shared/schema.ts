import { z } from "zod";

export const targetPoinOptions = ["30", "40", "50"] as const;
export const strategyOptions = ["Martingale", "Linear Averaging"] as const;
export const layerOptions = ["3", "4", "5"] as const;
export const experienceOptions = ["Pemula", "Berpengalaman"] as const;
export const marketConditionOptions = ["Sideways", "Trending"] as const;
export const riskStatusOptions = ["AMAN", "BERISIKO", "TIDAK LAYAK"] as const;

export const riskInputSchema = z.object({
  modal: z.number().min(1, "Modal harus lebih dari 0"),
  targetPoin: z.enum(targetPoinOptions),
  strategy: z.enum(strategyOptions),
  maxLayer: z.enum(layerOptions),
  experience: z.enum(experienceOptions),
  marketCondition: z.enum(marketConditionOptions),
});

export type RiskInput = z.infer<typeof riskInputSchema>;
export type RiskStatus = typeof riskStatusOptions[number];

export interface RiskResult {
  status: RiskStatus;
  score: number;
  reasons: string[];
  warnings: string[];
  psychologyNotes: string[];
  metrics: {
    expectedPF: string;
    expectedROM: string;
    expectedER: string;
    marginCallRisk: string;
  };
}
