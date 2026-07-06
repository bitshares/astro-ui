import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { ShieldAlert } from "lucide-react";

import { Label } from "@/components/ui/label";

export default function RisksCard() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <div className="grid grid-cols-1 mt-5">
      <div className="relative overflow-hidden rounded-xl border border-amber-500/15 bg-card/60 shadow-lg shadow-amber-950/10">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-amber-500/8 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:text-amber-200 text-amber-700 flex-shrink-0">
              <ShieldAlert className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Smartcoin:risksAssociated")}
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Smartcoin:doYourOwnResearch2")}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 mb-3">
            <div className="text-xs font-medium uppercase tracking-wider dark:text-amber-200/70 text-amber-600/80 mb-2">
              {t("Smartcoin:risksAssociatedDebtCollateral")}
            </div>
            <ul className="ml-2 list-disc [&>li]:mt-1 pl-2 text-sm">
              <li>{t("Smartcoin:riskLossCollateral")}</li>
              <li>{t("Smartcoin:riskSmartcoinValueLoss")}</li>
              <li>{t("Smartcoin:researchBeforeMarginPositions")}</li>
              <li>{t("Smartcoin:committeeOwnedBitAssets")}</li>
              <li>{t("Smartcoin:riskWithSmartcoinBacking")}</li>
              <li>{t("Smartcoin:riskWithEBA")}</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 mb-3">
            <div className="text-xs font-medium uppercase tracking-wider dark:text-amber-200/70 text-amber-600/80 mb-2">
              {t("Smartcoin:priceFeedExposure")}
            </div>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
              <li>{t("Smartcoin:riskPriceFluctuation")}</li>
              <li>{t("Smartcoin:riskReferenceAssetCease")}</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 mb-3">
            <div className="text-xs font-medium uppercase tracking-wider dark:text-amber-200/70 text-amber-600/80 mb-2">
              {t("Smartcoin:priceFeedPublisherActivity")}
            </div>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
              <li>{t("Smartcoin:riskPriceFeedInactivity")}</li>
              <li>{t("Smartcoin:riskUnstableFeedScripts")}</li>
              <li>{t("Smartcoin:riskExhaustedBalance")}</li>
              <li>{t("Smartcoin:riskPriceFeedDisagreement")}</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="text-xs font-medium uppercase tracking-wider dark:text-amber-200/70 text-amber-600/80 mb-2">
              {t("Smartcoin:exposureToEBABackAssetBlockchainDowntime")}
            </div>
            <ul className="ml-2 list-disc [&>li]:mt-2 pl-2 text-sm">
              <li>{t("Smartcoin:riskGatewayDepositServiceDown")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
