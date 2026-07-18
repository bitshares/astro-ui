import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Most actively traded market pairs, ranked by number of `fill_order`
 * operations over a rolling lookback window.
 *
 * Complements `TopLimitOrderFillers`, which tallies *accounts* that perform
 * fills.  Here we instead accumulate the *trading pairs* themselves: each
 * `fill_order` moves two assets (`pays.asset_id` -> `receives.asset_id`), so we
 * group fills by that asset pair to surface the busiest BitShares markets.
 *
 * The pair is found with a `composite` aggregation over the two asset-id
 * fields, then canonicalised in JS (both orderings of a market collapse into a
 * single entry) and summed.
 *
 * @module TopActiveMarkets
 */

const ES_OPS_INDEX = "bitshares-*";
const OP_FILL_ORDER = 4;

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
 * Canonicalise an unordered trading pair into a stable key.
 *
 * A market between assets A and B is the same regardless of which side is the
 * `pays` or `receives` leg, so we sort the two ids before joining.
 *
 * @param {string} a  First asset id.
 * @param {string} b  Second asset id.
 * @returns {string}  Stable pair key (e.g. `"1.3.0|1.3.1"`).
 * @private
 */
function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

/**
 * Fetch the most actively traded market pairs by fill-order volume.
 *
 * @param {number}  [limit=20]       Maximum number of markets to return.
 * @param {number}  [lookbackDays=30]  Lookback window in days.
 * @param {number|undefined} [fromTimestamp]  Optional fixed start in epoch
 *   milliseconds.
 * @returns {Promise<Array<{base: string, quote: string, count: number}>>}
 *   Array of `{ base, quote, count }` sorted by fill count descending.
 *   `base`/`quote` are the two asset ids of the market (order not significant).
 *   Empty array on error.
 */
async function getTopActiveMarkets(
  limit: number = 20,
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_FILL_ORDER } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_pair: {
        composite: {
          size: 1000,
          sources: [
            { pays: { terms: { field: "operation_history.op_object.pays.asset_id.keyword" } } },
            { receives: { terms: { field: "operation_history.op_object.receives.asset_id.keyword" } } },
          ],
        },
      },
    },
  };

  const json = await esSearch(ES_OPS_INDEX, body);
  const rawBuckets = json?.aggregations?.by_pair?.buckets;
  if (!Array.isArray(rawBuckets)) return [];

  const merged = new Map<string, { base: string; quote: string; count: number }>();
  for (const b of rawBuckets) {
    const pays = b.key?.pays as string;
    const receives = b.key?.receives as string;
    if (!pays || !receives) continue;
    const key = pairKey(pays, receives);
    const existing = merged.get(key);
    if (existing) {
      existing.count += b.doc_count;
    } else {
      const [base, quote] = [pays, receives].sort();
      merged.set(key, { base, quote, count: b.doc_count });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Nanoquery store wrapping {@link getTopActiveMarkets}.
 *
 * Store keys: `[limit?, lookbackDays?, fromTimestamp?]`.
 */
const [createTopActiveMarketsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const limit = (args[0] as number) ?? 20;
    const lookbackDays = (args[1] as number) ?? 30;
    const fromTimestamp = (args[2] as number) ?? undefined;
    try {
      return await getTopActiveMarkets(limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopActiveMarketsStore, getTopActiveMarkets };
