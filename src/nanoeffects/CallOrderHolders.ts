import { nanoquery } from "@nanostores/query";
import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Fetch call orders for a specific smartcoin using the chain's
 * `get_call_orders` database API.
 *
 * Call orders (object type 1.8.x) represent margin-borrowed positions
 * where an account has posted collateral against a debt in a smartcoin.
 * This function retrieves up to 300 call orders for the given debt asset
 * and reshapes them into a flat summary suitable for the airdrop
 * leaderboard.
 *
 * @param {string}       chain         Chain identifier (`"bitshares"` or
 *   `"bitshares_testnet"`).
 * @param {string|null}  specificNode  Optional WebSocket node URL.
 * @param {string}       debtAssetId   The asset ID of the smartcoin
 *   (e.g. `"1.3.x"`) whose call orders to fetch.
 * @returns {Promise<Array<{
 *   id: string,
 *   collateral: number,
 *   debt: number,
 *   target_collateral_ratio: number
 * }>>}
 *   Array of call order summaries, one per borrower.  Empty array on
 *   error or if `debtAssetId` is falsy.
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

    /**
     * Normalise a value to a JavaScript number.
     * Handles raw numbers, numeric strings, and BitShares
     * `{ amount }` objects.
     *
     * @param {any} val  Value to convert.
     * @returns {number}  Numeric representation, or `0`.
     */
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

/**
 * Nanoquery store that fetches call order holders for a smartcoin.
 *
 * Wraps {@link getCallOrderHolders} for use with `@nanostores/query`.
 * The store keys are `[chain, specificNode, debtAssetId]`.
 *
 * @example
 * ```ts
 * const store = createCallOrderHoldersStore(
 *   "bitshares", null, "1.3.110"
 * );
 * ```
 */
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
