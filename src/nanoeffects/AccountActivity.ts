import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Recent on-chain activity for a single account, queried directly from the
 * public BitShares Elasticsearch proxy.
 *
 * Influenced by the explorer's `AccountPage` "Recent Activity" panel, which
 * lists an account's operations via the WebSocket `get_relative_account_history`
 * call.  Here we reproduce that view against the `bitshares-*` Elasticsearch
 * index instead, reusing the same query-shaping conventions the explorer uses
 * for its ES lookups (`searchTransactionById` / `getTransactionOperationsES`):
 *
 *   - a `bool`/`must` `match` (or `term`) filter on the involved account
 *   - `collapse` on `operation_id_num` so each operation appears once
 *   - `sort` by `operation_id_num` (descending = most recent first)
 *   - `track_total_hits: false` to keep the response light
 *   - `size` to bound the page
 *
 * The `op` payload is parsed exactly like the explorer does: it may arrive as
 * a JSON string or an already-decoded `[opType, opData]` tuple.
 *
 * @module AccountActivity
 */

const ES_OPS_INDEX = "bitshares-*";

/**
 * Parse an `operation_history.op` value into a `[opType, opData]` tuple.
 *
 * Mirrors the explorer's defensive parsing in `bitshares-api.ts`
 * (`searchTransactionById` / `getTransactionOperationsES`): the field can be a
 * JSON-encoded string or an already-decoded array.
 *
 * @param {unknown} opRaw  Raw `operation_history.op` value.
 * @returns {[number, any]}  Decoded `[opType, opData]` tuple.
 * @private
 */
function parseOp(opRaw: unknown): [number, any] {
  if (typeof opRaw === "string") {
    try {
      const parsed = JSON.parse(opRaw);
      if (Array.isArray(parsed)) return parsed as [number, any];
    } catch {
      /* fall through to default */
    }
  } else if (Array.isArray(opRaw)) {
    return opRaw as [number, any];
  }
  return [0, {}];
}

/**
 * Fetch the most recent operations that involve a given account.
 *
 * @param {string}  accountId       The account id to query (e.g. `"1.2.123"`).
 * @param {number}  [limit=20]      Maximum number of operations to return.
 * @param {number}  [lookbackDays]  Optional rolling lookback window in days.
 *   When provided, only operations newer than `now - lookbackDays` are
 *   returned.  Omit for "all history, most recent first".
 * @returns {Promise<Array<{
 *   operation_id_num: number,
 *   op: [number, any],
 *   block_num: number,
 *   trx_in_block: number,
 *   timestamp: string,
 *   is_virtual: boolean
 * }>>}
 *   Array of operations sorted most-recent-first.  Empty array on error or if
 *   `accountId` is falsy.
 */
async function getAccountActivity(
  accountId: string,
  limit: number = 20,
  lookbackDays?: number,
) {
  if (!accountId) return [];

  const must: any[] = [
    { term: { "account_history.account": accountId } },
  ];
  if (lookbackDays && lookbackDays > 0) {
    must.push({
      range: { "block_data.block_time": { gte: `now-${lookbackDays * 24}h`, lte: "now" } },
    });
  }

  const body = {
    query: { bool: { must } },
    track_total_hits: false,
    collapse: { field: "operation_id_num" },
    sort: [{ operation_id_num: { order: "desc" } }],
    size: limit,
  };

  const json = await esSearch(ES_OPS_INDEX, body);
  const hits = json?.hits?.hits;
  if (!Array.isArray(hits)) return [];

  return hits
    .map((h: any) => {
      const source = h._source ?? {};
      const opHistory = source.operation_history ?? {};
      return {
        operation_id_num: Number(h._source?.operation_id_num ?? 0),
        op: parseOp(opHistory.op),
        block_num: Number(source.block_data?.block_num ?? 0),
        trx_in_block: Number(opHistory.trx_in_block ?? 0),
        timestamp: String(source.block_data?.block_time ?? "").replace("T", " "),
        is_virtual: !!opHistory.is_virtual,
      };
    })
    .filter((x: any) => x.block_num);
}

/**
 * Nanoquery store wrapping {@link getAccountActivity}.
 *
 * Store keys: `[accountId, limit?, lookbackDays?]`.
 */
const [createAccountActivityStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const accountId = args[0] as string;
    const limit = (args[1] as number) ?? 20;
    const lookbackDays = (args[2] as number) ?? undefined;
    try {
      return await getAccountActivity(accountId, limit, lookbackDays);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createAccountActivityStore, getAccountActivity };
