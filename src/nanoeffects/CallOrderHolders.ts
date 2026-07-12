import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";
import { getObjects } from "@/nanoeffects/src/common.ts";
import { getMaxObjectIDs } from "@/nanoeffects/MaxObjectID.ts";

/**
 * Fetch call orders (1.8.x) on the chain. Call orders represent debt
 * positions (smartcoins shortened into existence); the `borrower` account is
 * the debt/collateral holder. Used as a weighted airdrop candidate pool
 * (weight = collateral amount).
 *
 * When `debtAssetId` is supplied the results are scoped to that single
 * smartcoin (its `debt.asset_id` must match), so the pool reflects only the
 * borrowers of the chosen market-pegged asset.
 */
async function getCallOrderHolders(chain, specificNode, debtAssetId) {
  const maxN = await getMaxObjectIDs(chain, 1, 8, specificNode);
  if (!maxN || maxN < 1) return [];
  const ids = [];
  for (let i = 1; i <= maxN; i++) {
    ids.push(`1.8.${i}`);
  }
  const objects = await getObjects(chain, ids, specificNode);
  return objects
    .filter((o) => o && o.borrower)
    .filter((o) => !debtAssetId || (o.debt && o.debt.asset_id === debtAssetId))
    .map((o) => ({
      id: o.borrower,
      collateral:
        o.collateral && o.collateral.amount ? Number(o.collateral.amount) : 0,
      debt: o.debt && o.debt.amount ? Number(o.debt.amount) : 0,
    }));
}

const [createCallOrderHoldersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;
    const debtAssetId = args[2] ? (args[2] as string) : null;
    try {
      return await getCallOrderHolders(chain, specificNode, debtAssetId);
    } catch (error) {
      console.log({ error });
      return [];
    }
  },
});

export { createCallOrderHoldersStore, getCallOrderHolders };
