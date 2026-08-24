import { useEffect, useState, useRef } from "react";
import { subscribeMarketOrderBook } from "@/nanoeffects/DexLiveOrderBook";
import { subscribeAccountLimitOrders } from "@/nanoeffects/DexAccountOrdersLive";
import { $connectionStatus, initConnectionStatus } from "@/stores/connection";
import chain_store from "@/bts/chain/ChainStore";
import Apis from "@/bts/ws/ApiInstances";

export interface UseDexLiveOptions {
  chain: string;
  baseId: string | null;
  quoteId: string | null;
  accountId?: string | null;
  specificNode?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useDexOrderBookLive(options: UseDexLiveOptions) {
  const {
    chain,
    baseId,
    quoteId,
    accountId = null,
    specificNode,
    limit = 50,
    enabled = true,
  } = options;
  const [bids, setBids] = useState<any[] | null>(null);
  const [asks, setAsks] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("unknown");
  const [reconnectNonce, setReconnectNonce] = useState(0);
  // live market slices (ticker/trade history/balances/user limit orders)
  const [balances, setBalances] = useState<any[] | null>(null);
  const [marketHistory, setMarketHistory] = useState<any[] | null>(null);
  const [usrLimitOrders, setUsrLimitOrders] = useState<any[] | null>(null);
  const [usrTrades, setUsrTrades] = useState<any[] | null>(null);
  const [ticker, setTicker] = useState<any | null>(null);
  // false when node lacks history plugin - UI should fall back to polling path
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  const blockUnsubRef = useRef<(() => void) | null>(null);
  const failureCountRef = useRef(0);
  const lastBookRef = useRef<any>(null);
  const blockNumberRef = useRef<number | null>(null);
  const lastFetchAtRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);
  const DISCONNECT_STALE_MS = 10000; // 10s without any block/orderbook update => Disconnected (matches footer ⚠️)

  // keep refs in sync for stale checks
  useEffect(() => {
    lastFetchAtRef.current = lastFetchAt;
  }, [lastFetchAt]);
  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  const attemptReconnect = () => {
    // force WS and ChainStore to reset before re-subscribing
    try {
      // best-effort hard close old socket - next Apis.instance will create fresh one
      // Apis.destroy is async but we don't await here; effect re-run will await new instance
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Apis.destroy().catch(() => {});
      try { chain_store.clearCache(); (chain_store as any).subscribed = false; } catch {}
      blockNumberRef.current = null;
    } catch {}
    // trigger main effect to re-subscribe by bumping nonce
    setReconnectNonce((n) => n + 1);
    // also reset failure count so next errors can surface
    failureCountRef.current = 0;
  };

