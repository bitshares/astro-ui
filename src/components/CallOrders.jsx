import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  memo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ArrowLeftRight,
  ChevronRight,
  Coins,
  ListOrdered,
  Loader2Icon,
  RefreshCw,
  Zap,
} from "lucide-react";

import { List } from "react-window";

import { createUserCallOrdersStore } from "@/nanoeffects/UserCallOrders.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

/**
 * Derive the current settlement price in "debt per collateral" units from a
 * bitasset feed settlement_price, matching the orientation of the position.
 *
 * @param {object} settlementPrice  Feed settlement price `{ base, quote }`.
 * @param {string} collateralAssetId  Asset id of the collateral leg.
 * @param {string} debtAssetId  Asset id of the debt leg.
 * @returns {number}  Debt per one unit of collateral (0 if unknown).
 */
/**
 * Coerce a chain amount (either a raw number or `{ amount, asset_id }`) to a
 * JavaScript number.
 */
function toRaw(amount) {
  if (amount && typeof amount === "object" && amount.amount != null) {
    return Number(amount.amount);
  }
  return Number(amount) || 0;
}

function settlementPriceInDebtPerCollateral(
  settlementPrice,
  collateralAssetId,
  debtAssetId,
  collateralPrecision,
  debtPrecision
) {
  if (!settlementPrice || !settlementPrice.base || !settlementPrice.quote) {
    return 0;
  }
  const { base, quote } = settlementPrice;
  const baseAmt = Number(base.amount);
  const quoteAmt = Number(quote.amount);
  if (!baseAmt || !quoteAmt) return 0;

  // The smartcoin page scales each leg by its own precision before dividing
  // (see `currentFeedSettlementPrice` in Smartcoin.jsx). Omitting this scaling
  // is what previously produced ratios in the billions.
  if (base.asset_id === debtAssetId && quote.asset_id === collateralAssetId) {
    // base = debt leg, quote = collateral leg
    return (
      humanReadableFloat(quoteAmt, collateralPrecision) /
      humanReadableFloat(baseAmt, debtPrecision)
    );
  }
  if (base.asset_id === collateralAssetId && quote.asset_id === debtAssetId) {
    // inverted: base = collateral leg, quote = debt leg
    return (
      humanReadableFloat(baseAmt, debtPrecision) /
      humanReadableFloat(quoteAmt, collateralPrecision)
    );
  }
  // Fallback: assume base = debt leg, quote = collateral leg
  return (
    humanReadableFloat(quoteAmt, collateralPrecision) /
    humanReadableFloat(baseAmt, debtPrecision)
  );
}

/**
 * Resolve the current collateral ratio of a margin position.
 *
 * Mirrors the formula used in `UsrMarginPositionCard`: cr = 1 / ((price *
 * debtAmount) / collateralAmount), where `price` is debt per collateral and
 * the amounts are human-readable.
 *
 * @returns {number}  Current collateral ratio (e.g. 2.45 = 245%).
 */
function currentCollateralRatio(
  collateral,
  collateralPrecision,
  debt,
  debtPrecision,
  settlementPrice
) {
  if (!settlementPrice) return 0;
  const collateralAmount = Number(
    humanReadableFloat(collateral, collateralPrecision)
  );
  const debtAmount = Number(humanReadableFloat(debt, debtPrecision));
  if (!collateralAmount || !debtAmount) return 0;
  return 1 / ((settlementPrice * debtAmount) / collateralAmount);
}

