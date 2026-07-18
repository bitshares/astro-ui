import { nanoquery } from "@nanostores/query";
import { getObjects } from "./src/common";

/**
 * Nanoquery store that fetches the chain's global parameters (object 2.0.0)
 * and reshapes them into the small slice the airdrop UI needs:
 *
 *   - **maxBytes** — `maximum_transaction_size`, used to compute how many
 *     recipients fit in a single batched transfer transaction.
 *   - **transferFeeSat** — base fee (in core-asset satoshis) for a
 *     transfer operation (op 0) from the fee schedule.
 *   - **pricePerKbyteSat** — per-kilobyte price for transfer operations,
 *     also from the fee schedule.
 *
 * Follows the same nanoeffect pattern as `GlobalProperties.ts` /
 * `Objects.ts` (nanoquery + the shared `getObjects` helper).
 *
 * The store keys are `[chain, specificNode?]`.
 *
 * @example
 * ```ts
 * const store = createChainParametersStore("bitshares", null);
 * // store.value = { maxBytes: 2097152, transferFeeSat: 200000, pricePerKbyteSat: 100000 }
 * ```
 */
const [createChainParametersStore] = nanoquery({
  fetcher: async (...args: unknown[]) => {
    const chain = args[0] as string;
    const specificNode = args[1] ? (args[1] as string) : null;

    let response;
    try {
      response = await getObjects(chain, ["2.0.0"], specificNode);
    } catch (error) {
      console.log({ error });
      return;
    }

    if (!response || !response[0] || !response[0].parameters) {
      console.log("Failed to fetch chain parameters");
      return;
    }

    const parameters = response[0].parameters;
    const transferFee = parameters.current_fees?.parameters?.[0]?.[1];

    return {
      maxBytes: parameters.maximum_transaction_size || 0,
      transferFeeSat: transferFee?.fee || 0,
      pricePerKbyteSat: transferFee?.price_per_kbyte || 0,
    };
  },
});

export { createChainParametersStore };