  // init global connection status listener once + staleness + visibility handling
  useEffect(() => {
    initConnectionStatus();
    const unsub = $connectionStatus.subscribe((v) => setConnectionStatus(v as string));
    const onOnline = () => {
      setConnectionStatus("open");
      // wifi back -> reconnect
      attemptReconnect();
    };
    const onOffline = () => {
      setConnectionStatus("closed");
      // treat offline as failure attempt
      handleFailure(new Error("offline: wifi/network lost"));
    };
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const last = lastFetchAtRef.current;
        const stale = !last || Date.now() - last > DISCONNECT_STALE_MS;
        if (stale || !isSubscribedRef.current) {
          attemptReconnect();
        }
      }
    };
    const onPageShow = () => {
      // bfcache restore / suspend resume
      const last = lastFetchAtRef.current;
      if (!last || Date.now() - last > DISCONNECT_STALE_MS || !isSubscribedRef.current) {
        attemptReconnect();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pageshow", onPageShow);
      window.addEventListener("focus", onVisibility);
    }
    // staleness interval - mark disconnected if no block/orderbook for 10s
    const staleId = setInterval(() => {
      const last = lastFetchAtRef.current;
      if (!last) return;
      if (Date.now() - last > DISCONNECT_STALE_MS && isSubscribedRef.current) {
        setIsSubscribed(false);
        handleFailure(new Error("stale: no block/orderbook for 10s"));
        // auto attempt reconnect after marking disconnected
        if (typeof navigator === "undefined" || navigator.onLine) {
          attemptReconnect();
        }
      }
    }, 2000);
    return () => {
      try { unsub(); } catch {}
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("focus", onVisibility);
      }
      clearInterval(staleId);
    };
  }, []);

  const handleFailure = (e: any) => {
    // require 3 attempts before surfacing error to dialog
    failureCountRef.current += 1;
    console.log(`useDexOrderBookLive error attempt ${failureCountRef.current}`, e);
    if (failureCountRef.current >= 3) {
      setError(e ?? new Error("connection error"));
      setIsSubscribed(false);
    } else {
      // schedule retry to reach 3 attempts when offline (no market notices)
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setTimeout(() => {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            handleFailure(new Error("offline retry " + (failureCountRef.current + 1)));
          }
        }, 800);
      } else if (failureCountRef.current === 1) {
        // for non-offline connection closed, also retry via delayed check
        setTimeout(() => {
          // trigger another attempt by trying to refetch if still not subscribed
          handleFailure(new Error("retry " + (failureCountRef.current + 1)));
        }, 900);
      }
    }
    setLoading(false);
    // if offline, keep isSubscribed false
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsSubscribed(false);
    }
  };

  useEffect(() => {
    if (!enabled || !chain || !baseId || !quoteId) {
      setBids(null);
      setAsks(null);
      setLoading(false);
      setError(null);
      setIsSubscribed(false);
      setLastFetchAt(null);
      setBlockNumber(null);
      blockNumberRef.current = null;
      lastFetchAtRef.current = null;
      failureCountRef.current = 0;
      // cleanup block sub if existed
      if (blockUnsubRef.current) {
        try { blockUnsubRef.current(); } catch {}
        blockUnsubRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    failureCountRef.current = 0;
    blockNumberRef.current = null;

    const onUpdate = (data: any) => {
      if (cancelled) return;
      const now = Date.now();
      lastBookRef.current = data;
      setBids(data.bids ?? []);
      setAsks(data.asks ?? []);
      // live market slices - each independent; history slices empty when node lacks plugin
      setBalances(data.balances ?? null);
      setMarketHistory(data.marketHistory ?? null);
      setUsrLimitOrders(data.accountLimitOrders ?? null);
      setUsrTrades(data.usrTrades ?? null);
      setTicker(data.ticker ?? null);
      if (typeof data.historyAvailable === "boolean") {
        setHistoryAvailable(data.historyAvailable);
      }
      setLastFetchAt(now);
      setLoading(false);
      setIsSubscribed(true);
      setError(null);
      failureCountRef.current = 0;
      // also reset connection status to open on successful fetch
      setConnectionStatus("open");
    };

    const onError = (e: any) => {
      if (cancelled) return;
      handleFailure(e);
    };

    subscribeMarketOrderBook(
      chain,
      baseId,
      quoteId,
      onUpdate,
      onError,
      limit,
      specificNode,
      accountId
    )
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubRef.current = unsub;
      })
      .catch((e) => {
        onError(e);
      });

    // Block number subscription in SAME effect (merged) - updates lastFetchAt on every block OR dex push
    // Use ChainStore 2.1.0 push (~3s per block) as live heartbeat instead of polling - bitshares-ui style
    const blockCallback = () => {
      if (cancelled) return;
      try {
        const obj: any = chain_store.getObject("2.1.0");
        if (obj && obj !== true) {
          const num = obj.head_block_number ?? obj.block_number ?? obj.head_block_num ?? obj.blockNumber;
          if (num && num !== blockNumberRef.current) {
            blockNumberRef.current = num;
            setBlockNumber(num);
            // Update lastFetchAt only when block actually advances OR dex data pushed (handled in onUpdate)
            const now = Date.now();
            setLastFetchAt(now);
          }
        }
      } catch {}
    };

    // Ensure ChainStore is initialized (uses same Apis singleton retained by market sub)
    // If not yet subscribed, init it; otherwise just subscribe
    try {
      if (!chain_store.subscribed) {
        chain_store.setDispatchFrequency(40);
        // Ensure Apis is connected before init (market sub already retained, but ensure)
        const ensureApis = specificNode
          ? Apis.instance(specificNode, true, 4000, { enableDatabase: true }, () => {})
          : null;
        // init will use existing Apis instance
        chain_store.init(true).then(() => {
          if (!cancelled) blockCallback();
        }).catch((e) => handleFailure(e));
      } else {
        // already subscribed, try immediate block read
        blockCallback();
      }
      chain_store.subscribe(blockCallback);
      blockUnsubRef.current = () => {
        try { chain_store.unsubscribe(blockCallback); } catch {}
      };
    } catch (e) {
      console.log("block subscription error", e);
    }

    // also watch connection status: if closed/error, count as failure (requires 3 before dialog)
    const connUnsub = $connectionStatus.subscribe((s) => {
      if ((s === "closed" || s === "error") && !cancelled) {
        handleFailure(new Error(`connection ${s}`));
      }
    });

    return () => {
      cancelled = true;
      try { connUnsub(); } catch {}
      if (blockUnsubRef.current) {
        try { blockUnsubRef.current(); } catch {}
        blockUnsubRef.current = null;
      }
      if (unsubRef.current) {
        const fn = unsubRef.current;
        unsubRef.current = null;
        fn().catch((e) => console.log("unsubscribe error", e));
      }
    };
  }, [chain, baseId, quoteId, specificNode, limit, enabled, reconnectNonce]);

  return {
    bids,
    asks,
    loading,
    error,
    isSubscribed,
    lastFetchAt,
    blockNumber,
    connectionStatus,
    balances,
    marketHistory,
    usrLimitOrders,
    usrTrades,
    ticker,
    historyAvailable,
  };
}

export function useDexAccountOrdersLive(options: UseDexLiveOptions) {
  const { chain, accountId, specificNode, enabled = true } = options;
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !chain || !accountId) {
      setOrders(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const onUpdate = (liveOrders: any[]) => {
      if (cancelled) return;
      setOrders(liveOrders);
      setLoading(false);
    };
    const onError = (e: any) => {
      if (cancelled) return;
      setError(e);
      setLoading(false);
    };

    subscribeAccountLimitOrders(chain, accountId, onUpdate, onError, specificNode)
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubRef.current = unsub;
      })
      .catch((e) => onError(e));

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        const fn = unsubRef.current;
        unsubRef.current = null;
        try { fn(); } catch (e) { console.log(e); }
      }
    };
  }, [chain, accountId, specificNode, enabled]);

  return { orders, loading, error };
}
