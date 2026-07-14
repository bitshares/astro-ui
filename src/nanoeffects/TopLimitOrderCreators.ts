import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Top accounts by number of `limit_order_create` operations on a given
 * asset, over a rolling lookback window.
 *
 * Based on the DEXBot `buildTopSellerAccountsQuery` +
 * `buildOrderCreateQuery` (sell-asset filter), run directly against the
 * `bitshares-*` Elasticsearch index instead of the Kibana proxy.
 *
 * Also provides a "pair" variant that narrows to a specific trading pair
 * (sell-asset + buy-asset), useful for rewarding market makers on a
 * particular BitShares market.
 *
 * @module TopLimitOrderCreators
 */

const ES_OPS_INDEX = "bitshares-*";
const OP_LIMIT_ORDER_CREATE = 1;

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
 * Fetch accounts that created the most limit orders selling a given asset.
 *
 * @param {string}  assetId          The asset id to filter on
 *   (e.g. `"1.3.0"`).
 * @param {number}  [limit=100]      Maximum number of accounts to return.
 * @param {number}  [lookbackDays=30]  Lookback window in days.
 * @param {number|undefined} [fromTimestamp]  Optional fixed start in epoch
 *   milliseconds.
 * @returns {Promise<Array<{id: string, count: number}>>}
 *   Array of `{ id, count }` sorted by operation count descending.
 */
async function getTopLimitOrderCreators(
  assetId: string,
  limit: number = 100,
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  if (!assetId) return [];
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_LIMIT_ORDER_CREATE } },
          { term: { "operation_history.op_object.amount_to_sell.asset_id.keyword": assetId } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_account: {
        terms: {
          field: "operation_history.op_object.seller.keyword",
          size: limit,
          order: { _count: "desc" },
        },
      },
    },
  };
  const json = await esSearch(ES_OPS_INDEX, body);
  const buckets = json?.aggregations?.by_account?.buckets;
  if (!Array.isArray(buckets)) return [];
  return buckets
    .map((b: any) => ({ id: b.key, count: b.doc_count }))
    .filter((x: any) => x.id);
}

/**
 * Nanoquery store wrapping {@link getTopLimitOrderCreators}.
 *
 * Store keys: `[assetId, limit?, lookbackDays?, fromTimestamp?]`.
 */
const [createTopLimitOrderCreatorsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const assetId = args[0] as string;
    const limit = (args[1] as number) ?? 100;
    const lookbackDays = (args[2] as number) ?? 30;
    const fromTimestamp = (args[3] as number) ?? undefined;
    try {
      return await getTopLimitOrderCreators(assetId, limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

/**
 * Fetch accounts that created the most limit orders on a specific trading
 * pair: the seller offers `sellAssetId` and receives `buyAssetId`
 * (`min_to_receive`).
 *
 * Useful for rewarding market makers on a particular BitShares market.
 *
 * @param {string}  sellAssetId  The asset being sold.
 * @param {string}  buyAssetId   The asset being received.
 * @param {number}  [limit=100]      Maximum number of accounts to return.
 * @param {number}  [lookbackDays=30]  Lookback window in days.
 * @param {number|undefined} [fromTimestamp]  Optional fixed start in epoch
 *   milliseconds.
 * @returns {Promise<Array<{id: string, count: number}>>}
 *   Array of `{ id, count }` sorted by operation count descending.
 */
async function getTopLimitOrderCreatorsPair(
  sellAssetId: string,
  buyAssetId: string,
  limit: number = 100,
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  if (!sellAssetId || !buyAssetId) return [];
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_LIMIT_ORDER_CREATE } },
          { term: { "operation_history.op_object.amount_to_sell.asset_id.keyword": sellAssetId } },
          { term: { "operation_history.op_object.min_to_receive.asset_id.keyword": buyAssetId } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_account: {
        terms: {
          field: "operation_history.op_object.seller.keyword",
          size: limit,
          order: { _count: "desc" },
        },
      },
    },
  };
  const json = await esSearch(ES_OPS_INDEX, body);
  const buckets = json?.aggregations?.by_account?.buckets;
  if (!Array.isArray(buckets)) return [];
  return buckets
    .map((b: any) => ({ id: b.key, count: b.doc_count }))
    .filter((x: any) => x.id);
}

/**
 * Nanoquery store wrapping {@link getTopLimitOrderCreatorsPair}.
 *
 * Store keys: `[sellAssetId, buyAssetId, limit?, lookbackDays?, fromTimestamp?]`.
 */
const [createTopLimitOrderCreatorsPairStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const sellAssetId = args[0] as string;
    const buyAssetId = args[1] as string;
    const limit = (args[2] as number) ?? 100;
    const lookbackDays = (args[3] as number) ?? 30;
    const fromTimestamp = (args[4] as number) ?? undefined;
    try {
      return await getTopLimitOrderCreatorsPair(sellAssetId, buyAssetId, limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export {
  createTopLimitOrderCreatorsStore,
  getTopLimitOrderCreators,
  createTopLimitOrderCreatorsPairStore,
  getTopLimitOrderCreatorsPair,
};
