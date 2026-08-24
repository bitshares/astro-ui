import Apis from "@/bts/ws/ApiInstances";
import chain_store from "@/bts/chain/ChainStore";
import { chains } from "@/config/chains";

/**
 * Live account limit order subscription via ChainStore.
 * NEW file - does NOT edit AccountLimitOrders.ts
 *
 * Uses ChainStore.init() -> set_subscribe_callback -> onUpdate -> notifySubscribers (40ms coalesce)
 * Then market-level batch at 500ms for UI update (bitshares-ui parity).
 *
 * ChainStore tracks account.orders Set (ChainStore.js:779, _updateObject limit_order case)
 * and emits via subscribers.
 */

const BATCH_TIME = 500;

let chainStoreInitPromise: Promise<void> | null = null;
let chainStoreInitChain: string | null = null;
let chainStoreNode: string | null = null;

async function ensureChainStore(
  chain: string,
  specificNode?: string | null
): Promise<void> {
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
  // If already subscribed to same chain/node, reuse
  if (chainStoreInitPromise && chainStoreInitChain === chain && chainStoreNode === node && chain_store.subscribed) {
    return chainStoreInitPromise;
  }

  // Need Apis instance before ChainStore.init
  const api = await Apis.instance(node, true, 4000, { enableDatabase: true }, (e) => console.log(e));
  // retain keeps socket alive; ChainStore will use same singleton
  // Do NOT close after init - hold retain
  chain_store.setDispatchFrequency(40);

  // reset if switching chain/node
  if (chainStoreInitChain !== chain || chainStoreNode !== node) {
    try {
      // clear previous cache if chain changed
      if (chain_store.subscribed) {
        chain_store.clearCache();
        (chain_store as any).subscribed = false;
      }
    } catch {}
  }

  chainStoreInitChain = chain;
  chainStoreNode = node;

  chainStoreInitPromise = chain_store
    .init(true)
    .then(() => {
      console.log("DexAccountOrdersLive: ChainStore ready for", chain, node);
    })
    .catch((e) => {
      console.log("DexAccountOrdersLive ChainStore init failed", e);
      chainStoreInitPromise = null;
      throw e;
    });

  return chainStoreInitPromise;
}

/**
 * Subscribe to live updates for account limit orders.
 * Callback receives array of limit_order objects for the account.
 */
export async function subscribeAccountLimitOrders(
  chain: string,
  accountId: string,
  onUpdate: (orders: any[]) => void,
  onError: (e: any) => void,
  specificNode?: string | null
): Promise<() => void> {
  try {
    await ensureChainStore(chain, specificNode);
  } catch (e) {
    onError(e);
    throw e;
  }

  // Ensure account is fetched and subbed (fetchFullAccount)
  // This populates ChainStore.objects_by_id and subbed_accounts Set
  const fetchAccount = () => {
    const acc = chain_store.getAccount(accountId, true);
    // getAccount triggers fetchFullAccount if needed, returns undefined initially
    if (acc && acc.orders) {
      // already available
      pushUpdate();
    }
  };

  let batchTimer: any = null;
  let unsubscribed = false;

  const pushUpdate = () => {
    if (unsubscribed) return;
    const account = chain_store.getAccount(accountId, true);
    if (!account || (account as any) === true || account.orders === undefined) {
      // still fetching
      return;
    }
    // account.orders is Set of limit_order ids
    const orders: any[] = [];
    const orderIds = account.orders instanceof Set ? Array.from(account.orders) : [];
    for (const id of orderIds) {
      const obj = chain_store.getObject(id);
      if (obj && obj !== true) orders.push(obj);
    }
    onUpdate(orders);
  };

  const batchedPush = () => {
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      pushUpdate();
    }, BATCH_TIME);
  };

  const chainCallback = () => {
    batchedPush();
  };

  chain_store.subscribe(chainCallback);

  // trigger initial fetch
  fetchAccount();
  // If account not yet loaded, ChainStore notify will trigger batchedPush

  // Also fetch once after short delay to ensure orders populated
  setTimeout(() => { if (!unsubscribed) pushUpdate(); }, 600);

  const unsubscribe = () => {
    unsubscribed = true;
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    try {
      chain_store.unsubscribe(chainCallback);
    } catch (e) {
      console.log("unsubscribe chain_store error", e);
    }
    // Note: we keep ChainStore init + Apis retain for other subscribers; not hardClosing
  };

  return unsubscribe;
}

export async function cleanupChainStoreSubscription() {
  // optional hard cleanup when DEX page unmounts completely
  // we keep cache for fast return, so no-op for now
}
