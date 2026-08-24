import Apis from "@/bts/ws/ApiInstances";
import chain_store from "@/bts/chain/ChainStore";
import { chains } from "@/config/chains";

/**
 * Shared ChainStore initializer - single source of truth for all
 * subscription hooks (DEX pilot + pages 2-9 rollout).
 *
 * Guarantees one retained Apis connection per chain|node pair and a
 * `set_subscribe_callback`-subscribed ChainStore. Handles cache reset
 * when switching chains/nodes.
 */

let sharedInitPromise: Promise<void> | null = null;
let sharedInitKey = "";

export function nodeUrlFor(
  chain: string,
  specificNode?: string | null
): string {
  return specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
}

export async function ensureChainStoreShared(
  chain: string,
  specificNode?: string | null
): Promise<void> {
  const node = nodeUrlFor(chain, specificNode);
  const key = `${chain}|${node}`;
  if (sharedInitPromise && sharedInitKey === key && chain_store.subscribed) {
    return sharedInitPromise;
  }
  await Apis.instance(node, true, 4000, { enableDatabase: true }, () => {});
  chain_store.setDispatchFrequency(40);
  if (sharedInitKey !== key && chain_store.subscribed) {
    try {
      chain_store.clearCache();
      (chain_store as any).subscribed = false;
    } catch {}
  }
  sharedInitKey = key;
  sharedInitPromise = chain_store
    .init(true)
    .then(() => {})
    .catch((e) => {
      sharedInitPromise = null;
      throw e;
    });
  return sharedInitPromise;
}
