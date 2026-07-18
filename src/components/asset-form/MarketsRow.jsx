import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";

export const AllowedMarketsRow = React.memo(({ index, style, items, assets, marketSearch, onRemove }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const res = items[index];
  if (!res) return null;

  const currentAsset = assets.find((x) => x.id === res);
  const issuer = marketSearch.find((x) => x.id === res);

  return (
    <div style={{ ...style }} key={`acard-${res}`}>
      <Card className="ml-2 mr-2 mt-1">
        <CardHeader className="pb-3 pt-3">
          <span className="grid grid-cols-12">
            <span className="col-span-11">
              <div className="">
                {currentAsset
                  ? `${currentAsset.symbol} (${currentAsset.id})`
                  : res}
              </div>
              <div className="text-sm">
                {t("Smartcoins:createdBy")}{" "}
                {issuer && issuer.u ? issuer.u : currentAsset.issuer}
              </div>
            </span>
            <span className="col-span-1">
              <Button
                variant="outline"
                className="mr-2 mt-2"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(res);
                }}
              >
                ❌
              </Button>
            </span>
          </span>
        </CardHeader>
      </Card>
    </div>
  );
});

export const BannedMarketsRow = React.memo(({ index, style, items, assets, marketSearch, onRemove }) => {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const res = items[index];
  if (!res) return null;

  const currentAsset = assets.find((x) => x.id === res);
  const issuer = marketSearch.find((x) => x.id === res);

  return (
    <div style={{ ...style }} key={`acard-${res}`}>
      <Card className="ml-2 mr-2 mt-1">
        <CardHeader className="pb-3 pt-3">
          <span className="grid grid-cols-12">
            <span className="col-span-11">
              <div className="">
                {currentAsset
                  ? `${currentAsset.symbol} (${currentAsset.id})`
                  : res}
              </div>
              <div className="text-sm">
                {t("Smartcoins:createdBy")}{" "}
                {issuer && issuer.u ? issuer.u : currentAsset.issuer}
              </div>
            </span>
            <span className="col-span-1">
              <Button
                variant="outline"
                className="mr-2 mt-2"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(res);
                }}
              >
                ❌
              </Button>
            </span>
          </span>
        </CardHeader>
      </Card>
    </div>
  );
});