const CallOrderRow = memo(function CallOrderRow({
  index,
  style,
  callOrders,
  enriched,
  t,
  onSelect,
}) {
  const position = callOrders?.[index];
  if (!position) return null;
  const info = enriched?.[position.id];
  if (!info) return null;

  const {
    symbol,
    debtAssetId,
    collateralSymbol,
    collateralAmount,
    debtAmount,
    ratio,
    mcr,
    health,
  } = info;

  const healthColor =
    health === "danger"
      ? "text-[hsl(var(--accent-danger-fg))]"
      : health === "warn"
      ? "text-[hsl(var(--accent-warning-fg))]"
      : "text-[hsl(var(--accent-success-fg))]";

  return (
    <div style={{ ...style, paddingRight: "10px", paddingBottom: "4px" }}>
      <button
        type="button"
        onClick={() => onSelect(position)}
        className="group w-full text-left bg-card/60 border border-border hover:bg-[hsl(var(--accent-1)/0.03)] hover:border-[hsl(var(--accent-1)/0.2)] transition-all rounded-xl border-l-2 border-l-cyan-500/30"
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Leftmost 50%: asset identity */}
            <div className="flex items-center gap-3 min-w-0" style={{ flex: "0 0 50%" }}>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <Coins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-foreground truncate">
                  {symbol}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {debtAssetId}
                </div>
              </div>
            </div>

            {/* Remaining 50% split between extra columns, left-aligned */}
            <div className="flex items-center gap-2 text-left" style={{ flex: "1 1 50%" }}>
              <div className="min-w-0 text-left" style={{ flex: "1 1 0" }}>
                <div className="text-sm font-semibold text-foreground">
                  {collateralAmount}{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {collateralSymbol}
                  </span>
                </div>
              </div>
              <div className="min-w-0 text-left" style={{ flex: "1 1 0" }}>
                <div className="text-sm font-semibold text-[hsl(var(--accent-danger-fg))]">
                  {debtAmount}{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {symbol}
                  </span>
                </div>
              </div>
              <div className="min-w-0 text-left" style={{ flex: "1 1 0" }}>
                <div className={cn("text-sm font-semibold tabular-nums", healthColor)}>
                  {ratio.toFixed(3)}
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    / {mcr.toFixed(3)}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(var(--accent-1-fg))] transition-colors flex-shrink-0" />
            </div>
          </div>
        </CardContent>
      </button>
    </div>
  );
});

