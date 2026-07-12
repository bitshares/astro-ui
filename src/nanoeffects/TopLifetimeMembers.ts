import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

// Accounts that upgraded to lifetime member, over a rolling lookback window.
// Based on the account_upgrade operation (operation_type 8) where
// `upgrade_to_lifetime_member` is true. Aggregates on `account_to_upgrade`.
// Can be used to seed an airdrop candidate pool of recent LTM upgraders
// (replacing the old on-chain LTM enrichment check).

const ES_OPS_INDEX = "bitshares-*";
const OP_ACCOUNT_UPGRADE = 8;

function timeRange(lookbackDays: number, fromTimestamp?: number) {
  if (fromTimestamp) {
    return { gte: fromTimestamp, lte: Date.now(), format: "epoch_millis" };
  }
  const lookbackHours = Math.max(1, lookbackDays * 24);
  return { gte: `now-${lookbackHours}h`, lte: "now" };
}

async function getTopLifetimeMembers(limit: number = 100, lookbackDays: number = 30, fromTimestamp?: number) {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_ACCOUNT_UPGRADE } },
          { term: { "operation_history.op_object.upgrade_to_lifetime_member": true } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
        ],
      },
    },
    aggs: {
      by_account: {
        terms: {
          field: "operation_history.op_object.account_to_upgrade.keyword",
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

const [createTopLifetimeMembersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const limit = (args[0] as number) ?? 100;
    const lookbackDays = (args[1] as number) ?? 30;
    const fromTimestamp = (args[2] as number) ?? undefined;
    try {
      return await getTopLifetimeMembers(limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopLifetimeMembersStore, getTopLifetimeMembers };
