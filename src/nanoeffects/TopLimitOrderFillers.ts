import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

// Top accounts by number of fill_order operations paying a given asset,
// over a rolling lookback window. Based on the DEXBot `buildTopFilledAccountsQuery`
// + `buildFillOrderQuery` (pays-asset filter), run directly against the
// bitshares-* Elasticsearch index instead of the Kibana proxy.

const ES_OPS_INDEX = "bitshares-*";
const OP_FILL_ORDER = 4;

function timeRange(lookbackDays: number, fromTimestamp?: number) {
  if (fromTimestamp) {
    return { gte: fromTimestamp, lte: Date.now(), format: "epoch_millis" };
  }
  const lookbackHours = Math.max(1, lookbackDays * 24);
  return { gte: `now-${lookbackHours}h`, lte: "now" };
}

async function getTopLimitOrderFillers(
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
          { term: { operation_type: OP_FILL_ORDER } },
          { term: { "operation_history.op_object.pays.asset_id.keyword": assetId } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_account: {
        terms: {
          field: "operation_history.op_object.account_id.keyword",
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

const [createTopLimitOrderFillersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const assetId = args[0] as string;
    const limit = (args[1] as number) ?? 100;
    const lookbackDays = (args[2] as number) ?? 30;
    const fromTimestamp = (args[3] as number) ?? undefined;
    try {
      return await getTopLimitOrderFillers(assetId, limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

// Same as above but scoped to a full trading pair: the filler pays `sellAssetId`
// and receives `buyAssetId`. Useful for rewarding takers on a specific market.
async function getTopLimitOrderFillersPair(
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
          { term: { operation_type: OP_FILL_ORDER } },
          { term: { "operation_history.op_object.pays.asset_id.keyword": sellAssetId } },
          { term: { "operation_history.op_object.receives.asset_id.keyword": buyAssetId } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_account: {
        terms: {
          field: "operation_history.op_object.account_id.keyword",
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

const [createTopLimitOrderFillersPairStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const sellAssetId = args[0] as string;
    const buyAssetId = args[1] as string;
    const limit = (args[2] as number) ?? 100;
    const lookbackDays = (args[3] as number) ?? 30;
    const fromTimestamp = (args[4] as number) ?? undefined;
    try {
      return await getTopLimitOrderFillersPair(sellAssetId, buyAssetId, limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export {
  createTopLimitOrderFillersStore,
  getTopLimitOrderFillers,
  createTopLimitOrderFillersPairStore,
  getTopLimitOrderFillersPair,
};
