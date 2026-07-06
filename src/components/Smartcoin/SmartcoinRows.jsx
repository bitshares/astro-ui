import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { humanReadableFloat } from "@/lib/common.js";

export function timeAgo(dateString, t) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now - date;
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  if (diffInDays < 1) {
    return t("Smartcoin:today");
  } else if (diffInDays < 30) {
    return t("Smartcoin:daysAgo", { days: diffInDays });
  } else {
    const diffInMonths = Math.floor(diffInDays / 30);
    return t("Smartcoin:monthsAgo", { months: diffInMonths });
  }
}

export function MarginPositionRow({ index, style, assetCallOrders, parsedCollateralAsset, parsedAsset, currentFeedSettlementPrice }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const res = assetCallOrders[index];
  const collateralAmount = humanReadableFloat(
    res.collateral,
    parsedCollateralAsset.p
  );
  const debtAmount = humanReadableFloat(res.debt, parsedAsset.p);

  const tcr = res.target_collateral_ratio
    ? `${res.target_collateral_ratio / 10}%`
    : `0%`;

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

  return (
    <div className="grid grid-cols-6 text-sm" style={style}>
      <div className="col-span-1">
        <span className="text-blue-500 dark:text-blue-400">{res.borrower}</span>
      </div>
      <div className="col-span-1">{collateralAmount}</div>
      <div className="col-span-1">{debtAmount}</div>
      <div className="col-span-1">{callPrice}</div>
      <div className="hidden md:block col-span-1">{tcr}</div>
      <div className="hidden md:block col-span-1">{ratio}</div>
    </div>
  );
}

export function OrderRow({ index, style, activeOrderTab, buyOrders, sellOrders, parsedAsset, parsedCollateralAsset }) {
  let reference;
  let res;
  let precision;
  if (activeOrderTab === "buy") {
    reference = buyOrders;
    res = buyOrders[index];
    precision = parsedAsset.p;
  } else {
    reference = sellOrders;
    res = sellOrders[index];
    precision = parsedCollateralAsset.p;
  }

  if (!reference || !res) {
    return null;
  }

  return (
    <div className="grid grid-cols-4 text-sm" style={style}>
      <div className="col-span-1">
        {parseFloat(res.price).toFixed(precision)}
      </div>
      <div className="col-span-1">{res.base}</div>
      <div className="col-span-1">{res.quote}</div>
      <div className="col-span-1">
        {reference
          .slice(0, index + 1)
          .map((x) => parseFloat(x.base))
          .reduce((acc, curr) => acc + curr, 0)
          .toFixed(precision)}
      </div>
    </div>
  );
}

export function SettlementRow({ index, style, assetSettleOrders }) {
  let res = assetSettleOrders[index];
  return (
    <div className="grid grid-cols-3 text-sm" style={style}>
      <div className="col-span-1">{res.account_id_type ?? ""}</div>
      <div className="col-span-1">{res.asset ?? ""}</div>
      <div className="col-span-1">{res.time_point_sec ?? ""}</div>
    </div>
  );
}

export function PriceFeedRow({ index, style, finalBitasset, parsedAsset, parsedCollateralAsset }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  let res = finalBitasset.feeds[index];
  const userID = res[0];
  const date = res[1][0];
  const feedObj = res[1][1];

  const coreExchangeRate = (
    1 /
    (humanReadableFloat(
      feedObj.core_exchange_rate.base.amount,
      parsedAsset.p
    ) /
      humanReadableFloat(
        feedObj.core_exchange_rate.quote.amount,
        parsedCollateralAsset.p
      ))
  ).toFixed(parsedCollateralAsset.p);

  const feedPrice = (
    1 /
    (humanReadableFloat(feedObj.settlement_price.base.amount, parsedAsset.p) /
      humanReadableFloat(
        feedObj.settlement_price.quote.amount,
        parsedCollateralAsset.p
      ))
  ).toFixed(parsedCollateralAsset.p);

  return (
    <div className="grid grid-cols-7 md:grid-cols-11 text-sm" style={style}>
      <div className="hidden md:block col-span-2 mr-1">
        <span className="text-blue-500 dark:text-blue-400">{userID}</span>
      </div>
      <div className="hidden md:block col-span-2 ml-1">
        {timeAgo(date, t)}
      </div>
      <div className="col-span-2">{coreExchangeRate}</div>
      <div className="col-span-2">{feedPrice}</div>
      <div className="col-span-1">{feedObj.initial_collateral_ratio}</div>
      <div className="col-span-1">{feedObj.maintenance_collateral_ratio}</div>
      <div className="col-span-1">{feedObj.maximum_short_squeeze_ratio}</div>
    </div>
  );
}
