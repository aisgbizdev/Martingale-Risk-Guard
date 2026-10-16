// Bounded, order-preserving batch processing. No automatic paid retries.
export async function batchProcess<T, R>(
  items: readonly T[], process: (item: T) => Promise<R>,
  options: { concurrency: number; retries: number },
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      let attempt = 0;
      while (true) {
        try { results[index] = await process(items[index]); break; }
        catch (error) { if (attempt++ >= options.retries) throw error; }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, options.concurrency)) }, worker));
  return results;
}
