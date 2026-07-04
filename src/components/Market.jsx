import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeftRight,
  Repeat,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ExternalLink as ExternalLinkIcon,
  Activity,
  Wallet,
} from "lucide-react";

import { trimPrice, isInvertedMarket } from "@/lib/common";
import { createMarketTradeHistoryStore } from "@/nanoeffects/MarketTradeHistory.ts";
import { createMarketOrderStore } from "@/nanoeffects/MarketOrderBook.ts";

import LimitOrderCard from "./Market/LimitOrderCard.jsx";
import MarketOrderCard from "./Market/MarketOrderCard.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";
import MarketAssetCard from "./Market/MarketAssetCard.jsx";
import MarketSummaryTabs from "./Market/MarketSummaryTabs.jsx";
import Sparkline from "./Market/Sparkline.jsx";
import { getTimeSince } from "@/lib/common";
import { cn } from "@/lib/utils";

function SummaryRow({ icon, label, value, color = "text-foreground/85" }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.015] px-2.5 py-1.5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={cn("text-xs font-mono tabular-nums font-semibold truncate", color)}>
        {value}
      </div>
    </div>
  );
}

export default function Market(properties) {
  const {
    usr,
    assetA,
    assetB,
    assetAData,
    assetADetails,
    assetABitassetData,
    assetBData,
    assetBDetails,
    assetBBitassetData,
    limitOrderFee,
    //
    setAssetA,
    setAssetB,
    //
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _poolsBTS,
    _poolsTEST,
    //
    balances,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);
  // End of init

  const [buyOrders, setBuyOrders] = useState(null);
  const [sellOrders, setSellOrders] = useState(null);

  const [previousBuyOrders, setPreviousBuyOrders] = useState([]);
  const [previousSellOrders, setPreviousSellOrders] = useState([]);

  const [usrBalances, setUsrBalances] = useState(null);
  const [usrLimitOrders, setUsrLimitOrders] = useState(null);
  const [publicMarketHistory, setPublicMarketHistory] = useState(null);
  const [usrHistory, setUsrHistory] = useState(null);
  const [tickerData, setTickerData] = useState(null);

  const [marketItr, setMarketItr] = useState(0);
  const [orderBookItr, setOrderBookItr] = useState(0);

  // style states
  const [activeLimitCard, setActiveLimitCard] = useState("buy");
  const [activeMOC, setActiveMOC] = useState("buy");

  const invertedMarket = useMemo(() => {
    return isInvertedMarket(assetAData.id, assetBData.id);
  }, [assetAData, assetBData]);

  useEffect(() => {
    async function parseURL() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      const _type = params.type;

      let finalType = activeLimitCard;
      if (_type === "buy" || _type === "sell") {
        finalType = _type;
      }

      return {
        finalType,
      };
    }

    parseURL().then(({ finalType }) => {
      if (finalType !== activeLimitCard) {
        setActiveLimitCard(finalType);
      }
    });
  }, []);

  function _resetOrders() {
    setBuyOrders(null);
    setSellOrders(null);
  }

  function _resetMarketData() {
    // If either asset changes then several states need to be erased
    setUsrBalances(null);
    setUsrLimitOrders(null);
    setPublicMarketHistory(null);
    setUsrHistory(null);
    setTickerData(null);
  }

  const marketOrdersStore = useMemo(() => {
    return createMarketOrderStore([usr.chain, assetA, assetB, 50]);
  }, [usr, assetA, assetB, orderBookItr]);

  const {
    data: marketOrdersData,
    loading: marketOrdersLoading,
    error: marketOrdersError,
  } = useStore(marketOrdersStore);

  useEffect(() => {
    if (marketOrdersData && !marketOrdersLoading && !marketOrdersError) {
      setBuyOrders(marketOrdersData.bids);
      setSellOrders(marketOrdersData.asks);
      setPreviousBuyOrders(marketOrdersData.bids);
      setPreviousSellOrders(marketOrdersData.asks);
    } else {
      setBuyOrders(null);
      setSellOrders(null);
    }
  }, [marketOrdersData, marketOrdersLoading, marketOrdersError]);

  // Use the store
  const marketHistoryStore = useMemo(() => {
    return createMarketTradeHistoryStore([
      usr.chain,
      assetAData.id,
      assetBData.id,
      usr.id,
    ]);
  }, [usr, assetAData, assetBData, marketItr]);

  const {
    data: marketHistoryData,
    loading: marketHistoryLoading,
    error: marketHistoryError,
  } = useStore(marketHistoryStore);

  useEffect(() => {
    if (marketHistoryData && !marketHistoryLoading && !marketHistoryError) {
      setUsrBalances(marketHistoryData.balances);
      setUsrLimitOrders(marketHistoryData.accountLimitOrders);
      setPublicMarketHistory(marketHistoryData.marketHistory);
      setUsrHistory(marketHistoryData.usrTrades);
      setTickerData(marketHistoryData.ticker);
    } else {
      setUsrBalances(null);
      setUsrLimitOrders(null);
      setPublicMarketHistory(null);
      setUsrHistory(null);
      setTickerData(null);
    }
  }, [marketHistoryData, marketHistoryLoading, marketHistoryError]);

  const percentChangeNum = parseFloat(
    String(tickerData?.percent_change || "").replace("%", "")
  );
  const isPositiveChange = !isNaN(percentChangeNum) && percentChangeNum >= 0;

  const spreadInfo = useMemo(() => {
    if (
      !tickerData ||
      tickerData.lowest_ask == null ||
      tickerData.highest_bid == null
    )
      return null;
    const ask = parseFloat(tickerData.lowest_ask);
    const bid = parseFloat(tickerData.highest_bid);
    if (!isFinite(ask) || !isFinite(bid) || ask <= 0) return null;
    const diff = ask - bid;
    const pct = (diff / ask) * 100;
    return { abs: diff, pct, ask, bid };
  }, [tickerData]);

  const sparklineData = useMemo(() => {
    if (!publicMarketHistory || publicMarketHistory.length < 2) return [];
    const sorted = [...publicMarketHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recent = sorted.slice(-40);
    return recent.map((trade) => ({
      value: parseFloat(trade.price),
      label: getTimeSince(trade.date),
    }));
  }, [publicMarketHistory]);

  const marketSummaryCard = (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/15 via-cyan-500/3 to-transparent" />
      <div className="relative">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-cyan-200">
              {t("Market:marketSummary")}
            </h3>
            <p className="text-[11px] text-muted-foreground/70 font-mono tabular-nums truncate">
              {activeLimitCard === "buy" ? `${assetA}/${assetB}` : `${assetB}/${assetA}`}
            </p>
          </div>
          {sparklineData.length > 1 ? (
            <Sparkline
              data={sparklineData}
              width={120}
              height={36}
              strokeWidth={1.5}
              className="shrink-0"
            />
          ) : null}
        </div>

        <div className="p-4 space-y-2.5">
          <SummaryRow
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("Market:latestPrice")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.latest, assetAData.precision)
                : "?"
            }
            color="text-amber-300"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:24HrChange")}
            value={tickerData ? tickerData.percent_change : "?"}
            color={
              !tickerData
                ? "text-muted-foreground"
                : isPositiveChange
                ? "text-emerald-300"
                : "text-rose-300"
            }
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:24HrBaseVolume")}
            value={
              !tickerData
                ? "?"
                : activeLimitCard === "buy"
                ? tickerData.base_volume
                : tickerData.quote_volume
            }
            color="text-foreground/85"
          />
          <SummaryRow
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t("Market:24HrQuoteVolume")}
            value={
              !tickerData
                ? "?"
                : activeLimitCard === "buy"
                ? tickerData.quote_volume
                : tickerData.base_volume
            }
            color="text-foreground/85"
          />
          <SummaryRow
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("Market:lowestAsk")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.lowest_ask, assetAData.precision)
                : "?"
            }
            color="text-rose-300"
          />
          <SummaryRow
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("Market:highestBid")}
            value={
              tickerData && assetAData
                ? trimPrice(tickerData.highest_bid, assetAData.precision)
                : "?"
            }
            color="text-emerald-300"
          />
          {spreadInfo ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-white/[0.025] px-2.5 py-2 mt-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <span>Spread</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold">
                <span className="text-foreground/85">
                  {spreadInfo.pct.toFixed(3)}%
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    spreadInfo.pct < 1
                      ? "bg-emerald-500/15 text-emerald-300"
                      : spreadInfo.pct < 5
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-rose-500/15 text-rose-300"
                  )}
                >
                  {spreadInfo.pct < 1 ? "TIGHT" : spreadInfo.pct < 5 ? "NORMAL" : "WIDE"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {usr.chain === "bitshares" ? (
          <div className="border-t border-border/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("Market:externalMarketLinks")}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={
                  activeLimitCard === "buy"
                    ? `https://bts.exchange/#/market/${assetA}_${assetB}`
                    : `https://bts.exchange/#/market/${assetB}_${assetA}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                BTS.Exchange
              </a>
              <a
                href={
                  activeLimitCard === "buy"
                    ? `https://ex.xbts.io/market/${assetA}_${assetB}`
                    : `https://ex.xbts.io/market/${assetB}_${assetA}`
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 hover:bg-accent/60 hover:border-accent/50 dark:hover:border-white/20 px-2.5 py-1.5 text-xs text-foreground/80 hover:text-accent-foreground transition-all"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                XBTS
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1 space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
              >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/15 via-cyan-500/3 to-transparent" />
              <div className="relative flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200">
                      {t("Market:controls")}
                    </h3>
                    <p className="text-[11px] text-muted-foreground/70 font-mono">
                      {usr.chain === "bitshares" ? "Bitshares" : "Bitshares (Testnet)"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4">
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] px-3 py-2">
                  <AssetDropDown
                    assetSymbol={assetA}
                    assetData={assetAData}
                    storeCallback={setAssetA}
                    otherAsset={assetB}
                    marketSearch={marketSearch}
                    type={activeLimitCard === "buy" ? "quote" : "base"}
                    size="small"
                    chain={usr.chain}
                    balances={balances}
                  />
                </div>
                <a
                  href={`/dex/index.html?market=${assetB}_${assetA}`}
                  className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent/40 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all"
                  title="Swap assets"
                >
                  <ArrowLeftRight className="h-4 w-4 text-foreground/70 group-hover:text-cyan-300 group-hover:rotate-180 transition-all duration-300" />
                </a>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2">
                  <AssetDropDown
                    assetSymbol={assetB}
                    assetData={assetBData}
                    storeCallback={setAssetB}
                    otherAsset={assetA}
                    marketSearch={marketSearch}
                    type={activeLimitCard === "sell" ? "quote" : "base"}
                    size="small"
                    chain={usr.chain}
                    balances={balances}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-accent/20 p-1">
              <button
                type="button"
                disabled={!assetAData || !assetBData}
                onClick={() => {
                  if (activeLimitCard === "buy") return;
                  setActiveLimitCard("buy");
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?${new URLSearchParams({
                      ...new URLSearchParams(window.location.search),
                      price: 0,
                      amount: 0,
                    }).toString()}`
                  );
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeLimitCard === "buy"
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-900/30"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-accent/40",
                  (!assetAData || !assetBData) && "opacity-50 cursor-not-allowed"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                {t("Market:buy")}
              </button>
              <button
                type="button"
                disabled={!assetAData || !assetBData}
                onClick={() => {
                  if (activeLimitCard === "sell") return;
                  setActiveLimitCard("sell");
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?${new URLSearchParams({
                      ...new URLSearchParams(window.location.search),
                      price: 0,
                    }).toString()}`
                  );
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                  activeLimitCard === "sell"
                    ? "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-rose-900/30"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-accent/40",
                  (!assetAData || !assetBData) && "opacity-50 cursor-not-allowed"
                )}
              >
                <TrendingDown className="h-4 w-4" />
                {t("Market:sell")}
              </button>
            </div>

            <LimitOrderCard
              usr={usr}
              thisAssetA={assetA}
              thisAssetB={assetB}
              assetAData={assetAData}
              assetBData={assetBData}
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              usrBalances={usrBalances}
              orderType={activeLimitCard}
              key={activeLimitCard}
              marketSearch={marketSearch}
              fee={limitOrderFee}
              invertedMarket={invertedMarket}
            />
          </div>
          <div className="col-span-1">
            <div className="grid grid-cols-1 gap-y-4">
              <div className="flex-grow" style={{ paddingBottom: "0px" }}>
                {assetADetails ? (
                  <MarketAssetCard
                    asset={assetA}
                    assetData={assetAData}
                    assetDetails={assetADetails}
                    bitassetData={assetABitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type={activeLimitCard === "buy" ? "buy" : "sell"}
                    otherAsset={assetB}
                    storeCallback={setAssetA}
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"

                  >
                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-muted-foreground">
                          {activeLimitCard === "buy"
                            ? t("Market:quoteAsset")
                            : t("Market:baseAsset")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("Market:loading")}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-grow">
                {assetBDetails ? (
                  <MarketAssetCard
                    asset={assetB}
                    assetData={assetBData}
                    assetDetails={assetBDetails}
                    bitassetData={assetBBitassetData}
                    marketSearch={marketSearch}
                    chain={usr.chain}
                    usrBalances={usrBalances}
                    type={activeLimitCard === "sell" ? "buy" : "sell"}
                    otherAsset={assetA}
                    storeCallback={setAssetB}
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"

                  >
                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-muted-foreground">
                          {activeLimitCard === "sell"
                            ? t("Market:baseAsset")
                            : t("Market:quoteAsset")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("Market:loading")}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[250px] bg-accent/30 dark:bg-white/[0.05]" />
                        <Skeleton className="h-4 w-[200px] bg-accent/30 dark:bg-white/[0.05]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {tickerData && assetAData && assetBData ? marketSummaryCard : (
                <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/15 via-cyan-500/3 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-cyan-200">
                          {t("Market:marketSummary")}
                        </h3>
                        <p className="text-[11px] text-muted-foreground/70 font-mono">❔/❔</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <SummaryRow icon={<Activity className="h-3.5 w-3.5" />} label={t("Market:latestPrice")} value="❔" color="text-muted-foreground" />
                      <SummaryRow icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("Market:24HrChange")} value="❔" color="text-muted-foreground" />
                      <SummaryRow icon={<Wallet className="h-3.5 w-3.5" />} label={t("Market:24HrBaseVolume")} value="❔" color="text-muted-foreground" />
                      <SummaryRow icon={<Wallet className="h-3.5 w-3.5" />} label={t("Market:24HrQuoteVolume")} value="❔" color="text-muted-foreground" />
                      <SummaryRow icon={<TrendingDown className="h-3.5 w-3.5" />} label={t("Market:lowestAsk")} value="❔" color="text-muted-foreground" />
                      <SummaryRow icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("Market:highestBid")} value="❔" color="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 mt-5">
          {assetAData && assetBData ? (
            <>
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                {buyOrders && !marketOrdersLoading ? (
                  <MarketOrderCard
                    cardType="buy"
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    marketOrders={buyOrders}
                  />
                ) : null}
                {sellOrders && !marketOrdersLoading ? (
                  <MarketOrderCard
                    cardType="sell"
                    assetA={assetA}
                    assetAData={assetAData}
                    assetB={assetB}
                    assetBData={assetBData}
                    marketOrders={sellOrders}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {assetA && assetB ? (
          <MarketSummaryTabs
            activeLimitCard={activeLimitCard}
            assetAData={assetAData}
            assetBData={assetBData}
            usr={usr}
            marketItr={marketItr}
            setMarketItr={setMarketItr}
            usrLimitOrders={usrLimitOrders}
            publicMarketHistory={publicMarketHistory}
            usrHistory={usrHistory}
            _resetMarketData={_resetMarketData}
          />
        ) : null}
      </div>
    </>
  );
}