export default function CallOrders({
  _assetsBTS,
  _assetsTEST,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  useStore($currentNode);

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) return [];
    if (_chain !== "bitshares") return _assetsTEST;
    return _assetsBTS;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  const assetMap = useMemo(() => {
    const map = {};
    for (const a of assets || []) {
      if (a && a.id) map[a.id] = a;
    }
    return map;
  }, [assets]);

  // Fetched (network) state must be declared before the memos that read it
  // (avoids a temporal dead zone at render time).
  const [fetchedAssets, setFetchedAssets] = useState({});
  const [fetchedBitassets, setFetchedBitassets] = useState([]);

  const bitAssetMap = useMemo(() => {
    const map = {};
    for (const b of fetchedBitassets || []) {
      if (b && b.asset_id) map[b.asset_id] = b;
    }
    return map;
  }, [fetchedBitassets]);

  // State must be declared before the memos that read it (avoids TDZ).
  const [callOrderCounter, setCallOrderCounter] = useState(0);
  const [callOrders, setCallOrders] = useState();
  const [callOrdersLoading, setCallOrdersLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rowHeight, setRowHeight] = useState(72);

  const fullAssetMap = useMemo(
    () => ({ ...assetMap, ...fetchedAssets }),
    [assetMap, fetchedAssets]
  );

  // Assets / bitassets not present in the cached collection are fetched from
  // the network via the existing object store nanoeffect.
  const missingAssetIds = useMemo(() => {
    const ids = new Set();
    for (const o of callOrders || []) {
      if (o.debt_asset && !assetMap[o.debt_asset]) ids.add(o.debt_asset);
      if (o.collateral_asset && !assetMap[o.collateral_asset]) {
        ids.add(o.collateral_asset);
      }
    }
    return [...ids];
  }, [callOrders, assetMap]);

  // Resolve the bitasset_data ids for every debt asset (these hold the feed
  // settlement price and the MCR used to compute the collateral ratio).
  const missingBitassetIds = useMemo(() => {
    const ids = new Set();
    for (const o of callOrders || []) {
      const debtAsset = fullAssetMap?.[o.debt_asset];
      const bitassetId = debtAsset?.bitasset_data_id;
      if (bitassetId && !bitAssetMap[o.debt_asset]) ids.add(bitassetId);
    }
    return [...ids];
  }, [callOrders, fullAssetMap, bitAssetMap]);

  useEffect(() => {
    if (!missingAssetIds.length) return;
    let cancelled = false;
    const store = createObjectStore([
      _chain,
      JSON.stringify(missingAssetIds),
    ]);
    const unsub = store.subscribe(({ data, error }) => {
      if (cancelled) return;
      if (data && !error) {
        const next = {};
        for (const a of data) {
          if (a && a.id) next[a.id] = a;
        }
        setFetchedAssets((prev) => ({ ...prev, ...next }));
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [missingAssetIds, _chain]);

  useEffect(() => {
    if (!missingBitassetIds.length) return;
    let cancelled = false;
    const store = createObjectStore([
      _chain,
      JSON.stringify(missingBitassetIds),
    ]);
    const unsub = store.subscribe(({ data, error }) => {
      if (cancelled) return;
      if (data && !error) {
        setFetchedBitassets((prev) => {
          const existing = new Map(prev.map((b) => [b.asset_id, b]));
          for (const b of data) {
            if (b && b.asset_id) existing.set(b.asset_id, b);
          }
          return [...existing.values()];
        });
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [missingBitassetIds, _chain]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setRowHeight(window.innerWidth < 768 ? 96 : 72);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (usr && usr.id) {
      const store = createUserCallOrdersStore([_chain, usr.id]);
      const unsub = store.subscribe(({ data, error, loading }) => {
        setCallOrdersLoading(Boolean(loading));
        if (data && !error && !loading) {
          setCallOrders(data);
        }
        if (!data && !loading && error) {
          setCallOrders([]);
        }
      });
      return unsub;
    }
  }, [usr, callOrderCounter]);

  const sortedCallOrders = useMemo(() => {
    if (!callOrders || !callOrders.length) return callOrders;
    return [...callOrders].sort((a, b) =>
      a.debt_asset < b.debt_asset ? -1 : a.debt_asset > b.debt_asset ? 1 : 0
    );
  }, [callOrders]);

  const hasOrders = sortedCallOrders && sortedCallOrders.length > 0;

  // Enrich each position with formatted amounts, current CR and MCR.
  const enriched = useMemo(() => {
    const map = {};
    for (const o of sortedCallOrders || []) {
      const debtAsset = fullAssetMap[o.debt_asset];
      const collateralAsset = fullAssetMap[o.collateral_asset];
      const debtPrecision = debtAsset?.precision ?? 0;
      const collateralPrecision = collateralAsset?.precision ?? 0;

      const bitasset = bitAssetMap[o.debt_asset];
      const settlementPrice = settlementPriceInDebtPerCollateral(
        bitasset?.current_feed?.settlement_price,
        o.collateral_asset,
        o.debt_asset,
        collateralPrecision,
        debtPrecision
      );
      const mcrRaw = bitasset?.current_feed?.maintenance_collateral_ratio;
      const mcr = mcrRaw ? Number(mcrRaw) / 10 : 0;

  const ratio = currentCollateralRatio(
    toRaw(o.collateral),
    collateralPrecision,
    toRaw(o.debt),
    debtPrecision,
    settlementPrice
  );

      const health =
        !ratio || !mcr
          ? "ok"
          : ratio < mcr
          ? "danger"
          : ratio < mcr * 1.2
          ? "warn"
          : "ok";

      map[o.id] = {
        symbol: debtAsset?.symbol ?? o.debt_asset,
        debtAssetId: o.debt_asset,
        collateralSymbol: collateralAsset?.symbol ?? o.collateral_asset,
        collateralAmount: humanReadableFloat(toRaw(o.collateral), collateralPrecision),
        debtAmount: humanReadableFloat(toRaw(o.debt), debtPrecision),
        ratio,
        mcr,
        health,
      };
    }
    return map;
  }, [sortedCallOrders, fullAssetMap, bitAssetMap]);

  const selectedInfo = selected ? enriched?.[selected.id] : null;
  const selectedDebtAsset = selected ? fullAssetMap[selected.debt_asset] : null;
  const selectedCollateralAsset = selected
    ? fullAssetMap[selected.collateral_asset]
    : null;
  const selectedPrecision = selectedDebtAsset?.precision ?? 0;
  const selectedCollateralPrecision = selectedCollateralAsset?.precision ?? 0;
  const selectedSymbol = selectedInfo?.symbol ?? selected?.debt_asset ?? "";
  const selectedCollateralSymbol =
    selectedInfo?.collateralSymbol ?? selected?.collateral_asset ?? "";

  const dexHref = selected
    ? `/dex/index.html?market=${selectedCollateralSymbol}_${selectedSymbol}`
    : "/dex/index.html";
  const instantTradeHref = selected
    ? `/instant_trade/index.html?market=${selectedSymbol}_${selectedCollateralSymbol}`
    : "/instant_trade/index.html";
  const smartcoinHref = selected
    ? `/smartcoin/index.html?id=${selected.debt_asset}`
    : "/smartcoins/index.html";

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-5xl text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))]" />
          <CardTitle className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <ListOrdered className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
              </span>
              <div className="min-w-0">
                <span className="text-xl font-bold tracking-tight">
                  {t("CallOrders:title")}
                </span>
                <div className="text-xs text-muted-foreground truncate">
                  {t("CallOrders:description")}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setCallOrders(undefined);
                setCallOrdersLoading(true);
                if (usr && usr.id) {
                  const store = createUserCallOrdersStore([_chain, usr.id]);
                  store.invalidate();
                }
                setCallOrderCounter((c) => c + 1);
              }}
              disabled={callOrdersLoading}
              aria-busy={callOrdersLoading}
              className="gap-2 bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-foreground"
            >
              {callOrdersLoading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{t("CallOrders:refreshButton")}</span>
            </Button>
          </CardTitle>
        </Card>

        {hasOrders ? (
          <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
            <CardContent>
              {/* Column headers above the list to save row vertical space */}
              <div className="flex items-center gap-3 px-3 pb-2 mb-1 border-b border-border/60">
                <div
                  className="text-[10px] uppercase tracking-wide text-muted-foreground"
                  style={{ flex: "0 0 50%" }}
                >
                  {t("CallOrders:assetHeader")}
                </div>
                <div className="flex items-center gap-2 text-left" style={{ flex: "1 1 50%" }}>
                  <div
                    className="text-[10px] uppercase tracking-wide text-muted-foreground"
                    style={{ flex: "1 1 0" }}
                  >
                    {t("CallOrders:collateralHeader")}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wide text-muted-foreground"
                    style={{ flex: "1 1 0" }}
                  >
                    {t("CallOrders:debtHeader")}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wide text-muted-foreground"
                    style={{ flex: "1 1 0" }}
                  >
                    {t("CallOrders:ratioHeader")}
                  </div>
                  <div className="w-4 flex-shrink-0" />
                </div>
              </div>
              <div className="max-h-[600px] overflow-auto -mx-2 pt-2">
                <List
                  rowComponent={CallOrderRow}
                  rowCount={sortedCallOrders.length}
                  rowHeight={rowHeight}
                  rowProps={{
                    callOrders: sortedCallOrders,
                    enriched,
                    t,
                    onSelect: setSelected,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ) : callOrdersLoading ? (
          <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
            <CardContent>
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-accent/20"
                  >
                    <Skeleton className="h-8 w-8 rounded-lg bg-accent/50" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40 bg-accent/50" />
                      <Skeleton className="h-3 w-24 bg-accent/50" />
                    </div>
                    <Skeleton className="h-4 w-20 bg-accent/50" />
                    <Skeleton className="h-4 w-20 bg-accent/50" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
            <CardContent>
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <ListOrdered className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">
                    {t("CallOrders:noOrdersTitle")}
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("CallOrders:noOrdersDescription")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild className="bg-[hsl(var(--accent-1))] hover:bg-[hsl(var(--accent-1))] text-foreground">
                    <a href="/dex/index.html">{t("CallOrders:noOrdersCta")}</a>
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>

      {selected && selectedInfo ? (
        <Dialog
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="sm:max-w-[500px] bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                {t("CallOrders:dialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("CallOrders:dialogDescription", {
                  symbol: selectedSymbol,
                  assetId: selected.debt_asset,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-accent/20 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("CallOrders:dialogCollateral")}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {humanReadableFloat(toRaw(selected.collateral), selectedCollateralPrecision)}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {selectedCollateralSymbol}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-accent/20 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("CallOrders:dialogDebt")}
                </div>
                <div className="text-sm font-semibold text-[hsl(var(--accent-danger-fg))]">
                  {humanReadableFloat(toRaw(selected.debt), selectedPrecision)}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {selectedSymbol}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-accent/20 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("CallOrders:dialogCollateralRatio")}
                </div>
                <div className={cn(
                  "text-sm font-semibold tabular-nums",
                  selectedInfo.health === "danger"
                    ? "text-[hsl(var(--accent-danger-fg))]"
                    : selectedInfo.health === "warn"
                    ? "text-[hsl(var(--accent-warning-fg))]"
                    : "text-[hsl(var(--accent-success-fg))]"
                )}>
                  {selectedInfo.ratio.toFixed(3)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">
                    / {selectedInfo.mcr.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-2">
              <a
                href={dexHref}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 transition-colors p-3"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                    <ListOrdered className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground">
                      {t("CallOrders:openDex")}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t("CallOrders:openDexDescription")}
                    </div>
                  </div>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href={instantTradeHref}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 transition-colors p-3"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-2)/0.15)] flex-shrink-0">
                    <Zap className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
                  </span>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground">
                      {t("CallOrders:openInstantTrade")}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t("CallOrders:openInstantTradeDescription")}
                    </div>
                  </div>
                </div>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href={smartcoinHref}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/20 hover:bg-accent/40 transition-colors p-3"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                    <Coins className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-foreground">
                      {t("CallOrders:openSmartcoin")}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t("CallOrders:openSmartcoinDescription")}
                    </div>
                  </div>
                </div>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
