import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { TrendingUp, ArrowUpRight } from "lucide-react";

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

import btsAllAssets from "@/data/bitshares/allAssets.json";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createTopActiveMarketsStore } from "@/nanoeffects/TopActiveMarkets.ts";

export default function BlockchainTopMarkets() {
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
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openMarket = (m) => {
    setSelected(m);
    setDialogOpen(true);
  };

  // Asset id -> symbol lookup (mainnet catalog only).
  const assetSymbolById = useMemo(() => {
    const map = new Map();
    for (const a of btsAllAssets || []) {
      if (a && a.id && a.symbol) map.set(a.id, a.symbol);
    }
    return map;
  }, []);

  useEffect(() => {
    if (isTestnet) return;
    const store = createTopActiveMarketsStore([20, 30]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      setLoading(Boolean(loading));
      if (data && !error && !loading) {
        setMarkets(
          (data || []).map((m) => ({
            base: m.base,
            quote: m.quote,
            baseSymbol: assetSymbolById.get(m.base) ?? m.base,
            quoteSymbol: assetSymbolById.get(m.quote) ?? m.quote,
            count: m.count,
          }))
        );
      } else if (!loading && error) {
        setMarkets([]);
      }
    });
    return () => unsub();
  }, [isTestnet, assetSymbolById, refreshCounter]);

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
                <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("Home:top_markets.title")}
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
                <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Home:top_markets.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Home:top_markets.subtitle")}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-4">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : markets && markets.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">
                        {t("PoolTracker:rank", "Rank")}
                      </TableHead>
                      <TableHead>
                        {t("Market:market", "Market")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("Home:top_markets.fills", "Fill orders")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markets.map((m, i) => (
                      <TableRow
                        key={`${m.base}-${m.quote}`}
                        className="cursor-pointer"
                        onClick={() => openMarket(m)}
                      >
                        <TableCell className="font-mono">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {m.baseSymbol}
                          <span className="text-muted-foreground"> / </span>
                          {m.quoteSymbol}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.count.toLocaleString()}
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
                  ? `${selected.baseSymbol} / ${selected.quoteSymbol}`
                  : ""}
              </DialogTitle>
            </div>
            <DialogDescription>
              {t("Home:top_markets.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {selected && (
              <>
                <Button
                  onClick={() => {
                    window.location.href = `/dex/index.html?market=${selected.baseSymbol}_${selected.quoteSymbol}`;
                  }}
                  className="w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
                >
                  {t("Home:top_markets.openDex")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/instant_trade/index.html?market=${selected.baseSymbol}_${selected.quoteSymbol}`;
                  }}
                  className="w-full border-[hsl(var(--accent-1)/0.30)] hover:bg-[hsl(var(--accent-1)/0.10)] hover:border-[hsl(var(--accent-1)/0.5)] text-foreground"
                >
                  {t("Home:top_markets.openInstant")}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
