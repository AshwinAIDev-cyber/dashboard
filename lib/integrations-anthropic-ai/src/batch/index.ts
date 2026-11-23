import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { isRetryableAnthropicError } from "../client";

export interface BatchOptions {
  /** Max requests in flight at once (default 4). */
  concurrency?: number;
  /** Retries per item for rate limits / transient failures (default 5). */
  retries?: number;
  /** Called after each item settles. */
  onProgress?: (completed: number, total: number) => void;
}

export type BatchResult<R> = { ok: true; value: R } | { ok: false; error: unknown };

/**
 * Run `worker` over `items` with bounded concurrency and exponential-backoff
 * retries on rate-limit / overload errors. Non-retryable errors fail that item
 * immediately; results keep the input order.
 */
export async function batchProcess<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {},
): Promise<BatchResult<R>[]> {
  const { concurrency = 4, retries = 5, onProgress } = options;
  const limit = pLimit(concurrency);
  let completed = 0;

  return Promise.all(
    items.map((item, index) =>
      limit(async (): Promise<BatchResult<R>> => {
        try {
          const value = await pRetry(
            async () => {
              try {
                return await worker(item, index);
              } catch (error) {
                if (isRetryableAnthropicError(error)) throw error;
                throw new AbortError(error instanceof Error ? error : String(error));
              }
            },
            { retries, factor: 2, minTimeout: 1_000, maxTimeout: 30_000, randomize: true },
          );
          return { ok: true, value };
        } catch (error) {
          return { ok: false, error };
        } finally {
          completed += 1;
          onProgress?.(completed, items.length);
        }
      }),
    ),
  );
}
