import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Fetch call orders for a specific smartcoin using the chain's
 * `get_call_orders` database API.
 *
 * @param chain       - "bitshares" or "bitshares_testnet"
 * @param specificNode - optional WebSocket node URL
 * @param debtAssetId  - the asset ID of the smartcoin (e.g. "1.3.x")
 */
async function getCallOrderHolders(
  chain: string,
  specificNode: string | null,
  debtAssetId: string,
) {
  if (!debtAssetId) return [];

  let currentAPI;
  const node = specificNode
    ? specificNode
    : (chains as any)[chain].nodeList[0].url;

  try {
    currentAPI = await Apis.instance(
      node,
      true,
      4000,
      { enableDatabase: true },
      (error: Error) => console.log({ error }),
    );
  } catch (error) {
    console.log({ error });
    return [];
  }

  try {
    const callOrders = await currentAPI
      .db_api()
      .exec("get_call_orders", [debtAssetId, 300]);

    currentAPI.close();

    if (!callOrders || !Array.isArray(callOrders)) return [];

    function toNum(val: any): number {
      if (typeof val === "number") return val;
      if (typeof val === "string" && val !== "") return Number(val);
      if (val && typeof val === "object" && val.amount != null) return Number(val.amount);
      return 0;
    }

    return callOrders
      .filter((o: any) => o && o.borrower)
      .map((o: any) => ({
        id: o.borrower,
        collateral: toNum(o.collateral),
        debt: toNum(o.debt),
        target_collateral_ratio: o.target_collateral_ratio
          ? Number(o.target_collateral_ratio)
          : 0,
      }));
  } catch (error) {
    console.log({ error });
    currentAPI.close();
    return [];
  }
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
