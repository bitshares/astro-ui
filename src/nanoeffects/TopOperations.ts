import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";
import { opTypes, operationTypes } from "@/lib/opTypes.js";

/**
 * Aggregate blockchain operations by type over a rolling lookback window.
 *
 * Queries the public BitShares Elasticsearch proxy for the last N days of
 * activity, buckets by `operation_type`, and returns each type sorted by
 * occurrence count descending.
 *
 * @module TopOperations
 */

const ES_OPS_INDEX = "bitshares-*";

// Complete map of operation_type id -> Activity.json key (method)
// Covers ids missing from operationTypes (virtual ops like fill_order)
const OPERATION_METHOD_BY_ID: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (const o of operationTypes) {
    map[o.id] = o.method;
  }
  // virtual / missing ids
  map[4] = "fill_order";
  map[42] = "asset_settle_cancel";
  map[44] = "fba_distribute";
  map[46] = "execute_bid";
  map[51] = "htlc_redeemed";
  map[53] = "htlc_refund";
  map[74] = "credit_deal_expired";
  return map;
})();

function timeRange(lookbackDays: number, fromTimestamp?: number) {
  if (fromTimestamp) {
    return { gte: fromTimestamp, lte: Date.now(), format: "epoch_millis" };
  }
  const lookbackHours = Math.max(1, lookbackDays * 24);
  return { gte: `now-${lookbackHours}h`, lte: "now" };
}

async function getTopOperations(
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_op_type: {
        terms: {
          field: "operation_type",
          size: 200,
        },
      },
    },
  };

  const json = await esSearch(ES_OPS_INDEX, body);
  const buckets = json?.aggregations?.by_op_type?.buckets;
  if (!Array.isArray(buckets)) return [];

  const total = buckets.reduce((acc: number, b: any) => acc + b.doc_count, 0);

  return buckets
    .filter((b: any) => b.doc_count > 0)
    .map((b: any) => {
      const type = b.key as number;
      return {
        type,
        method: OPERATION_METHOD_BY_ID[type] ?? null,
        fallbackName: opTypes[type] ?? `Operation #${type}`,
        count: b.doc_count as number,
        percentage: total > 0 ? ((b.doc_count / total) * 100) : 0,
      };
    })
    .sort((a: any, b: any) => b.count - a.count);
}

const [createTopOperationsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const lookbackDays = (args[0] as number) ?? 30;
    const fromTimestamp = (args[1] as number) ?? undefined;
    try {
      return await getTopOperations(lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopOperationsStore, getTopOperations };
