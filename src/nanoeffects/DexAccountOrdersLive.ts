import chain_store from "@/bts/chain/ChainStore";
import { acquireChainStore } from "@/bts/chain/chainStoreReady";

/**
 * Live account limit order subscription via ChainStore.
 *
 * Uses the shared ChainStore initializer (src/bts/chain/chainStoreReady.ts):
 * set_subscribe_callback -> onUpdate -> notifySubscribers (40ms coalesce),
 * then a market-level batch at 500ms for UI update (bitshares-ui parity).
 *
 * ChainStore tracks account.orders Set (fetchFullAccount) and pushes
 * limit_order create/cancel/fill updates for subbed accounts.
 */

const BATCH_TIME = 500;

/**
 * Subscribe to live updates for account limit orders.
 * Callback receives array of limit_order objects for the account.
 *
 * @returns unsubscribe - removes this consumer's ChainStore listener and
 *          releases its connection token.
 */
export async function subscribeAccountLimitOrders(
  chain: string,
  accountId: string,
  onUpdate: (orders: any[]) => void,
  onError: (e: any) => void,
  specificNode?: string | null
): Promise<() => void> {
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

  const fetchAccount = () => {
    const acc = chain_store.getAccount(accountId, true);
    // getAccount triggers fetchFullAccount if needed, returns undefined initially
    if (acc && acc.orders) {
      // already available
      pushUpdate();
    }
  };

  const batchedPush = () => {
    if (batchTimer) return;
    batchTimer = setTimeout(() => {
      batchTimer = null;
      pushUpdate();
    }, BATCH_TIME);
  };

  let releaseToken: (() => void) | null = null;
  try {
    // Acquire a connection token; released in the returned unsubscribe so
    // refcounts stay balanced when the consumer unsubscribes.
    releaseToken = await acquireChainStore(chain, specificNode);
  } catch (e) {
    onError(e);
    throw e;
  }

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
    if (releaseToken) {
      try { releaseToken(); } catch {}
      releaseToken = null;
    }
  };

  return unsubscribe;
}
