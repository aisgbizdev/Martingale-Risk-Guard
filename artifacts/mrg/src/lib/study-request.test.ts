import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { studyRequestOptions } from "./study-request";
import { paramsKey } from "../../../../lib/mrg-shared/src/study-identity";
import type { RiskInput } from "../../../../lib/mrg-shared/src/schema";

test("late calculations cannot replace a newer request, including identical parameters", async () => {
  const originalFetch = globalThis.fetch;
  const pending: { resolve: (response: Response) => void; signal: AbortSignal; body: RiskInput }[] = [];
  // Deliberately ignore cancellation to model a transport that completes too late.
  globalThis.fetch = async (_url, init) => new Promise<Response>(resolve => {
    pending.push({ resolve, signal: init!.signal as AbortSignal, body: JSON.parse(init!.body as string) });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const params: RiskInput = { modal: 20000, targetPoin: "30", strategy: "Linear Averaging", maxLayer: "3", experience: "Pemula", marketCondition: "Trending" };
  const observer = new QueryObserver(client, studyRequestOptions(params, 1));
  const unsubscribe = observer.subscribe(() => {});
  try {
    const changed = { ...params, modal: 30000 };
    assert.notEqual(paramsKey(params), paramsKey(changed)); // Home hides the old result immediately on edit.
    observer.setOptions(studyRequestOptions(changed, 2));
    assert.equal(pending[0].signal.aborted, true);
    assert.equal(observer.getCurrentResult().data, undefined);
    pending[1].resolve(Response.json({ score: 22 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(observer.getCurrentResult().data?.score, 22);
    pending[0].resolve(Response.json({ score: 99 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(observer.getCurrentResult().data?.score, 22);
    assert.equal(pending[1].body.modal, 30000);

    observer.setOptions(studyRequestOptions(changed, 3));
    assert.equal(observer.getCurrentResult().data, undefined);
    observer.setOptions(studyRequestOptions(changed, 4));
    pending[3].resolve(Response.json({ score: 44 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    pending[2].resolve(Response.json({ score: 33 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(observer.getCurrentResult().data?.score, 44);
    assert.equal(studyRequestOptions(changed, 4).refetchOnReconnect, false);
    assert.equal(studyRequestOptions(changed, 4).refetchOnWindowFocus, false);
  } finally {
    unsubscribe(); client.clear(); globalThis.fetch = originalFetch;
  }
});
