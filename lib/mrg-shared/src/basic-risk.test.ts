import test from "node:test";
import assert from "node:assert/strict";
import { calculateRisk } from "../../../artifacts/api-server/src/rules";
import { riskInputSchema, type RiskInput } from "./schema";

const base: RiskInput = {
  modal: 200000, targetPoin: "30", strategy: "Linear Averaging",
  maxLayer: "3", experience: "Pemula", marketCondition: "Sideways",
};

test("legacy calculator baseline score and study metrics are preserved", () => {
  const result = calculateRisk(base);
  assert.equal(result.score, 25);
  assert.equal(result.status, "AMAN");
  assert.deepEqual(result.metrics, {
    expectedPF: "14.73", expectedROM: "334.19%", expectedER: "1.04", marginCallRisk: "Rendah / Low",
  });
});
test("legacy adverse scenario remains clamped to 100", () => {
  const result = calculateRisk({ ...base, modal: 50000, strategy: "Martingale", maxLayer: "5", marketCondition: "Trending" });
  assert.equal(result.score, 100); assert.equal(result.status, "TIDAK LAYAK");
});
test("all original target/strategy combinations retain historical PF values", () => {
  for (const [strategy, targetPoin, expected] of [
    ["Linear Averaging", "30", "14.73"], ["Linear Averaging", "40", "3.48"], ["Linear Averaging", "50", "4.69"],
    ["Martingale", "30", "3.75"], ["Martingale", "40", "6.23"], ["Martingale", "50", "7.82"],
  ] as const) assert.equal(calculateRisk({ ...base, strategy, targetPoin }).metrics.expectedPF, expected);
});
test("legacy schema rejects invalid strategies, zero capital and nonfinite capital", () => {
  for (const modal of [0, -1, Infinity, NaN]) assert.equal(riskInputSchema.safeParse({ ...base, modal }).success, false);
  assert.equal(riskInputSchema.safeParse({ ...base, strategy: "Unknown" }).success, false);
});
