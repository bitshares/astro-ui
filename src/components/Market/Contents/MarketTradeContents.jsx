import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import MarketSummary from "../Summary/MarketSummary";
import {
  TrendingDown,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function MarketTradeContents(properties) {
  const {
    type,
    publicMarketHistory,
    marketHistoryInProgress,
    reset,
    assetAData,
    assetBData,
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
                ? t("MarketTradeContents:recentlyCompletedBuyOrdersTitle")
                : t("MarketTradeContents:recentlyCompletedSellOrdersTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground/70">
              {isBuy
                ? t("MarketTradeContents:recentlyCompletedBuyOrdersDescription")
                : t("MarketTradeContents:recentlyCompletedSellOrdersDescription")}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {marketHistoryInProgress ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
              <Skeleton className="h-8 w-full bg-muted" />
            </div>
          ) : null}
          {publicMarketHistory && publicMarketHistory.length ? (
            <MarketSummary
              type={type}
              publicMarketHistory={publicMarketHistory}
              assetAData={assetAData}
              assetBData={assetBData}
            />
          ) : !marketHistoryInProgress ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent/20">
                <Inbox className="h-5 w-5" />
              </div>
              <p className="text-xs">
                {t("MarketTradeContents:noMarketHistoryFound")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
