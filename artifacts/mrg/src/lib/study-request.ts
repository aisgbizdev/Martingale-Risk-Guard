import type { RiskInput, RiskResult } from "../../../../lib/mrg-shared/src/schema";

// Each explicit calculation owns its response, including repeat submissions of the same inputs.
export function studyRequestOptions(params: RiskInput | null, revision: number) {
  return {
    enabled: !!params,
    queryKey: ["/api/calculate-risk", params, revision] as const,
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<RiskResult> => {
      const response = await fetch("/api/calculate-risk", {
        signal, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error("Gagal menghitung risiko");
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 0,
  };
}
