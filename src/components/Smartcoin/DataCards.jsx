import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import {
  MarginPositionRow,
  OrderRow,
  SettlementRow,
  PriceFeedRow,
} from "@/components/Smartcoin/SmartcoinRows.jsx";

const activeTabStyle = {
  backgroundColor: "hsl(var(--primary))",
  color: "hsl(var(--primary-foreground))",
};

export function OrderBookCard({
  parsedAsset,
  parsedCollateralAsset,
  activeOrderTab,
  setActiveOrderTab,
  buyOrders,
  sellOrders,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="grid grid-cols-2">
            <div className="col-span-1">
              <CardTitle>
                {parsedAsset && parsedCollateralAsset
                  ? t("Smartcoin:orderBookForAssets", {
                      asset1: parsedAsset.s,
                      asset2: parsedCollateralAsset.s,
                    })
                  : t("Smartcoin:orderBookLoading")}
              </CardTitle>
              <CardDescription>
                {t("Smartcoin:orderBookNote")}
              </CardDescription>
            </div>
            <div className="col-span-1 text-right">
              <a
                href={
                  parsedAsset && parsedCollateralAsset
                    ? `/dex/index.html?market=${parsedAsset.s}_${parsedCollateralAsset.s}`
                    : ""
                }
              >
                <Button>{t("Smartcoin:goToMarket")}</Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2">
              {activeOrderTab === "buy" ? (
                <TabsTrigger value="buy" style={activeTabStyle}>
                  {t("Smartcoin:viewingBuyOrders")}
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="buy"
                  onClick={() => setActiveOrderTab("buy")}
                >
                  {t("Smartcoin:viewBuyOrders")}
                </TabsTrigger>
              )}
              {activeOrderTab === "sell" ? (
                <TabsTrigger value="sell" style={activeTabStyle}>
                  {t("Smartcoin:viewingSellOrders")}
                </TabsTrigger>
              ) : (
                <TabsTrigger
                  value="sell"
                  onClick={() => setActiveOrderTab("sell")}
                >
                  {t("Smartcoin:viewSellOrders")}
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="buy">
              {buyOrders && buyOrders.length ? (
                <>
                  <div className="grid grid-cols-4">
                    <div className="col-span-1">{t("Smartcoin:price")}</div>
                    <div className="col-span-1">
                      {parsedCollateralAsset.s}
                    </div>
                    <div className="col-span-1">{parsedAsset.s}</div>
                    <div className="col-span-1">{t("Smartcoin:total")}</div>
                  </div>
                  <div className="w-full max-h-[260px] overflow-auto">
                    <List
                      rowComponent={(props) => (
                        <OrderRow
                          {...props}
                          activeOrderTab={activeOrderTab}
                          buyOrders={buyOrders}
                          sellOrders={sellOrders}
                          parsedAsset={parsedAsset}
                          parsedCollateralAsset={parsedCollateralAsset}
                        />
                      )}
                      rowCount={buyOrders.length}
                      rowHeight={25}
                      rowProps={{}}
                    />
                  </div>
                </>
              ) : null}
              {buyOrders && !buyOrders.length
                ? t("Smartcoin:noBuyOrdersFound")
                : null}
              {!buyOrders ? t("Smartcoin:loading") : null}
            </TabsContent>
            <TabsContent value="sell">
              {sellOrders && sellOrders.length ? (
                <>
                  <div className="grid grid-cols-4">
                    <div className="col-span-1">{t("Smartcoin:price")}</div>
                    <div className="col-span-1">{parsedAsset.s}</div>
                    <div className="col-span-1">
                      {parsedCollateralAsset.s}
                    </div>
                    <div className="col-span-1">{t("Smartcoin:total")}</div>
                  </div>
                  <div className="w-full max-h-[260px] overflow-auto">
                    <List
                      rowComponent={(props) => (
                        <OrderRow
                          {...props}
                          activeOrderTab={activeOrderTab}
                          buyOrders={buyOrders}
                          sellOrders={sellOrders}
                          parsedAsset={parsedAsset}
                          parsedCollateralAsset={parsedCollateralAsset}
                        />
                      )}
                      rowCount={sellOrders.length}
                      rowHeight={25}
                      rowProps={{}}
                    />
                  </div>
                </>
              ) : null}
              {sellOrders && !sellOrders.length
                ? "No sell orders found"
                : null}
              {!sellOrders ? "Loading..." : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function CallOrdersCard({
  parsedAsset,
  parsedCollateralAsset,
  assetCallOrders,
  currentFeedSettlementPrice,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {parsedAsset && parsedCollateralAsset
              ? t("Smartcoin:callOrdersForAssets", {
                  asset1: parsedAsset.s,
                  asset2: parsedCollateralAsset.s,
                })
              : t("Smartcoin:callOrdersLoading")}
          </CardTitle>
          <CardDescription>
            {t("Smartcoin:checkMarginPositions")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assetCallOrders && assetCallOrders.length ? (
            <>
              <div className="grid grid-cols-4 md:grid-cols-6">
                <div className="col-span-1">{t("Smartcoin:borrower")}</div>
                <div className="col-span-1">
                  {t("Smartcoin:collateral")}
                </div>
                <div className="col-span-1">{t("Smartcoin:debt")}</div>
                <div className="col-span-1">{t("Smartcoin:callPrice")}</div>
                <div className="hidden md:block col-span-1">
                  {t("Smartcoin:tcr")}
                </div>
                <div className="hidden md:block col-span-1">
                  {t("Smartcoin:ratio")}
                </div>
              </div>
              <div className="w-full max-h-[260px] overflow-auto">
                <List
                  rowComponent={(props) => (
                    <MarginPositionRow
                      {...props}
                      assetCallOrders={assetCallOrders}
                      parsedCollateralAsset={parsedCollateralAsset}
                      parsedAsset={parsedAsset}
                      currentFeedSettlementPrice={currentFeedSettlementPrice}
                    />
                  )}
                  rowCount={assetCallOrders.length}
                  rowHeight={25}
                  rowProps={{}}
                />
              </div>
            </>
          ) : null}
          {assetCallOrders && !assetCallOrders.length
            ? t("Smartcoin:noCallOrdersFound")
            : null}
          {!assetCallOrders ? t("Smartcoin:loading") : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettleOrdersCard({
  parsedAsset,
  parsedCollateralAsset,
  assetSettleOrders,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {parsedAsset && parsedCollateralAsset
              ? t("Smartcoin:settleOrdersForAssets", {
                  asset1: parsedAsset.s,
                  asset2: parsedCollateralAsset.s,
                })
              : t("Smartcoin:settleOrdersLoading")}
          </CardTitle>
          <CardDescription>
            {t("Smartcoin:checkSettleOrders")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assetSettleOrders && assetSettleOrders.length ? (
            <>
              <div className="grid grid-cols-6">
                <div className="col-span-1">{t("Smartcoin:owner")}</div>
                <div className="col-span-1">{t("Smartcoin:balance2")}</div>
                <div className="col-span-1">
                  {t("Smartcoin:settlementDate")}
                </div>
              </div>
              <div className="w-full max-h-[260px] overflow-auto">
                <List
                  rowComponent={(props) => (
                    <SettlementRow
                      {...props}
                      assetSettleOrders={assetSettleOrders}
                    />
                  )}
                  rowCount={assetSettleOrders.length}
                  rowHeight={25}
                  rowProps={{}}
                />
              </div>
            </>
          ) : null}
          {assetSettleOrders && !assetSettleOrders.length
            ? t("Smartcoin:noSettleOrdersFound")
            : null}
          {!assetSettleOrders ? t("Smartcoin:loading") : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function PriceFeedsCard({
  parsedAsset,
  parsedCollateralAsset,
  finalBitasset,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="grid grid-cols-1 mt-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {parsedAsset && parsedCollateralAsset
              ? t("Smartcoin:priceFeedsForAsset", { asset: parsedAsset.s })
              : t("Smartcoin:priceFeedsLoading")}
          </CardTitle>
          <CardDescription>
            {t("Smartcoin:checkLatestPriceFeeds")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {finalBitasset && finalBitasset.feeds ? (
            <>
              <div className="grid grid-cols-11">
                <div className="col-span-2">{t("Smartcoin:user")}</div>
                <div className="col-span-2">{t("Smartcoin:date")}</div>
                <div className="col-span-2">{t("Smartcoin:cer")}</div>
                <div className="col-span-2">
                  {t("Smartcoin:settlement")}
                </div>
                <div className="col-span-1">{t("Smartcoin:icr")}</div>
                <div className="col-span-1">{t("Smartcoin:mcr")}</div>
                <div className="col-span-1">{t("Smartcoin:mssr")}</div>
              </div>
              <div className="w-full max-h-[260px] overflow-auto">
                <List
                  rowComponent={(props) => (
                    <PriceFeedRow
                      {...props}
                      finalBitasset={finalBitasset}
                      parsedAsset={parsedAsset}
                      parsedCollateralAsset={parsedCollateralAsset}
                    />
                  )}
                  rowCount={finalBitasset.feeds.length}
                  rowHeight={25}
                  rowProps={{}}
                />
              </div>
            </>
          ) : null}
          {finalBitasset && !finalBitasset.feeds.length
            ? t("Smartcoin:noSmartcoinFeedsFound")
            : null}
          {!finalBitasset ? t("Smartcoin:loading") : null}
        </CardContent>
      </Card>
    </div>
  );
}
