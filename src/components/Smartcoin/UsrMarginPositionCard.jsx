import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Wallet, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

import DeepLinkDialog from "@/components/common/DeepLinkDialog";
import { humanReadableFloat } from "@/lib/common.js";

export default function UsrMarginPositionCard({
  usrMarginPositions,
  parsedCollateralAsset,
  parsedAsset,
  currentFeedSettlementPrice,
  debtAssetHoldings,
  usr,
  exitJSON,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [showClosePositionDialog, setShowClosePositionDialog] = useState(false);

  const computed = useMemo(() => {
    if (
      !usrMarginPositions ||
      !usrMarginPositions.length ||
      !parsedAsset ||
      !parsedCollateralAsset
    )
      return null;
    const res = usrMarginPositions[0];
    const collateralAmount = humanReadableFloat(
      res.collateral,
      parsedCollateralAsset.p
    );
    const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);
    const _ratio =
      1 / ((currentFeedSettlementPrice * debtAmount) / collateralAmount);
    const ratio = parseFloat(_ratio.toFixed(3));

    const callPrice = res.target_collateral_ratio
      ? parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount *
                (currentFeedSettlementPrice *
                  (res.target_collateral_ratio / 1000))))
          ).toFixed(parsedCollateralAsset.p)
        )
      : parseFloat(
          (
            currentFeedSettlementPrice *
            (collateralAmount /
              (debtAmount * (currentFeedSettlementPrice * 1.4)))
          ).toFixed(parsedCollateralAsset.p)
        );

    return { res, collateralAmount, debtAmount, ratio, callPrice };
  }, [
    usrMarginPositions,
    parsedAsset,
    parsedCollateralAsset,
    currentFeedSettlementPrice,
  ]);

  if (!computed) return null;

  const { res, collateralAmount, debtAmount, ratio, callPrice } = computed;
  const tcr = res.target_collateral_ratio
    ? `${res.target_collateral_ratio / 10}%`
    : null;

  return (
    <div className="mt-2 relative overflow-hidden rounded-xl border border-indigo-500/15 bg-card/60 shadow-lg shadow-indigo-950/10">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/8 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="relative p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 dark:text-indigo-200 text-indigo-700 flex-shrink-0">
            <Wallet className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {t("Smartcoin:currentMarginPosition", {
                asset: parsedAsset.s,
                id: parsedAsset.id,
              })}
            </h3>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t("Smartcoin:ongoingMarginPosition")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {t("Smartcoin:balance")}
            </div>
            <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
              {debtAssetHoldings ?? 0} {parsedAsset.s}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {t("Smartcoin:debt")}
            </div>
            <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
              {humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p)} {parsedAsset.s}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {t("Smartcoin:collateralAtRisk")}
            </div>
            <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
              {humanReadableFloat(
                usrMarginPositions[0].collateral,
                parsedCollateralAsset.p
              )} {parsedCollateralAsset.s}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {t("Smartcoin:currentRatio")}
            </div>
            <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
              {ratio}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
              {t("Smartcoin:marginCallPrice")}
            </div>
            <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
              {callPrice} {parsedCollateralAsset.s}
              <span className="text-xs text-muted-foreground/60 ml-1">
                ({(1 / callPrice).toFixed(parsedAsset.p)} {parsedAsset.s}/{parsedCollateralAsset.s})
              </span>
            </div>
          </div>
          {tcr ? (
            <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                {t("Smartcoin:targetCollateralRatio")}
              </div>
              <div className="font-mono text-sm tabular-nums dark:text-indigo-100/90 text-indigo-700 font-semibold">
                {tcr}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {debtAssetHoldings >=
          humanReadableFloat(usrMarginPositions[0].debt, parsedAsset.p) ? (
            <Button
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_4px_14px_-4px_rgba(244,63,94,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(244,63,94,0.6)] hover:from-rose-600 hover:to-pink-600 transition-all"
              onClick={() => setShowClosePositionDialog(true)}
            >
              {t("Smartcoin:closePosition")}
            </Button>
          ) : null}
          <a
            href={`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${parsedAsset.s}`}
          >
            <Button className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(99,102,241,0.6)] hover:from-indigo-600 hover:to-cyan-600 transition-all">
              {t("Smartcoin:borrow", { asset: parsedAsset.s })}
            </Button>
          </a>
          <a
            href={`/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`}
          >
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] hover:from-emerald-600 hover:to-teal-600 transition-all">
              {t("Smartcoin:buyWith", {
                asset1: parsedAsset.s,
                asset2: parsedCollateralAsset.s,
              })}
            </Button>
          </a>
        </div>

        {showClosePositionDialog ? (
          <DeepLinkDialog
            operationNames={["call_order_update"]}
            username={usr.username}
            usrChain={usr.chain}
            userID={usr.id}
            dismissCallback={setShowClosePositionDialog}
            key={`Closing${parsedAsset.s}debtposition`}
            headerText={t("Smartcoin:closingDebtPosition", {
              asset: parsedAsset.s,
            })}
            trxJSON={[exitJSON]}
          />
        ) : null}
      </div>
    </div>
  );
}
