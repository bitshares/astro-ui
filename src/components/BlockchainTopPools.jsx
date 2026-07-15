import React, { useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Droplets, ArrowUpRight } from "lucide-react";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { $currentUser } from "@/stores/users.ts";

import btsPools from "@/data/bitshares/pools.json";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createTopPoolSwapsStore } from "@/nanoeffects/TopPoolSwaps.ts";

export default function BlockchainTopPools() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );
  const isTestnet = useMemo(
    () => Boolean(usr && usr.chain && usr.chain !== "bitshares"),
    [usr]
  );
  useInitCache(_chain ?? "bitshares", []);

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openPool = (p) => {
    setSelected(p);
    setDialogOpen(true);
  };

  // Pool id -> swappable asset symbols (mainnet catalog only).
  const poolAssetsById = useMemo(() => {
    const map = new Map();
    for (const p of btsPools || []) {
      if (p && p.id) {
        map.set(p.id, {
          assetA: p.asset_a_symbol,
          assetB: p.asset_b_symbol,
          assetAId: p.asset_a_id,
          assetBId: p.asset_b_id,
        });
      }
    }
    return map;
  }, []);

  useEffect(() => {
    if (isTestnet) return;
    const store = createTopPoolSwapsStore([20, 30]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      setLoading(Boolean(loading));
      if (data && !error && !loading) {
        setPools(
          (data || []).map((m) => {
            const assets = poolAssetsById.get(m.pool);
            return {
              id: m.pool,
              assetASymbol: assets?.assetA ?? m.pool,
              assetBSymbol: assets?.assetB ?? "",
              assetAId: assets?.assetAId,
              assetBId: assets?.assetBId,
              count: m.count,
            };
          })
        );
      } else if (!loading && error) {
        setPools([]);
      }
    });
    return () => unsub();
  }, [isTestnet, poolAssetsById, refreshCounter]);

  if (isTestnet) {
    return (
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-gradFg))]">
                <Droplets className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("Home:top_pools.title")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {t("Home:testnetUnsupported")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <div className="grid grid-cols-1 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-gradFg))]">
                <Droplets className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Home:top_pools.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Home:top_pools.subtitle")}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : pools && pools.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">
                        {t("PoolTracker:rank", "Rank")}
                      </TableHead>
                      <TableHead>{t("Home:top_pools.pool", "Pool")}</TableHead>
                      <TableHead>
                        {t("Home:top_pools.assets", "Assets")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("Home:top_pools.swaps", "Swaps")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pools.map((p, i) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => openPool(p)}
                      >
                        <TableCell className="font-mono">{i + 1}</TableCell>
                        <TableCell className="font-mono">
                          {p.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.assetASymbol}
                          {p.assetBSymbol ? (
                            <>
                              <span className="text-muted-foreground"> / </span>
                              {p.assetBSymbol}
                            </>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {p.count.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
                <p>{t("PortfolioTabs:noRecentActivityFound")}</p>
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={() => setRefreshCounter(refreshCounter + 1)}
                disabled={loading}
                aria-busy={loading}
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
              >
                {t("PortfolioTabs:refreshRecentActivityButton")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border border-[hsl(var(--accent-1)/0.30)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.6)] to-transparent"
          />
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-gradFg))]">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <DialogTitle>
                {selected
                  ? `${selected.assetASymbol} / ${selected.assetBSymbol}`
                  : ""}
              </DialogTitle>
            </div>
            <DialogDescription>
              {t("Home:top_pools.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {selected && (
              <>
                <Button
                  onClick={() => {
                    window.location.href = `/swap/index.html?pool=${selected.id}`;
                  }}
                  className="w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
                >
                  {t("Home:top_pools.openSwap")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/instant_trade/index.html?market=${selected.assetASymbol}_${selected.assetBSymbol}`;
                  }}
                  className="w-full border-[hsl(var(--accent-1)/0.30)] hover:bg-[hsl(var(--accent-1)/0.10)] hover:border-[hsl(var(--accent-1)/0.5)] text-foreground"
                >
                  {t("Home:top_pools.openInstant")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/dex/index.html?market=${selected.assetASymbol}_${selected.assetBSymbol}`;
                  }}
                  className="w-full border-[hsl(var(--accent-1)/0.30)] hover:bg-[hsl(var(--accent-1)/0.10)] hover:border-[hsl(var(--accent-1)/0.5)] text-foreground"
                >
                  {t("Home:top_pools.openDex")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/stake/index.html?pool=${selected.id}`;
                  }}
                  className="w-full border-[hsl(var(--accent-1)/0.30)] hover:bg-[hsl(var(--accent-1)/0.10)] hover:border-[hsl(var(--accent-1)/0.5)] text-foreground"
                >
                  {t("Home:top_pools.openStake")}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
