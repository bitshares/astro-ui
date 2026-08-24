import Apis from "@/bts/ws/ApiInstances";
import { chains } from "@/config/chains";

/**
 * Live order book subscriptions - NEW file for DEX pilot.
 * Does NOT edit existing MarketOrderBook.ts fetcher.
 *
 * Mirrors bitshares-ui MarketsActions.subscribeMarket batching:
 *  - subscribe_to_market callback batches via 500ms timeout
 *  - on flush, re-fetches get_order_book (and optionally get_limit_orders)
 *  - keeps single retained Apis connection (no close() while subscribed)
 */

const SUB_BATCH_TIME = 500; // ms, matches bitshares-ui subBatchTime

export interface OrderBook {
  bids: any[];
  asks: any[];
}

async function fetchOrderBook(
  chain: string,
  base: string,
  quote: string,
  limit: number = 50,
  specificNode?: string | null
): Promise<OrderBook> {
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
  const api = await Apis.instance(
    node,
    true,
    4000,
    { enableDatabase: true },
    (error: Error) => console.log({ error })
  );
  // Note: caller that holds subscription retains; this fetch is for one-shot
  // but we do NOT close if caller indicates retain. For direct fetch we close via release().
  try {
    const result = await api.db_api().exec("get_order_book", [base, quote, limit]);
    return result as OrderBook;
  } finally {
    // release one ref; if subscription also holds, socket stays alive
    try {
      await api.close();
    } catch {}
  }
}

/**
 * Subscribe to market order book live updates.
 * Uses `subscribe_to_market` (ChainWebSocket.ts:169) which registers callback in subs map.
 * Batches rapid notices at 500ms (bitshares-ui parity) then refetches order book.
 *
 * @returns unsubscribe function
 */
export async function subscribeMarketOrderBook(
  chain: string,
  baseId: string,
  quoteId: string,
  onUpdate: (book: OrderBook) => void,
  onError: (e: any) => void,
  limit: number = 50,
  specificNode?: string | null
): Promise<() => Promise<void>> {
  const node = specificNode ? specificNode : (chains as any)[chain].nodeList[0].url;
  const api = await Apis.instance(
    node,
    true,
    4000,
    { enableDatabase: true },
    (error: Error) => console.log({ error })
  );
  // retain already bumped by instance(); keep it for subscription lifetime
  // Do NOT call close() here.

  let pending = false;
  let batchTimer: any = null;
  let unsubscribed = false;

  const flush = async () => {
    if (unsubscribed) return;
    pending = false;
    batchTimer = null;
    try {
      const book = await api.db_api().exec("get_order_book", [baseId, quoteId, limit]);
      if (!unsubscribed && book) onUpdate(book as OrderBook);
    } catch (e) {
      console.log("DexLiveOrderBook flush error", e);
      onError(e);
    }
  };

  const marketCallback = (_subResult: any) => {
    // bitshares-ui checks marketId !== currentMarket to ignore stale; we only have one market per subscription
    if (unsubscribed) return;
    if (pending) return; // already scheduled, will include this notice in batch
    pending = true;
    batchTimer = setTimeout(flush, SUB_BATCH_TIME);
  };

  // initial fetch first, then subscribe
  try {
    const initial = await api.db_api().exec("get_order_book", [baseId, quoteId, limit]);
    if (initial) onUpdate(initial as OrderBook);
  } catch (e) {
    console.log("DexLiveOrderBook initial fetch error", e);
    onError(e);
    // still try to subscribe
  }

  try {
    await api.db_api().exec("subscribe_to_market", [marketCallback, baseId, quoteId]);
  } catch (e) {
    console.log("subscribe_to_market failed", e);
    onError(e);
    // release the retain since subscription failed
    try { await api.close(); } catch {}
    throw e;
  }

  const unsubscribe = async () => {
    unsubscribed = true;
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    try {
      await api.db_api().exec("unsubscribe_from_market", [marketCallback, baseId, quoteId]);
    } catch (e) {
      console.log("unsubscribe_from_market error", e);
    } finally {
      try { await api.close(); } catch {}
    }
  };

  return unsubscribe;
}

export { fetchOrderBook };
