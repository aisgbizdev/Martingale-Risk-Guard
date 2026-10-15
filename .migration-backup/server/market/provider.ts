export class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function fetchProviderJson(url: string, authenticated = false): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authenticated) {
    const token = process.env.NEWSMAKER_API_TOKEN;
    if (!token) throw new ProviderError(401, "Newsmaker API access is not configured");
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!response.ok) throw new ProviderError(response.status, "Market provider rejected the request");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Provider returned no body");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 2_000_000) {
      await reader.cancel();
      throw new Error("Provider payload exceeds the permitted size");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// Shared per-process cache: collapse concurrent requests and cache failures briefly.
export class SingleFlightCache<T> {
  private value: T | undefined;
  private expiresAt = 0;
  private failure: unknown;
  private retryAt = 0;
  private pending: Promise<T> | undefined;

  async get(load: () => Promise<T>, ttlMs: number, now = Date.now()): Promise<T> {
    if (this.value !== undefined && now < this.expiresAt) return this.value;
    if (this.pending) return this.pending;
    if (now < this.retryAt) throw this.failure;
    this.pending = load().then((value) => {
      this.value = value;
      this.expiresAt = Date.now() + ttlMs;
      this.retryAt = 0;
      return value;
    }).catch((error) => {
      this.failure = error;
      this.retryAt = Date.now() + 5_000;
      throw error;
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }
}

export const QUOTE_BASE = "https://endpoapi-production-3202.up.railway.app/api";
export const NEWSMAKER_BASE = "https://portalnews.newsmaker.id/api/v1/newsmaker";
