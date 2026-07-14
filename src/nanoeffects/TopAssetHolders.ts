import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

/**
 * Top holders of a given asset, ranked by on-chain balance.
 *
 * Mirrors the explorer's `getAssetHolders` pattern: queries the
 * `objects-balance` Elasticsearch index, filters by `asset_type`, and
 * sorts by `balance` descending.  The results are suitable for seeding
 * an airdrop candidate pool weighted by asset holdings.
 *
 * @module TopAssetHolders
 */

const ES_BALANCES_INDEX = "objects-balance";

/**
 * Fetch the top holders of a specific asset from the Elasticsearch
 * balances index.
 *
 * @param {string}  assetId  The asset id to query (e.g. `"1.3.0"` for the
 *   core asset).
 * @param {number}  [limit=20]  Maximum number of holders to return.
 * @returns {Promise<Array<{id: string, balance: number}>>}
 *   Array of `{ id, balance }` objects sorted by balance descending.
 *   Empty array on error or if `assetId` is falsy.
 */
async function getTopAssetHolders(assetId: string, limit: number = 20) {
  if (!assetId) return [];
  const body = {
    query: {
      bool: { must: [{ match: { asset_type: { query: assetId } } }] },
    },
    track_total_hits: false,
    size: limit,
    sort: [{ balance: { order: "desc" } }],
  };
  const json = await esSearch(ES_BALANCES_INDEX, body);
  const hits = json?.hits?.hits;
  if (!Array.isArray(hits)) return [];
  return hits
    .map((h: any) => ({
      id: h._source?.owner_ ?? "",
      balance: Number(h._source?.balance ?? 0),
    }))
    .filter((x: any) => x.id);
}

/**
 * Nanoquery store that fetches top asset holders.
 *
 * Wraps {@link getTopAssetHolders} for use with `@nanostores/query`.
 * The store keys are `[assetId, limit?]`.
 *
 * @example
 * ```ts
 * const store = createTopAssetHoldersStore("1.3.0", 50);
 * // store.value = [{ id: "1.2.3", balance: 1000000 }, ...]
 * ```
 */
const [createTopAssetHoldersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const assetId = args[0] as string;
    const limit = (args[1] as number) ?? 20;
    try {
      return await getTopAssetHolders(assetId, limit);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createTopAssetHoldersStore, getTopAssetHolders };
