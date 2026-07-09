import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import MyOrderSummary from "../Summary/MyOrderSummary";

import { TrendingDown, TrendingUp, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MyOpenOrders(properties) {
  const {
    type,
    assetAData,
    assetBData,
    usrLimitOrders,
    usrHistory,
    marketHistoryInProgress,
    reset,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const isBuy = type === "buy";
  const accent = isBuy
    ? {
        text: "text-[hsl(var(--accent-success-fg))]",
        textBright: "dark:text-[hsl(var(--accent-success-fg))] text-[hsl(var(--accent-success-fg))]",
        chip: "bg-[hsl(var(--accent-success)/0.1)] border-[hsl(var(--accent-success)/0.3)] text-[hsl(var(--accent-success-fg))]",
        border: "border-[hsl(var(--accent-success)/0.3)]",
        glow: "from-[hsl(var(--accent-success)/0.15)] via-[hsl(var(--accent-success)/0.03)] to-transparent",
      }
    : {
        text: "text-[hsl(var(--accent-danger-fg))]",
        textBright: "dark:text-[hsl(var(--accent-danger-fg))] text-[hsl(var(--accent-danger-fg))]",
        chip: "bg-[hsl(var(--accent-danger)/0.1)] border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))]",
        border: "border-[hsl(var(--accent-danger)/0.3)]",
        glow: "from-[hsl(var(--accent-danger)/0.15)] via-[hsl(var(--accent-danger)/0.03)] to-transparent",
      };

  const relevantOpenOrders = useMemo(() => {
    if (usrLimitOrders && usrLimitOrders.length) {
      return isBuy
        ? usrLimitOrders.filter(
            (order) => order.sell_price.quote.asset_id === assetBData.id
          )
        : usrLimitOrders.filter(
            (order) => order.sell_price.quote.asset_id === assetAData.id
          );
    }
    return !!usrLimitOrders ? [] : null;
  }, [usrLimitOrders, isBuy, assetAData, assetBData]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-xl",
        accent.border
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b",
          accent.glow
        )}
      />
      <div className="relative">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border",
              accent.chip
            )}
          >
            {isBuy ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
          <div>
            <h3 className={cn("text-sm font-semibold", accent.textBright)}>
              {isBuy
                ? t("MyOpenOrders:openBuyOrdersTitle")
                : t("MyOpenOrders:openSellOrdersTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground/70">
              {isBuy
                ? t("MyOpenOrders:openBuyOrdersDescription", {
                    assetA: assetAData.symbol,
                    assetB: assetBData.symbol,
                  })
                : t("MyOpenOrders:openSellOrdersDescription", {
                    assetA: assetAData.symbol,
                    assetB: assetBData.symbol,
                  })}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {marketHistoryInProgress ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
            </div>
          ) : null}
          {(!relevantOpenOrders || !relevantOpenOrders.length) &&
          !marketHistoryInProgress ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent/20">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs">
                {isBuy
                  ? t("MyOpenOrders:noOpenBuyOrders")
                  : t("MyOpenOrders:noOpenSellOrders")}
              </p>
            </div>
          ) : null}
          {relevantOpenOrders && relevantOpenOrders.length ? (
            <MyOrderSummary
              type={type}
              assetAData={assetAData}
              assetBData={assetBData}
              usrLimitOrders={relevantOpenOrders}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
