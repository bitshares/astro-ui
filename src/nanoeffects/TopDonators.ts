import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Accounts that transferred the most of a given asset TO a target account
 * over a rolling lookback window.
 *
 * Queries the `bitshares-*` Elasticsearch index for `transfer` operations
 * (operation type 0) where `op_object.to` matches the target account and
 * `op_object.amount_.asset_id` matches the asset (default BTS `1.3.0`).
 * Self-transfers (`from == to`) are excluded.  Aggregates on the sender
 * (`op_object.from`) with a `sum` sub-aggregation on `amount_.amount` so
 * donors are ranked by total amount transferred rather than transfer count.
 *
 * The transfer payload is stored under `op_object.amount_` (trailing
 * underscore) in the BitShares Elasticsearch index, not `op_object.amount`.
 *
 * Can be used to identify the biggest donator to an account in order to
 * grant that single user benefits within the UX.
 *
 * @module TopDonators
 */

const ES_OPS_INDEX = "bitshares-*";
const OP_TRANSFER = 0;

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
 * Fetch the accounts that transferred the most of a given asset to a target
 * account over the lookback window, aggregated by total amount sent.
 *
 * @param {string}  targetAccountId     The recipient account id (e.g.
 *   `"1.2.123"`).
 * @param {string}  [assetId="1.3.0"]   The asset id to count (e.g. BTS
 *   `"1.3.0"`).
 * @param {number}  [limit=100]         Maximum number of donors to return.
 * @param {number}  [lookbackDays=30]   Number of days to look back (used
 *   when `fromTimestamp` is not set).
 * @param {number|undefined} [fromTimestamp]  Optional fixed start time in
 *   epoch milliseconds.
 * @returns {Promise<Array<{id: string, count: number, totalAmount: number}>>}
 *   Array of `{ id, count, totalAmount }` sorted by total amount sent
 *   (satoshi) descending.  Empty array on error or falsy input.
 */
async function getTopDonators(
  targetAccountId: string,
  assetId: string = "1.3.0",
  limit: number = 100,
  lookbackDays: number = 30,
  fromTimestamp?: number,
) {
  if (!targetAccountId || !assetId) return [];
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { operation_type: OP_TRANSFER } },
          { term: { "operation_history.op_object.to.keyword": targetAccountId } },
          { term: { "operation_history.op_object.amount_.asset_id.keyword": assetId } },
          { range: { "block_data.block_time": timeRange(lookbackDays, fromTimestamp) } },
          { script: { script: { source: "doc[\"account_history.account.keyword\"].value == doc[\"operation_history.op_object.from.keyword\"].value" } } },
        ],
        must_not: [
          { term: { "operation_history.op_object.from.keyword": targetAccountId } },
        ],
      },
    },
    aggs: {
      by_donor: {
        terms: {
          field: "operation_history.op_object.from.keyword",
          size: limit,
          order: { total_sent: "desc" },
        },
        aggs: {
          total_sent: {
            sum: { field: "operation_history.op_object.amount_.amount" },
          },
        },
      },
    },
  };
  const json = await esSearch(ES_OPS_INDEX, body);
  const buckets = json?.aggregations?.by_donor?.buckets;
  if (!Array.isArray(buckets)) return [];
  return buckets
    .map((b: any) => ({ id: b.key, count: b.doc_count, totalAmount: Number(b.total_sent?.value ?? 0) }))
    .filter((x: any) => x.id);
}

/**
 * Nanoquery store that fetches top donators to a target account.
 *
 * Wraps {@link getTopDonators} for use with `@nanostores/query`.
 * The store keys are `[targetAccountId, assetId?, limit?, lookbackDays?, fromTimestamp?]`.
 * The first entry (`result[0]`) is the biggest donator to the account.
 *
 * @example
 * ```ts
 * const store = createTopDonatorsStore("1.2.123", "1.3.0", 10, 30);
 * // store.value = [{ id: "1.2.321", count: 15, totalAmount: 5000000000 }, ...]
 * ```
 */
const [createTopDonatorsStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const targetAccountId = args[0] as string;
    const assetId = (args[1] as string) ?? "1.3.0";
    const limit = (args[2] as number) ?? 100;
    const lookbackDays = (args[3] as number) ?? 30;
    const fromTimestamp = (args[4] as number) ?? undefined;
    try {
      return await getTopDonators(targetAccountId, assetId, limit, lookbackDays, fromTimestamp);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopDonatorsStore, getTopDonators };