const DEFAULT_CONCURRENCY = 6;

export async function mapInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current] as T);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
