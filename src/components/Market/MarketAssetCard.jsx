import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { HeartFilledIcon, HeartIcon } from "@radix-ui/react-icons";
import { useStore } from "@nanostores/react";
import {
  CircleCheck,
  Coins,
  ExternalLink,
  FileJson,
  Info,
  Wallet,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import ExternalLinkButton from "../common/ExternalLink.jsx";
import CardRow from "../common/CardRow.jsx";
import AssetDropDown from "./AssetDropDownCard.jsx";

import { humanReadableFloat } from "@/lib/common";
import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

const TYPE_ACCENTS = {
  buy: { bar: "from-emerald-400/70", chip: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200", label: "Buy" },
  sell: { bar: "from-rose-400/70", chip: "border-rose-400/30 bg-rose-500/15 text-rose-200", label: "Sell" },
  pool: { bar: "from-amber-400/70", chip: "border-amber-400/30 bg-amber-500/15 text-amber-200", label: "Pool" },
};

const DIALOG_CLASS =
  "!bg-card border border-border text-foreground/85";

export default function MarketAssetCard(properties) {
  const {
    asset,
    assetData,
    assetDetails,
    bitassetData,
    marketSearch,
    chain,
    usrBalances,
    type,
    otherAsset,
    storeCallback,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const favouriteAssets = useStore($favouriteAssets);

  const isFavourite = useMemo(() => {
    return favouriteAssets[chain].map((x) => x.id).includes(assetData.id);
  }, [favouriteAssets, chain, asset]);

  const [assetBalance, setAssetBalance] = useState(0);
  useEffect(() => {
    if (assetData && usrBalances) {
      const id = assetData.id;
      const foundBalance = usrBalances.find((x) => x.asset_id === id);
      if (foundBalance) {
        const balance = humanReadableFloat(
          foundBalance.amount,
          assetData.precision,
        ).toLocaleString(undefined, {
          minimumFractionDigits: assetData.precision,
        });
        setAssetBalance(balance);
      }
    }
  }, [assetData, usrBalances]);

  const [baseAsset, setBaseAsset] = useState();
  const [quoteAsset, setQuoteAsset] = useState();
  const [backingAsset, setBackingAsset] = useState();

  useEffect(() => {
    if (marketSearch && bitassetData) {
      setBaseAsset(
        marketSearch.find(
          (x) =>
            x.id === bitassetData.current_feed.settlement_price.base.asset_id,
        ),
      );
      setQuoteAsset(
        marketSearch.find(
          (x) =>
            x.id === bitassetData.current_feed.settlement_price.quote.asset_id,
        ),
      );
      setBackingAsset(
        marketSearch.find(
          (x) => x.id === bitassetData.options.short_backing_asset,
        ),
      );
    }
  }, [bitassetData, marketSearch]);

  const max_supply = useMemo(() => {
    return assetData.options
      ? assetData.options.max_supply
      : assetData.max_supply;
  }, [assetData]);

  const typeAccent = TYPE_ACCENTS[type] || TYPE_ACCENTS.buy;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xl shadow-black/30">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent",
          typeAccent.bar,
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/[0.06] blur-3xl"
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">
                {asset}{" "}
                <span className="text-muted-foreground/70 font-mono text-xs">
                  {assetData ? `(${assetData.id})` : ""}
                </span>
              </h3>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              {type === "buy" ? (
                <>
                  <span>{t("MarketAssetCard:quoteAsset")}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{t("MarketAssetCard:buying")}</span>
                </>
              ) : null}
              {type === "sell" ? (
                <>
                  <span>{t("MarketAssetCard:baseAsset")}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{t("MarketAssetCard:selling")}</span>
                </>
              ) : null}
              {type === "pool" ? (
                <span>{t("MarketAssetCard:poolStakeAsset")}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFavourite) {
                        removeFavouriteAsset(chain, {
                          id: assetData.id,
                          symbol: assetData.symbol,
                          issuer: assetData.issuer,
                        });
                      } else {
                        addFavouriteAsset(chain, {
                          id: assetData.id,
                          symbol: assetData.symbol,
                          issuer: assetData.issuer,
                        });
                      }
                    }}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      isFavourite
                        ? "border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                        : "border-border bg-card/40 text-muted-foreground hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-500/10",
                    )}
                    aria-label={isFavourite ? "Unfavourite" : "Favourite"}
                  >
                    {isFavourite ? (
                      <HeartFilledIcon className="h-4 w-4" />
                    ) : (
                      <HeartIcon className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="!bg-card border border-border text-foreground/85">
                  Favourite
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {otherAsset ? (
              <AssetDropDown
                assetSymbol={assetData.symbol}
                assetData={assetData}
                storeCallback={storeCallback}
                otherAsset={otherAsset}
                marketSearch={marketSearch}
                type={"base"}
                size="cog"
                chain={chain}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-1.5 border-border bg-card/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-foreground/80 hover:text-accent-foreground text-xs"
              >
                <Coins className="h-3 w-3 text-cyan-300" />
                {t("MarketAssetCard:supply")}
              </Button>
            </DialogTrigger>
            <DialogContent

              className={cn(DIALOG_CLASS, "sm:max-w-[420px]")}
            >
              <DialogHeader>
                <DialogTitle>
                  {asset} {assetData ? `(${assetData.id})` : ""}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  {assetDetails && assetDetails.current_supply && assetData ? (
                    <>
                      {humanReadableFloat(
                        assetDetails.current_supply,
                        assetData.precision,
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: assetData.precision,
                      })}{" "}
                      {t("MarketAssetCard:totalCirculation", { asset: asset })}
                      <br />
                    </>
                  ) : null}
                  {assetDetails && assetData
                    ? humanReadableFloat(
                        max_supply,
                        assetData.precision,
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: assetData.precision,
                      })
                    : "???"}{" "}
                  {t("MarketAssetCard:maximumSupply")}
                  <br />
                  {assetDetails &&
                  assetDetails.confidential_supply &&
                  assetData ? (
                    <>
                      {humanReadableFloat(
                        assetDetails.confidential_supply,
                        assetData.precision,
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: assetData.precision,
                      })}{" "}
                      {t("MarketAssetCard:confidentialSupply", {
                        asset: asset,
                      })}
                    </>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-1.5 border-border bg-card/40 hover:border-violet-400/40 hover:bg-violet-500/10 text-foreground/80 hover:text-accent-foreground text-xs"
              >
                <ExternalLink className="h-3 w-3 text-violet-300" />
                {t("MarketAssetCard:links")}
              </Button>
            </DialogTrigger>
            <DialogContent

              className={cn(DIALOG_CLASS, "sm:max-w-[620px]")}
            >
              <DialogHeader>
                <DialogTitle>
                  {t("MarketAssetCard:externalLinks", { asset: asset })}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  {t("MarketAssetCard:externalLinksDescription", {
                    asset: asset,
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-2 text-foreground/85">
                <div>
                  <b className="text-foreground">{t("MarketAssetCard:explorers")}</b>
                </div>
                <div>
                  {chain === "bitshares" ? (
                    <ExternalLinkButton
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={`kibana.bitshares.dev`}
                      hyperlink={`https://kibana.bitshares.dev/app/dashboards#/view/a7571e94-a69f-4a97-940a-ef0eec76d070?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1M,to:now))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'55c28590-5c51-11eb-a22a-3fca5c3996eb',key:operation_type,negate:!t,params:(query:19),type:phrase),query:(match_phrase:(operation_type:19))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'55c28590-5c51-11eb-a22a-3fca5c3996eb',key:operation_type,negate:!t,params:(query:2),type:phrase),query:(match_phrase:(operation_type:2)))),query:(language:kuery,query:'${assetData.id}'))`}
                    />
                  ) : null}
                  {chain === "bitshares" ? (
                    <ExternalLinkButton
                      variant="outline"
                      classnamecontents="ml-2"
                      type="button"
                      text={`Bitshareschain.com`}
                      hyperlink={`https://www.bitshareschain.com/asset/${asset}`}
                    />
                  ) : null}
                </div>
                <div>
                  <b className="text-foreground">{t("MarketAssetCard:webWallets")}</b>
                </div>
                <div>
                  <ExternalLinkButton
                    classnamecontents=""
                    variant="outline"
                    type="button"
                    text={`BTS.exchange`}
                    hyperlink={`https://bts.exchange/#/asset/${asset}`}
                  />
                  <ExternalLinkButton
                    classnamecontents="ml-2"
                    variant="outline"
                    type="button"
                    text={`XBTS.io`}
                    hyperlink={`https://ex.xbts.io/#/asset/${asset}`}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-1.5 border-border bg-card/40 hover:border-amber-400/40 hover:bg-amber-500/10 text-foreground/80 hover:text-accent-foreground text-xs"
              >
                <FileJson className="h-3 w-3 text-amber-300" />
                {t("MarketAssetCard:json")}
              </Button>
            </DialogTrigger>
            <DialogContent

              className={cn(DIALOG_CLASS, "sm:max-w-[620px]")}
            >
              <DialogHeader>
                <DialogTitle>
                  {t("MarketAssetCard:jsonSummaryData", { asset: asset })}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  {t("MarketAssetCard:jsonSummaryDataDescription", {
                    asset: asset,
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1">
                <div className="col-span-1">
                  <ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm">
                    <pre className="text-xs text-foreground/80 p-3 font-mono">
                      {JSON.stringify(
                        { assetData, assetDetails, bitassetData },
                        null,
                        2,
                      )}
                    </pre>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    className="mt-2 border-border bg-card/40 hover:border-amber-400/40 hover:bg-amber-500/10 text-foreground/80 hover:text-accent-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(
                          { assetData, assetDetails, bitassetData },
                          null,
                          2,
                        ),
                      );
                    }}
                  >
                    <CircleCheck className="h-3.5 w-3.5 mr-1.5" />
                    {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {assetDetails && assetData && marketSearch && marketSearch.length ? (
          <div className="mt-4 grid grid-cols-1 gap-1.5 w-full">
            <CardRow
              title={t("MarketAssetCard:yourBalance")}
              button={`${assetBalance}`}
              dialogtitle={t("MarketAssetCard:assetBalance", {
                asset: asset,
                id: assetData ? assetData.id : "?",
              })}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>
                    {t("MarketAssetCard:balanceDescription1", { asset: asset })}
                  </li>
                  <li>{t("MarketAssetCard:balanceDescription2")}</li>
                  <li>
                    {t("MarketAssetCard:balanceDescription3", { asset: asset })}
                  </li>
                </ul>
              }
              tooltip={t("MarketAssetCard:balanceTooltip")}
            />

            <CardRow
              title={t("MarketAssetCard:assetType")}
              button={
                <>
                  {!bitassetData ? t("MarketAssetCard:userIssuedAsset") : null}
                  {bitassetData && bitassetData.is_prediction_market
                    ? t("MarketAssetCard:predictionMarket")
                    : null}
                  {bitassetData && !bitassetData.is_prediction_market
                    ? t("MarketAssetCard:smartcoin")
                    : null}
                </>
              }
              dialogtitle={`
                ${
                  !bitassetData
                    ? t("MarketAssetCard:userIssuedAssetSummary")
                    : ""
                }
                ${
                  bitassetData && bitassetData.is_prediction_market
                    ? t("MarketAssetCard:predictionMarketSummary")
                    : ""
                }
                ${
                  bitassetData && !bitassetData.is_prediction_market
                    ? t("MarketAssetCard:smartcoinSummary")
                    : ""
                }
              `}
              dialogdescription={
                <>
                  {!bitassetData ? (
                    <ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription1")}
                        </li>
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription2")}
                        </li>
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription3")}
                        </li>
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription4")}
                        </li>
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription5")}
                        </li>
                        <li>
                          {t("MarketAssetCard:userIssuedAssetDescription6")}
                        </li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>
                          {t("MarketAssetCard:predictionMarketDescription1")}
                        </li>
                        <li>
                          {t("MarketAssetCard:predictionMarketDescription2")}
                        </li>
                        <li>
                          {t("MarketAssetCard:predictionMarketDescription3")}
                        </li>
                        <li>
                          {t("MarketAssetCard:predictionMarketDescription4")}
                        </li>
                        <li>
                          {t("MarketAssetCard:predictionMarketDescription5")}
                        </li>
                      </ul>
                    </ScrollArea>
                  ) : null}

                  {bitassetData && !bitassetData.is_prediction_market ? (
                    <ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm">
                      <ul className="ml-2 list-disc [&>li]:mt-2 pl-5 pr-5">
                        <li>{t("MarketAssetCard:smartcoinDescription1")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription2")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription3")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription4")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription5")}</li>
                        <li>{t("MarketAssetCard:smartcoinDescription6")}</li>
                      </ul>
                    </ScrollArea>
                  ) : null}
                </>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetType")}
            />

            <CardRow
              title={t("MarketAssetCard:issuer")}
              button={
                marketSearch
                  ? marketSearch.find((x) => x.id === assetData.id)?.u ?? "?"
                  : "?"
              }
              dialogtitle={t("MarketAssetCard:assetIssuer", {
                asset: assetData.symbol,
              })}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>{t("MarketAssetCard:issuerDescription1")}</li>
                  <li>{t("MarketAssetCard:issuerDescription2")}</li>
                  <li>{t("MarketAssetCard:issuerDescription3")}</li>
                  <li>{t("MarketAssetCard:issuerDescription4")}</li>
                </ul>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetIssuer")}
            />

            <CardRow
              title={t("MarketAssetCard:precision")}
              button={assetData.precision}
              dialogtitle={t("MarketAssetCard:assetPrecisionInfo")}
              dialogdescription={
                <ul className="ml-2 list-disc [&>li]:mt-2">
                  <li>{t("MarketAssetCard:precisionDescription1")}</li>
                  <li>
                    {t("MarketAssetCard:precisionDescription2", {
                      asset: assetData.symbol,
                      precision: assetData.precision,
                      quantity: humanReadableFloat(1, assetData.precision),
                    })}
                  </li>
                </ul>
              }
              tooltip={t("MarketAssetCard:moreAboutAssetPrecision")}
            />

            {assetData.market_fee_percent ? (
              <CardRow
                title={t("MarketAssetCard:marketFee")}
                button={`${assetData.market_fee_percent / 100} %`}
                dialogtitle={t("MarketAssetCard:infoOnAssetMarketFees")}
                dialogdescription={
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>{t("MarketAssetCard:marketFeeDescription1")}</li>
                    <li>{t("MarketAssetCard:marketFeeDescription2")}</li>
                    <li>{t("MarketAssetCard:marketFeeDescription3")}</li>
                  </ul>
                }
                tooltip={t("MarketAssetCard:moreAboutMarketFees")}
              />
            ) : null}

            {bitassetData && !bitassetData.is_prediction_market ? (
              <>
                {backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:backingAsset")}
                    button={
                      <>
                        {backingAsset.s} (
                        {bitassetData.options.short_backing_asset})
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:backingAssetInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:backingAssetDescription1")}</li>
                        <li>{t("MarketAssetCard:backingAssetDescription2")}</li>
                        <li>{t("MarketAssetCard:backingAssetDescription3")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutBackingAsset")}
                  />
                ) : null}

                {bitassetData.options.extensions.margin_call_fee_ratio ? (
                  <CardRow
                    title={t("MarketAssetCard:marginCallFeeRatio")}
                    button={
                      <>
                        {bitassetData.options.extensions.margin_call_fee_ratio /
                          100}{" "}
                        %
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:marginCallFeeRatioInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t("MarketAssetCard:marginCallFeeRatioDescription1")}
                        </li>
                        <li>
                          {t("MarketAssetCard:marginCallFeeRatioDescription2")}
                        </li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutMarginCallFeeRatio")}
                  />
                ) : null}

                {bitassetData.options.extensions.force_settle_fee_percent ? (
                  <CardRow
                    title={t("MarketAssetCard:forceSettleFeePercent")}
                    button={
                      <>
                        {bitassetData.options.extensions
                          .force_settle_fee_percent / 100}{" "}
                        %
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:forceSettleFeePercentInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t(
                            "MarketAssetCard:forceSettleFeePercentDescription1",
                          )}
                        </li>
                        <li>
                          {t(
                            "MarketAssetCard:forceSettleFeePercentDescription2",
                          )}
                        </li>
                      </ul>
                    }
                    tooltip={t(
                      "MarketAssetCard:moreAboutForceSettleFeePercent",
                    )}
                  />
                ) : null}

                {bitassetData.settlement_fund && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:settlementFund")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.settlement_fund,
                          backingAsset.p,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:settlementFundInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t("MarketAssetCard:settlementFundDescription1")}
                        </li>
                        <li>
                          {t("MarketAssetCard:settlementFundDescription2")}
                        </li>
                        <li>
                          {t("MarketAssetCard:settlementFundDescription3")}
                        </li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutSettlementFunds")}
                  />
                ) : null}

                {bitassetData.current_feed &&
                bitassetData.current_feed.settlement_price &&
                bitassetData.current_feed.settlement_price.base.amount &&
                bitassetData.current_feed.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:feedPrice")}
                    button={
                      <>
                        {(
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.base
                              .amount,
                            baseAsset.p,
                          ) /
                          humanReadableFloat(
                            bitassetData.current_feed.settlement_price.quote
                              .amount,
                            quoteAsset.p,
                          )
                        ).toFixed(backingAsset.p)}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:feedPriceInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>{t("MarketAssetCard:feedProducerDescription1")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription2")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription3")}</li>
                        <li>{t("MarketAssetCard:feedProducerDescription4")}</li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutFeedPrices")}
                  />
                ) : null}

                {bitassetData.settlement_price &&
                bitassetData.settlement_price.base.amount &&
                bitassetData.settlement_price.quote.amount &&
                baseAsset &&
                quoteAsset &&
                backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:settlementPrice")}
                    button={
                      <>
                        {(
                          humanReadableFloat(
                            bitassetData.settlement_price.base.amount,
                            baseAsset.p,
                          ) /
                          humanReadableFloat(
                            bitassetData.settlement_price.quote.amount,
                            quoteAsset.p,
                          )
                        ).toFixed(backingAsset.p)}{" "}
                        {baseAsset.s}/{backingAsset.s}
                      </>
                    }
                    dialogtitle={t("MarketAssetCard:settlementPriceInfo")}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t("MarketAssetCard:settlementPriceDescription1")}
                        </li>
                        <li>
                          {t("MarketAssetCard:settlementPriceDescription2")}
                        </li>
                        <li>
                          {t("MarketAssetCard:settlementPriceDescription3")}
                        </li>
                      </ul>
                    }
                    tooltip={t("MarketAssetCard:moreAboutSettlementPrice")}
                  />
                ) : null}

                {bitassetData.individual_settlement_debt && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:individualSettlementDebt")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.individual_settlement_debt,
                          backingAsset.p,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}{" "}
                        {asset}
                      </>
                    }
                    dialogtitle={t(
                      "MarketAssetCard:individualSettlementDebtInfo",
                    )}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t(
                            "MarketAssetCard:individualSettlementDebtDescription1",
                          )}
                        </li>
                        <li>
                          {t(
                            "MarketAssetCard:individualSettlementDebtDescription2",
                          )}
                        </li>
                        <li>
                          {t(
                            "MarketAssetCard:individualSettlementDebtDescription3",
                          )}
                        </li>
                        <li>
                          {t(
                            "MarketAssetCard:individualSettlementDebtDescription4",
                          )}
                        </li>
                      </ul>
                    }
                    tooltip={t(
                      "MarketAssetCard:moreAboutIndividualSettlementDebt",
                    )}
                  />
                ) : null}

                {bitassetData.individual_settlement_fund && backingAsset ? (
                  <CardRow
                    title={t("MarketAssetCard:individualSettlementFund")}
                    button={
                      <>
                        {humanReadableFloat(
                          bitassetData.individual_settlement_fund,
                          backingAsset.p,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: backingAsset.p,
                        })}{" "}
                        {asset}
                      </>
                    }
                    dialogtitle={t(
                      "MarketAssetCard:individualSettlementFundInfo",
                    )}
                    dialogdescription={
                      <ul className="ml-2 list-disc [&>li]:mt-2">
                        <li>
                          {t(
                            "MarketAssetCard:individualSettlementFundDescription",
                          )}
                        </li>
                      </ul>
                    }
                    tooltip={t(
                      "MarketAssetCard:moreAboutIndividualSettlementFunds",
                    )}
                  />
                ) : null}
              </>
            ) : null}

            <span className="grid grid-cols-2 gap-2 mt-3">
              {bitassetData ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-7 gap-1.5 border-border bg-card/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-foreground/80 hover:text-accent-foreground text-xs"
                    >
                      <Info className="h-3 w-3" />
                      {t("MarketAssetCard:smartcoinInfoButton")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent

                    className={cn(DIALOG_CLASS, "sm:max-w-[620px]")}
                  >
                    <DialogHeader>
                      <DialogTitle>
                        {t("MarketAssetCard:additionalBitassetInfoTitle")}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground/80">
                        {t("MarketAssetCard:additionalBitassetInfoDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1">
                      <div className="col-span-1">
                        {bitassetData && !bitassetData.is_prediction_market ? (
                          <>
                            <CardRow
                              title={t("MarketAssetCard:smartcoinID")}
                              button={bitassetData.id}
                              dialogtitle={t("MarketAssetCard:smartcoinIDInfo")}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    {t(
                                      "MarketAssetCard:smartcoinIDDescription",
                                    )}
                                  </li>
                                </ul>
                              }
                              tooltip={t(
                                "MarketAssetCard:moreAboutSmartcoinID",
                              )}
                            />

                            <CardRow
                              title={t("MarketAssetCard:feedQuantity")}
                              button={bitassetData.feeds.length}
                              dialogtitle={t(
                                "MarketAssetCard:feedQuantityInfo",
                              )}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    {t(
                                      "MarketAssetCard:feedQuantityDescription1",
                                    )}
                                  </li>
                                  <li>
                                    {t(
                                      "MarketAssetCard:feedQuantityDescription2",
                                    )}
                                  </li>
                                  <li>
                                    {t(
                                      "MarketAssetCard:feedQuantityDescription3",
                                    )}
                                  </li>
                                </ul>
                              }
                              tooltip={t(
                                "MarketAssetCard:moreAboutFeedQuantities",
                              )}
                            />

                            {bitassetData.options.force_settlement_delay_sec ? (
                              <CardRow
                                title={t(
                                  "MarketAssetCard:forceSettlementDelay",
                                )}
                                button={
                                  <>
                                    {bitassetData.options
                                      .force_settlement_delay_sec / 60}{" "}
                                    mins
                                  </>
                                }
                                dialogtitle={t(
                                  "MarketAssetCard:forceSettlementDelayInfo",
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:forceSettlementDelayDescription",
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutForceSettlementDelays",
                                )}
                              />
                            ) : null}

                            <CardRow
                              title={t("MarketAssetCard:forceSettlementOffset")}
                              button={
                                <>
                                  {bitassetData.options
                                    .force_settlement_offset_percent / 100}
                                  %
                                </>
                              }
                              dialogtitle={t(
                                "MarketAssetCard:forceSettlementOffsetInfo",
                              )}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    {t(
                                      "MarketAssetCard:forceSettlementOffsetDescription",
                                    )}
                                  </li>
                                </ul>
                              }
                              tooltip={t(
                                "MarketAssetCard:moreAboutForceSettlementOffset",
                              )}
                            />

                            <CardRow
                              title={t(
                                "MarketAssetCard:maxForceSettlementVolume",
                              )}
                              button={
                                <>
                                  {bitassetData.options
                                    .maximum_force_settlement_volume / 100}{" "}
                                  %
                                </>
                              }
                              dialogtitle={t(
                                "MarketAssetCard:maxForceSettlementVolumeInfo",
                              )}
                              dialogdescription={
                                <ul className="ml-2 list-disc [&>li]:mt-2">
                                  <li>
                                    {t(
                                      "MarketAssetCard:maxForceSettlementVolumeDescription",
                                    )}
                                  </li>
                                </ul>
                              }
                              tooltip={t(
                                "MarketAssetCard:moreAboutMaxForceSettlementVolume",
                              )}
                            />

                            {bitassetData.options.extensions
                              .black_swan_response_method ? (
                              <CardRow
                                title={t(
                                  "MarketAssetCard:globalSettlementResponseMethod",
                                )}
                                button={
                                  bitassetData.options.extensions
                                    .black_swan_response_method
                                }
                                dialogtitle={t(
                                  "MarketAssetCard:globalSettlementResponseMethodInfo",
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:globalSettlementResponseMethodDescription1",
                                      )}
                                    </li>
                                    <li>
                                      {t(
                                        "MarketAssetCard:globalSettlementResponseMethodDescription2",
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutGlobalSettlementResponseMethods",
                                )}
                              />
                            ) : null}

                            {bitassetData.options.extensions
                              .maintenance_collateral_ratio ? (
                              <CardRow
                                title={t(
                                  "MarketAssetCard:maintenanceCollateralRatio",
                                )}
                                button={
                                  <>
                                    {bitassetData.options.extensions
                                      .maintenance_collateral_ratio / 10}
                                    %
                                  </>
                                }
                                dialogtitle={t(
                                  "MarketAssetCard:maintenanceCollateralRatioInfo",
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:maintenanceCollateralRatioDescription1",
                                      )}
                                    </li>
                                    <li>
                                      {t(
                                        "MarketAssetCard:maintenanceCollateralRatioDescription2",
                                      )}
                                    </li>
                                    <li>
                                      {t(
                                        "MarketAssetCard:maintenanceCollateralRatioDescription3",
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutMaintenanceCollateralRatio",
                                )}
                              />
                            ) : null}

                            {bitassetData.options.extensions
                              .initial_collateral_ratio ? (
                              <CardRow
                                title={t(
                                  "MarketAssetCard:initialCollateralRatio",
                                )}
                                button={
                                  <>
                                    {bitassetData.options.extensions
                                      .initial_collateral_ratio / 10}{" "}
                                    %
                                  </>
                                }
                                dialogtitle={t(
                                  "MarketAssetCard:initialCollateralRatioInfo",
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:initialCollateralRatioDescription1",
                                      )}
                                    </li>
                                    <li>
                                      {t(
                                        "MarketAssetCard:initialCollateralRatioDescription2",
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutInitialCollateralRatio",
                                )}
                              />
                            ) : null}

                            {bitassetData.options.extensions
                              .maximum_short_squeeze_ratio ? (
                              <CardRow
                                title={t(
                                  "MarketAssetCard:maximumShortSqueezeRatio",
                                )}
                                button={
                                  <>
                                    {bitassetData.options.extensions
                                      .maximum_short_squeeze_ratio / 10}{" "}
                                    %
                                  </>
                                }
                                dialogtitle={t(
                                  "MarketAssetCard:maximumShortSqueezeRatioInfo",
                                )}
                                dialogdescription={
                                  <ul className="ml-2 list-disc [&>li]:mt-2">
                                    <li>
                                      {t(
                                        "MarketAssetCard:maximumShortSqueezeRatioDescription",
                                      )}
                                    </li>
                                  </ul>
                                }
                                tooltip={t(
                                  "MarketAssetCard:moreAboutMaximumShortSqueezeRatio",
                                )}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}

            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
