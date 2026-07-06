import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function GlobalSettlementCard({
  settlementFund,
  parsedCollateralAsset,
  parsedAsset,
  finalAsset,
  currentFeedSettlementPrice,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  if (!settlementFund || !settlementFund.finalSettlementFund || settlementFund.finalSettlementFund <= 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 mt-2 mb-2">
      <Card className="relative overflow-hidden rounded-xl border border-red-500/15 bg-card/60 shadow-lg shadow-red-950/10">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-red-500/8 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-amber-500/8 blur-3xl" />
        <CardContent className="relative p-5">
          <CardHeader className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/30 bg-gradient-to-br from-red-500/20 to-amber-500/20 dark:text-red-200 text-red-700 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:settlementFundTitle", {
                  symbol: finalAsset.symbol,
                })}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:settlementFundDescription")}
                <br />
                {t("Smartcoin:borrowingUnavailable")}
              </CardDescription>
            </div>
          </CardHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fund")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-red-100/90 text-red-700 font-semibold">
                {settlementFund.finalSettlementFund} {parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:settlementPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-red-100/90 text-red-700 font-semibold">
                {settlementFund.finalSettlementPrice} {parsedAsset.s}/{parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:currentPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-red-100/90 text-red-700 font-semibold">
                {(1 / currentFeedSettlementPrice).toFixed(parsedAsset.p)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fundingRatio")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-red-100/90 text-red-700 font-semibold">
                {(
                  (1 /
                    currentFeedSettlementPrice /
                    settlementFund.finalSettlementPrice) *
                  100
                ).toFixed(2)}%
                <span className="text-red-500 dark:text-red-400 text-xs ml-1">
                  (-{(100 - (1 / currentFeedSettlementPrice / settlementFund.finalSettlementPrice) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <a href={`/settlement/index.html?id=${finalAsset.id}`}>
            <Button className="bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-[0_4px_14px_-4px_rgba(239,68,68,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(239,68,68,0.6)] hover:from-red-600 hover:to-amber-600 transition-all">
              {t("Smartcoin:bidOnSettlementFund", {
                symbol: finalAsset.symbol,
              })}
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

export function IndividualSettlementCard({
  individualSettlementFund,
  individualSettlementPrice,
  parsedCollateralAsset,
  parsedAsset,
  finalAsset,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  if (!individualSettlementFund || !individualSettlementFund._debt) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 mt-2 mb-2">
      <Card className="relative overflow-hidden rounded-xl border border-amber-500/15 bg-card/60 shadow-lg shadow-amber-950/10">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-amber-500/8 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-orange-500/8 blur-3xl" />
        <CardContent className="relative p-5">
          <CardHeader className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:text-amber-200 text-amber-700 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:individualSettlementFund", {
                  symbol: finalAsset.symbol,
                })}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:individualSettlementFundDescription")}
                <br />
                {t("Smartcoin:fundsCanBeBidOn")}
              </CardDescription>
            </div>
          </CardHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fund")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-amber-100/90 text-amber-700 font-semibold">
                {individualSettlementFund._fund} {parsedCollateralAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:debt2")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-amber-100/90 text-amber-700 font-semibold">
                {individualSettlementFund._debt} {parsedAsset.s}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:feedPrice")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-amber-100/90 text-amber-700 font-semibold">
                {individualSettlementPrice.toFixed(parsedAsset.p)}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:fundingRatio")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-amber-100/90 text-amber-700 font-semibold">
                {(
                  ((individualSettlementFund._debt *
                    individualSettlementPrice) /
                    individualSettlementFund._fund) *
                  100
                ).toFixed(2)}%
                <span className="text-red-500 dark:text-red-400 text-xs ml-1">
                  (-{(100 - ((individualSettlementFund._debt * individualSettlementPrice) / individualSettlementFund._fund) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <a href={`/settlement/index.html?id=${finalAsset.id}`}>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_14px_-4px_rgba(245,158,11,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(245,158,11,0.6)] hover:from-amber-600 hover:to-orange-600 transition-all">
              {t("Smartcoin:bidOnSettlementFund", {
                symbol: finalAsset.symbol,
              })}
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
