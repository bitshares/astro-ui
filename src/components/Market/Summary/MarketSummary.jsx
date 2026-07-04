import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimeSince, trimPrice } from "@/lib/common";
import { cn } from "@/lib/utils";

export default function MarketSummary(properties) {
  const { type, publicMarketHistory, assetAData, assetBData } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const isBuy = type === "buy";
  const accent = isBuy ? "text-emerald-300" : "text-rose-300";

  const filteredMarketHistory = useMemo(() => {
    return publicMarketHistory.filter((x) => x.type === type);
  }, [publicMarketHistory, type]);

  const marketHistoryElements = useMemo(() => {
    return filteredMarketHistory.map((res, index) => {
      const splitValue = res.price.split(".");
      const parsedValue =
        assetAData && assetBData && splitValue.length > 1
          ? trimPrice(
              res.price,
              isBuy ? assetAData.precision : assetBData.precision
            )
          : res.price;

      return (
        <div
          className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-mono tabular-nums border-b border-border/40 hover:bg-accent/30 transition-colors"
          key={`ms_${index}_${type}`}
        >
          <div className={cn("text-right font-semibold", accent)}>
            {parsedValue}
          </div>
          <div className="text-right text-foreground/80">
            {parseFloat(res.amount).toFixed(assetAData.precision)}
          </div>
          <div className="text-right text-muted-foreground">
            {getTimeSince(res.date)}
          </div>
          <div className="text-right text-muted-foreground">{res.value}</div>
        </div>
      );
    });
  }, [filteredMarketHistory, assetAData, assetBData, isBuy, accent, type]);

  if (!marketHistoryElements.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-accent/20 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-border/60 bg-accent/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="text-right">
          Price <span className="text-muted-foreground/60">({assetAData.symbol}/{assetBData.symbol})</span>
        </div>
        <div className="text-right">
          Amount <span className="text-muted-foreground/60">({assetAData.symbol})</span>
        </div>
        <div className="text-right">Date</div>
        <div className="text-right">
          Total <span className="text-muted-foreground/60">({assetBData.symbol})</span>
        </div>
      </div>
      <ScrollArea className="h-72 w-full">
        <div className="flex flex-col">{marketHistoryElements}</div>
      </ScrollArea>
    </div>
  );
}
