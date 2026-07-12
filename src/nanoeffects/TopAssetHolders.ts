import { nanoquery } from "@nanostores/query";
import { esSearch } from "@/nanoeffects/src/esquery.ts";

// Top holders of a given asset, ranked by on-chain balance.
// Mirrors the explorer `getAssetHolders` ES query against the objects-balance index
// (filter by asset_type, sort by balance desc).

const ES_BALANCES_INDEX = "objects-balance";

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
