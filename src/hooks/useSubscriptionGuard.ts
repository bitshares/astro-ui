import { useEffect, useRef } from "react";
import { $connectionStatus, initConnectionStatus } from "@/stores/connection";

/**
 * Shared connection guard for all subscription hooks.
 *
 * Owns (single registration per component):
 *  - $connectionStatus watch -> onConnectionError(status)
 *  - window online/offline   -> onOnline / onOffline
 *  - visibility/pageshow/focus resume checks
 *  - staleness interval: no update for `staleMs` while subscribed
 *    => onStale() + onReconnectNeeded()
 *
 * All callbacks are optional. The guard tracks mount state internally and
 * suppresses callbacks after unmount, so hooks do not need their own
 * cancelled flags for these paths.
 */

export interface SubscriptionGuardOptions {
  lastFetchAtRef: React.MutableRefObject<number | null>;
  isSubscribedRef: React.MutableRefObject<boolean>;
  staleMs?: number;
  onStale?: () => void;
  onOnline?: () => void;
  onOffline?: () => void;
  onConnectionError?: (status: string) => void;
  onReconnectNeeded?: () => void;
}

export function useSubscriptionGuard(options: SubscriptionGuardOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const staleMs = options.staleMs ?? 10000;

  useEffect(() => {
    let mounted = true;

    initConnectionStatus();

    const unsub = $connectionStatus.subscribe((v) => {
      if (
        mounted &&
        (v === "closed" || v === "error") &&
        optionsRef.current.onConnectionError
      ) {
        optionsRef.current.onConnectionError(v as string);
      }
    });

    const onOnline = () => {
      if (mounted && optionsRef.current.onOnline) optionsRef.current.onOnline();
    };
    const onOffline = () => {
      if (mounted && optionsRef.current.onOffline)
        optionsRef.current.onOffline();
    };
    const checkStale = () => {
      if (!mounted) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      const opts = optionsRef.current;
      const last = opts.lastFetchAtRef.current;
      const stale = !last || Date.now() - last > staleMs;
      if (
        (stale || !opts.isSubscribedRef.current) &&
        (typeof navigator === "undefined" || navigator.onLine)
      ) {
        if (opts.onReconnectNeeded) opts.onReconnectNeeded();
      }
    };
    const onVisibility = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        checkStale();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pageshow", onVisibility);
      window.addEventListener("focus", onVisibility);
    }

    const staleId = setInterval(() => {
      if (!mounted) return;
      const opts = optionsRef.current;
      const last = opts.lastFetchAtRef.current;
      if (!last) return;
      if (
        Date.now() - last > staleMs &&
        opts.isSubscribedRef.current &&
        (typeof navigator === "undefined" || navigator.onLine)
      ) {
        if (opts.onStale) opts.onStale();
        if (opts.onReconnectNeeded) opts.onReconnectNeeded();
      }
    }, 2000);

    return () => {
      mounted = false;
      try {
        unsub();
      } catch {}
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pageshow", onVisibility);
        window.removeEventListener("focus", onVisibility);
      }
      clearInterval(staleId);
    };
    // staleMs is expected to be a constant per hook; register once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
