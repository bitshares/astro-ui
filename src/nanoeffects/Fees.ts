import { nanoquery } from "@nanostores/query";
import { getObjects } from "./src/common";

/**
 * Nanoquery store that fetches the network's global fee schedule from the
 * global properties object (2.0.0) and reshapes it into everything the
 * Network Fees page needs:
 *
 *   - **fees** — the raw `[operationId, params]` pairs of
 *     `current_fees.parameters`, covering every operation and every fee
 *     parameter it defines (fee, price_per_kbyte, symbol3,
 *     membership_lifetime_fee, ...).
 *   - **scale** — `current_fees.scale` (fee scaling denominator).
 *   - **networkPercentOfFee** — `network_percent_of_fee` (basis points).
 *     A lifetime member is their own referrer/registrar/lifetime-referrer,
 *     so that share is rebated as cashback and their effective cost is
 *     `fee * networkPercentOfFee / 10000`.
 *
 * The fee schedule rarely changes, so this is a plain one-shot fetch with
 * no subscription to the data source.
 *
 * The store keys are `[chain, specificNode?]`.
 */
const [createFeesStore] = nanoquery({
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
      console.log("Failed to fetch global fee schedule");
      return;
    }

    const parameters = response[0].parameters;
    const currentFees = parameters.current_fees;

    if (!currentFees || !currentFees.parameters) {
      console.log("Global properties did not contain a fee schedule");
      return;
    }

    return {
      fees: currentFees.parameters,
      scale: currentFees.scale || 10000,
      networkPercentOfFee: parameters.network_percent_of_fee ?? 10000,
    };
  },
});

export { createFeesStore };
