import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Accounts that upgraded to lifetime member (LTM) over a rolling lookback
 * window.
 *
 * Queries the `bitshares-*` Elasticsearch index for `account_upgrade`
 * operations (operation type 8) where `upgrade_to_lifetime_member` is
 * `true`.  Aggregates on `account_to_upgrade` to rank accounts by
 * upgrade frequency.
 *
 * Can be used to seed an airdrop candidate pool of recent LTM upgraders
 * (replacing the old on-chain LTM enrichment check).
 *
 * @module TopLifetimeMembers
 */

const ES_OPS_INDEX = "bitshares-*";
const OP_ACCOUNT_UPGRADE = 8;

/**
 * Build an Elasticsearch range filter for `block_data.block_time`.
 *
 * If `fromTimestamp` is provided the range uses absolute epoch millis
 * (useful for a fixed window).  Otherwise the range is relative to "now"
 * using `lookbackDays`.
 *
 * @param {number}        lookbackDays    Number of days to look back from
 *   now (ignored when `fromTimestamp` is provided).
 * @param {number|undefined} fromTimestamp  Optional fixed start time in
 *   epoch milliseconds.
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
 * Fetch accounts that recently upgraded to lifetime member, aggregated
 * by upgrade count.
 *
 * @param {number}  [limit=100]        Maximum number of accounts to return.
 * @param {number}  [lookbackDays=30]  Number of days to look back (used
 *   when `fromTimestamp` is not set).
 * @param {number|undefined} [fromTimestamp]  Optional fixed start time in
 *   epoch milliseconds.
 * @returns {Promise<Array<{id: string, count: number}>>}
 *   Array of `{ id, count }` sorted by upgrade count descending.
 *   Empty array on error.
 */
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

/**
 * Nanoquery store that fetches top LTM upgraders.
 *
 * Wraps {@link getTopLifetimeMembers} for use with `@nanostores/query`.
 * The store keys are `[limit, lookbackDays, fromTimestamp?]`.
 *
 * @example
 * ```ts
 * const store = createTopLifetimeMembersStore(50, 7);
 * // store.value = [{ id: "1.2.123", count: 15 }, ...]
 * ```
 */
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
