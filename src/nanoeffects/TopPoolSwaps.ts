import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Most active liquidity pools, ranked by number of `liquidity_pool_exchange`
 * operations (swaps) over a rolling lookback window.
 *
 * Mirrors the conventions used by `TopActiveMarkets` / `TopLimitOrderFillers`:
 * the `bitshares-*` Elasticsearch index is queried directly via `esSearch`,
 * filtering on `operation_type` (63 = `liquidity_pool_exchange`) and an
 * optional time range, then a `terms` aggregation on the pool id tallies the
 * swap volume per pool.
 *
 * @module TopPoolSwaps
 */

const ES_OPS_INDEX = "bitshares-*";
const OP_LIQUIDITY_POOL_EXCHANGE = 63;

/**
 * Build an Elasticsearch range filter for `block_data.block_time`.
 *
 * @param {number}           lookbackDays    Number of days to look back.
 * @param {number|undefined} fromTimestamp   Optional fixed start in epoch
 *   milliseconds (takes precedence over `lookbackDays`).
 * @returns {{ gte: number|string, lte: string|number, format?: string }}
 *   Elasticsearch range object.
 */
function timeRange(lookbackDays: number, fromTimestamp?: number) {
  if (fromTimestamp) {
    return { gte: fromTimestamp, lte: Date.now(), format: "epoch_millis" };
  }
  const lookbackHours = Math.max(1, lookbackDays * 24);
  return { gte: `now-${lookbackHours}h`, lte: "now" };
}

/**
 * Fetch the liquidity pools with the most swaps (exchange operations).
 *
 * @param {number}  [limit=20]       Maximum number of pools to return.
 * @param {number}  [lookbackDays=30]  Lookback window in days.
 * @param {number|undefined} [fromTimestamp]  Optional fixed start in epoch
 *   milliseconds.
 * @returns {Promise<Array<{pool: string, count: number}>>}
 *   Array of `{ pool, count }` sorted by swap count descending.
 *   Empty array on error.
 */
async function getTopPoolSwaps(
  limit: number = 20,
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_LIQUIDITY_POOL_EXCHANGE } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_pool: {
        terms: {
          field: "operation_history.op_object.pool.keyword",
          size: limit,
          order: { _count: "desc" },
        },
      },
    },
  };

  const json = await esSearch(ES_OPS_INDEX, body);
  const buckets = json?.aggregations?.by_pool?.buckets;
  if (!Array.isArray(buckets)) return [];
  return buckets
    .map((b: any) => ({ pool: b.key, count: b.doc_count }))
    .filter((x: any) => x.pool);
}

/**
 * Nanoquery store wrapping {@link getTopPoolSwaps}.
 *
 * Store keys: `[limit?, lookbackDays?, fromTimestamp?]`.
 */
const [createTopPoolSwapsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const limit = (args[0] as number) ?? 20;
    const lookbackDays = (args[1] as number) ?? 30;
    const fromTimestamp = (args[2] as number) ?? undefined;
    try {
      return await getTopPoolSwaps(limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopPoolSwapsStore, getTopPoolSwaps };
