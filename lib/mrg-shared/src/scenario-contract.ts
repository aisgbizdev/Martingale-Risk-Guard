/** User-selected educational assumptions, not verified broker specifications. */
export const SCENARIO_CONTRACT = Object.freeze({
  firstLot: 1,
  marginPerLot: 1000,
  dollarsPerPointPerLot: 100,
});
export const SCENARIO_BUDGET = Object.freeze({ marginFraction: 0.2, stressFraction: 0.1 });

export const CONTRACT_PROFILES = Object.freeze({
  regular: Object.freeze({ id: "regular" as const, ...SCENARIO_CONTRACT }),
  mini: Object.freeze({ id: "mini" as const, firstLot: 1, marginPerLot: 100, dollarsPerPointPerLot: 10 }),
  micro: Object.freeze({ id: "micro" as const, firstLot: 1, marginPerLot: 10, dollarsPerPointPerLot: 1 }),
});
export type ContractProfileId = keyof typeof CONTRACT_PROFILES;
export type ScenarioContract = (typeof CONTRACT_PROFILES)[ContractProfileId];

export function scenarioContract(profile: ContractProfileId = "regular"): ScenarioContract {
  if (!Object.hasOwn(CONTRACT_PROFILES, profile)) throw new Error("Profil simulasi tidak valid.");
  return CONTRACT_PROFILES[profile];
}

/** Stored assumptions must match a known profile, never arbitrary supplied coefficients. */
export function validScenarioContract(value: unknown): value is ScenarioContract {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== "string" || !Object.hasOwn(CONTRACT_PROFILES, c.id)) return false;
  const known = scenarioContract(c.id as ContractProfileId);
  return c.firstLot === known.firstLot && c.marginPerLot === known.marginPerLot &&
    c.dollarsPerPointPerLot === known.dollarsPerPointPerLot;
}

export function scenarioLots(strategy: "Linear Averaging" | "Martingale", layers: number, firstLot: number = SCENARIO_CONTRACT.firstLot) {
  return Array.from({ length: layers }, (_, i) =>
    firstLot * (strategy === "Martingale" ? 2 ** i : i + 1));
}
