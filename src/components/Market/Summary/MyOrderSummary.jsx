import React, { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { ScrollArea } from "@/components/ui/scroll-area";
import { humanReadableFloat, isInvertedMarket } from "@/lib/common";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { $currentUser } from "@/stores/users.ts";
import { cn } from "@/lib/utils";

export default function MyOrderSummary(properties) {
  const { type, assetAData, assetBData, usrLimitOrders } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const isBuy = type === "buy";
  const accent = isBuy ? "text-emerald-300" : "text-rose-300";

  const filteredUsrLimitOrders = useMemo(
    () =>
      usrLimitOrders
        .filter((x) =>
          type === "buy"
            ? x.sell_price.base.asset_id === assetAData.id
            : x.sell_price.base.asset_id === assetBData.id
        )
        .map((res) => {
          const basePrecision = [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.base.asset_id
          ).precision;

          const quotePrecision = [assetAData, assetBData].find(
            (x) => x.id === res.sell_price.quote.asset_id
          ).precision;

          const isInverted = isInvertedMarket(
            res.sell_price.base.asset_id,
            res.sell_price.quote.asset_id
          );

          let parsedBaseAmount = humanReadableFloat(
            res.sell_price.base.amount,
            basePrecision
          );
          let parsedQuoteAmount = humanReadableFloat(
            res.sell_price.quote.amount,
            quotePrecision
          );

          let price = parseFloat(
            !isInverted
              ? parsedBaseAmount * parsedQuoteAmount
              : parsedBaseAmount / parsedQuoteAmount
          );

          let receiving = 0;
          let paying = 0;
          const _paying = humanReadableFloat(res.for_sale, basePrecision);

          if (type === "buy" && !isInverted) {
            paying = (price * _paying).toFixed(quotePrecision);
            receiving = _paying.toFixed(basePrecision);
          } else if (type === "buy" && isInverted) {
            receiving = (price * _paying).toFixed(basePrecision);
            paying = _paying.toFixed(quotePrecision);
          } else if (type === "sell" && !isInverted) {
            receiving = _paying.toFixed(quotePrecision);
            paying = (price * _paying).toFixed(basePrecision);
          } else if (type === "sell" && isInverted) {
            receiving = (_paying / price).toFixed(quotePrecision);
            paying = _paying.toFixed(basePrecision);
          }

          return {
            ...res,
            price,
            paying,
            receiving,
            basePrecision,
            quotePrecision,
          };
        })
        .sort((a, b) => {
          return a.price - b.price;
        }),
    [usrLimitOrders, type, assetAData, assetBData]
  );

  const orderElements = useMemo(
    () =>
      filteredUsrLimitOrders.map((res, index) => {
        const minBaseAmount = humanReadableFloat(1, res.basePrecision);
        const minQuoteAmount = humanReadableFloat(1, res.quotePrecision);

        return (
          <Dialog key={`${type}Dialog${index}`}>
            <DialogTrigger asChild>
              <div
                className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-mono tabular-nums border-b border-border/40 hover:bg-accent/30 transition-colors"
                key={`mos_${index}_${type}`}
              >
                <div className={cn("text-right font-semibold", accent)}>
                  {type === "buy" && res.price < minQuoteAmount ? (
                    <HoverCard
                      key={`hover_less_than_min_${res.id.replace("1.7.", "")}`}
                    >
                      <HoverCardTrigger>{`< ${minQuoteAmount}`}</HoverCardTrigger>
                      <HoverCardContent className={`w-${res.quotePrecision * 5}`}>
                        {res.price}
                      </HoverCardContent>
                    </HoverCard>
                  ) : null}
                  {type === "sell" && res.price < minBaseAmount ? (
                    <HoverCard
                      key={`hover_less_than_min_${res.id.replace("1.7.", "")}`}
                    >
                      <HoverCardTrigger>{`< ${minBaseAmount}`}</HoverCardTrigger>
                      <HoverCardContent className={`w-${res.basePrecision * 5}`}>
                        {res.price}
                      </HoverCardContent>
                    </HoverCard>
                  ) : null}
                  {type === "buy" && res.price >= minQuoteAmount
                    ? res.price.toFixed(res.quotePrecision)
                    : null}
                  {type === "sell" && res.price >= minBaseAmount
                    ? res.price.toFixed(res.basePrecision)
                    : null}
                </div>

                <div className="text-right text-foreground/80">{res.receiving}</div>
                <div className="text-right text-foreground/80">{res.paying}</div>
                <div className="text-right text-muted-foreground">{res.expiration.replace("T", " ")}</div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card">
              <DialogHeader>
                <DialogTitle>
                  {t("MyOrderSummary:editLimitOrderTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("MyOrderSummary:editLimitOrderDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  {t("MyOrderSummary:selectedOpenOrderData")}
                  <ScrollArea className="h-72 rounded-md border text-sm">
                    <pre>{JSON.stringify(res, null, 2)}</pre>
                  </ScrollArea>
                </div>
                <div className="col-span-1 text-left mt-5">
                  <a href={`/order/index.html?id=${res.id}`}>
                    <Button variant="outline" className="mt-2 mr-2">
                      {t("MyOrderSummary:proceedToUpdateButton")}
                    </Button>
                  </a>
                  {t("MyOrderSummary:viewObjectOnbitshares")}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      }),
    [filteredUsrLimitOrders, assetAData, assetBData, type]
  );

  if (!orderElements.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-accent/20 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-border/60 bg-accent/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="text-right">Price <span className="text-muted-foreground/60">({assetAData.symbol}/{assetBData.symbol})</span></div>
        <div className="text-right">Amount <span className="text-muted-foreground/60">({assetAData.symbol})</span></div>
        <div className="text-right">Amount <span className="text-muted-foreground/60">({assetBData.symbol})</span></div>
        <div className="text-right">Expiration</div>
      </div>
      <ScrollArea className="h-72 w-full">
        <div className="flex flex-col">{orderElements}</div>
      </ScrollArea>
    </div>
  );
}
