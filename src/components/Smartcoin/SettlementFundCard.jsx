import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {t("Smartcoin:settlementFundTitle", {
              symbol: finalAsset.symbol,
            })}
          </CardTitle>
          <CardDescription>
            {t("Smartcoin:settlementFundDescription")}
            <br />
            {t("Smartcoin:borrowingUnavailable")}{" "}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4">
            <div className="col-span-1">
              {t("Smartcoin:fund")}
              <br />
              <span className="text-sm">
                {settlementFund.finalSettlementFund}
                <br />
                {parsedCollateralAsset.s}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:settlementPrice")} <br />
              <span className="text-sm">
                {settlementFund.finalSettlementPrice}
                <br />
                {parsedAsset.s}/{parsedCollateralAsset.s}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:currentPrice")}
              <br />
              <span className="text-sm">
                {(1 / currentFeedSettlementPrice).toFixed(
                  parsedAsset.p
                )}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:fundingRatio")}
              <br />
              <span className="text-sm">
                {(
                  (1 /
                    currentFeedSettlementPrice /
                    settlementFund.finalSettlementPrice) *
                  100
                ).toFixed(2)}
                {" % ("}
                <span className="text-red-500 dark:text-red-400">
                  {"-"}
                  {(
                    100 -
                    (1 /
                      currentFeedSettlementPrice /
                      settlementFund.finalSettlementPrice) *
                      100
                  ).toFixed(2)}
                  {" %"}
                </span>
                {")"}
              </span>
            </div>
          </div>
          <a href={`/settlement/index.html?id=${finalAsset.id}`}>
            <Button className="mt-3 pb-2">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {t("Smartcoin:individualSettlementFund", {
              symbol: finalAsset.symbol,
            })}
          </CardTitle>{" "}
          <CardDescription>
            {t("Smartcoin:individualSettlementFundDescription")}
            <br />
            {t("Smartcoin:fundsCanBeBidOn")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4">
            <div className="col-span-1">
              {t("Smartcoin:fund")}
              <br />
              <span className="text-sm">
                {individualSettlementFund._fund}
                <br />
                {parsedCollateralAsset.s}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:debt2")}
              <br />
              <span className="text-sm">
                {individualSettlementFund._debt}
                <br />
                {parsedAsset.s}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:feedPrice")}
              <br />
              <span className="text-sm">
                {individualSettlementPrice.toFixed(parsedAsset.p)}
              </span>
            </div>
            <div className="col-span-1">
              {t("Smartcoin:fundingRatio")}
              <br />
              <span className="text-sm">
                {(
                  ((individualSettlementFund._debt *
                    individualSettlementPrice) /
                    individualSettlementFund._fund) *
                  100
                ).toFixed(2)}
                {" % ("}
                <span className="text-red-500 dark:text-red-400">
                  {"-"}
                  {(
                    100 -
                    ((individualSettlementFund._debt *
                      individualSettlementPrice) /
                      individualSettlementFund._fund) *
                      100
                  ).toFixed(2)}
                  {" %"}
                </span>
                {")"}
              </span>
            </div>
          </div>
          <a href={`/settlement/index.html?id=${finalAsset.id}`}>
            <Button className="mt-3 pb-2">
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
