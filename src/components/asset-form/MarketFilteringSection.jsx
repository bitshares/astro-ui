import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Separator } from "@/components/ui/separator";

import AssetFlag from "@/components/common/AssetFlag.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { AllowedMarketsRow, BannedMarketsRow } from "./MarketsRow.jsx";

export default function MarketFilteringSection({
  allowedMarketsEnabled,
  setAllowedMarketsEnabled,
  allowedMarkets,
  setAllowedMarkets,
  bannedMarketsEnabled,
  setBannedMarketsEnabled,
  bannedMarkets,
  setBannedMarkets,
  assets,
  marketSearch,
  usr,
  balances,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="col-span-2">
      <div className="grid grid-cols-2 gap-5 mt-4">
        <AssetFlag
          alreadyDisabled={false}
          id={"allowed_markets"}
          allowedText={t(
            "AssetCommon:extensions.allowed_markets.enabled"
          )}
          enabledInfo={t(
            "AssetCommon:extensions.allowed_markets.enabledInfo"
          )}
          disabledText={t(
            "AssetCommon:extensions.allowed_markets.disabled"
          )}
          disabledInfo={t(
            "AssetCommon:extensions.allowed_markets.disabledInfo"
          )}
          permission={true}
          flag={allowedMarketsEnabled}
          setFlag={setAllowedMarketsEnabled}
        />
        {allowedMarketsEnabled ? (
          <AssetDropDown
            assetSymbol={""}
            assetData={null}
            storeCallback={(input) => {
              if (
                !allowedMarkets.includes(input) &&
                !bannedMarkets.includes(input)
              ) {
                const _foundAsset = assets.find(
                  (x) => x.symbol === input
                );
                setAllowedMarkets([
                  ...allowedMarkets,
                  _foundAsset.id,
                ]);
              }
            }}
            otherAsset={null}
            marketSearch={marketSearch}
            type={"backing"}
            chain={usr && usr.chain ? usr.chain : "bitshares"}
            balances={balances}
          />
        ) : null}
      </div>
      {allowedMarketsEnabled ? (
        <div className="mt-3 border border-border rounded">
          <div className="w-full max-h-[210px] overflow-auto">
            <List
              rowComponent={AllowedMarketsRow}
              rowCount={allowedMarkets.length}
              rowHeight={90}
              rowProps={{
                items: allowedMarkets,
                assets,
                marketSearch,
                onRemove: (id) => {
                  setAllowedMarkets(
                    allowedMarkets.filter((x) => x !== id)
                  );
                },
              }}
            />
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-5 mt-4">
        <AssetFlag
          alreadyDisabled={false}
          id={"banned_markets"}
          allowedText={t(
            "AssetCommon:extensions.banned_markets.enabled"
          )}
          enabledInfo={t(
            "AssetCommon:extensions.banned_markets.enabledInfo"
          )}
          disabledText={t(
            "AssetCommon:extensions.banned_markets.disabled"
          )}
          disabledInfo={t(
            "AssetCommon:extensions.banned_markets.disabledInfo"
          )}
          permission={true}
          flag={bannedMarketsEnabled}
          setFlag={setBannedMarketsEnabled}
        />
        {bannedMarketsEnabled ? (
          <AssetDropDown
            assetSymbol={""}
            assetData={null}
            storeCallback={(input) => {
              if (
                !bannedMarkets.includes(input) &&
                !allowedMarkets.includes(input)
              ) {
                const _foundAsset = assets.find(
                  (x) => x.symbol === input
                );
                setBannedMarkets([
                  ...bannedMarkets,
                  _foundAsset.id,
                ]);
              }
            }}
            otherAsset={null}
            marketSearch={marketSearch}
            type={"backing"}
            chain={usr && usr.chain ? usr.chain : "bitshares"}
            balances={balances}
          />
        ) : null}
      </div>
      {bannedMarketsEnabled ? (
        <div className="mt-2 border border-border rounded">
          <div className="w-full max-h-[210px] overflow-auto">
            <List
              rowComponent={BannedMarketsRow}
              rowCount={bannedMarkets.length}
              rowHeight={90}
              rowProps={{
                items: bannedMarkets,
                assets,
                marketSearch,
                onRemove: (id) => {
                  setBannedMarkets(
                    bannedMarkets.filter((x) => x !== id)
                  );
                },
              }}
            />
          </div>
        </div>
      ) : null}
      <Separator className="my-4 mt-5" />
    </div>
  );
}
