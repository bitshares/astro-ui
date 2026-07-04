import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getTimeSince, humanReadableFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

export default function MyTradeSummary(properties) {
  const { type, usrHistory, assetAData, assetBData } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const isBuy = type === "buy";
  const accent = isBuy ? "text-emerald-300" : "text-rose-300";

  const filteredMarketHistory = useMemo(() => {
    if (!usrHistory) {
      return [];
    }

    const filteredUsrHistory = usrHistory.filter((x) => {
      if (type === "buy") {
        return (
          x.op[1].pays.asset_id === assetBData.id &&
          x.op[1].receives.asset_id === assetAData.id
        );
      } else {
        return (
          x.op[1].pays.asset_id === assetAData.id &&
          x.op[1].receives.asset_id === assetBData.id
        );
      }
    });

    return filteredUsrHistory.map((res) => {
      const parsedBaseAmount = humanReadableFloat(
        res.op[1].fill_price.base.amount,
        [assetAData, assetBData].find(
          (x) => x.id === res.op[1].fill_price.base.asset_id
        )?.precision
      );

      const parsedQuoteAmount = humanReadableFloat(
        res.op[1].fill_price.quote.amount,
        [assetAData, assetBData].find(
          (x) => x.id === res.op[1].receives.asset_id
        )?.precision
      );

      const calculated = (parsedQuoteAmount / parsedBaseAmount).toFixed(
        assetBData.precision
      );

      return {
        price: calculated,
        baseAmount: parsedBaseAmount,
        quoteAmount: parsedQuoteAmount,
        date: res.block_time,
        operation: res.op[1],
      };
    });
  }, [usrHistory, assetAData, assetBData, type]);

  if (!filteredMarketHistory.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-accent/20 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-border/60 bg-accent/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="text-right">Price</div>
        <div className="text-right">{type === "buy" ? assetAData.symbol : assetBData.symbol}</div>
        <div className="text-right">{type === "buy" ? assetBData.symbol : assetAData.symbol}</div>
        <div className="text-right">{t("MyTradeSummary:dateColumnTitle")}</div>
      </div>
      <ScrollArea className="h-72 w-full">
        <div className="flex flex-col">
          {filteredMarketHistory.map((res, index) => {
            return (
              <div
                key={`mts_${index}_${type}`}
                className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-mono tabular-nums border-b border-border/40 hover:bg-accent/30 transition-colors"
              >
                <div className={cn("text-right font-semibold", accent)}>{res.price}</div>
                <div className="text-right text-foreground/80">{type === "buy" ? res.baseAmount : res.quoteAmount}</div>
                <div className="text-right text-foreground/80">{type === "buy" ? res.quoteAmount : res.baseAmount}</div>
                <div className="text-right text-muted-foreground">{getTimeSince(res.date)}</div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
