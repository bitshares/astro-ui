import { nanoquery } from "@nanostores/query";
import { getObjects } from "./src/common";

/**
 * Fetch the chain's global parameters (object 2.0.0) and reshape them into the
 * small slice the UI needs:
 *   - maxBytes: maximum_transaction_size
 *   - transferFeeSat / pricePerKbyteSat: from the transfer (op 0) fee schedule
 *
 * Follows the same nanoeffect pattern as GlobalProperties.ts / Objects.ts
 * (nanoquery + the shared getObjects helper).
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
