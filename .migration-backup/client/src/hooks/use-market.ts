import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Article, MarketContext, QuoteResponse } from "@shared/live-types";
import { quoteIsFresh } from "@shared/live-types";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Data belum dapat dimuat / Data could not be loaded");
  return response.json();
}

export function useMarket() {
  const [now, setNow] = useState(Date.now);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const quotes = useQuery<QuoteResponse>({
    queryKey: ["/api/market/quotes"],
    queryFn: ({ signal }) => getJson("/api/market/quotes", signal),
    refetchInterval: 5_000, staleTime: 4_000, retry: 1,
  });
  const context = useQuery<MarketContext>({
    queryKey: ["/api/market/context"],
    queryFn: ({ signal }) => getJson("/api/market/context", signal),
    refetchInterval: 60_000, staleTime: 55_000, retry: 1,
  });
  const live = online && !quotes.isError && quotes.data?.status === "ready" &&
    quoteIsFresh(quotes.data.quote, now);
  return {
    now, online, quotes, context,
    usableQuote: live ? quotes.data!.quote : null,
    live,
    refresh: () => Promise.all([quotes.refetch(), context.refetch()]),
  };
}
export type MarketHook = ReturnType<typeof useMarket>;

export function useArticle(slug: string | null) {
  return useQuery<Article>({
    queryKey: ["/api/market/news", slug],
    queryFn: ({ signal }) => getJson(`/api/market/news/${encodeURIComponent(slug!)}`, signal),
    enabled: !!slug, staleTime: 5 * 60_000, retry: 1,
  });
}
