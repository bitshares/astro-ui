import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import Fuse from "fuse.js";
import { useStore } from "@nanostores/react";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { HandCoins, User, Coins, Tag, Activity } from "lucide-react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";



import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { debounce } from "@/lib/common.js";
import { getFlagBooleans } from "@/lib/common.js";
import { humanReadableFloat } from "@/lib/common.js";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createSmartcoinsStore } from "@/nanoeffects/Smartcoins.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

export default function Smartcoins(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const [usrBalances, setUsrBalances] = useState();
  const [newBitassetData, setNewBitassetdata] = useState([]);
  const [baseAssetData, setBaseAssetData] = useState([]);
  const [assetIssuers, setAssetIssuers] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createSmartcoinsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          if (data._assets) {
            setBaseAssetData(data._assets);
          }
          if (data._issuers) {
            setAssetIssuers(data._issuers);
          }
          if (data._smartcoins) {
            const filteredSmartcoins = data._smartcoins.filter(
              (x) =>
                parseInt(x.current_feed.settlement_price.base.amount) !== 0 &&
                parseInt(x.current_feed.settlement_price.quote.amount) !== 0 &&
                x.feeds.length &&
                (parseInt(x.settlement_price.base.amount) === 0 ||
                  parseInt(x.settlement_price.quote.amount) === 0 ||
                  parseInt(x.settlement_fund) === 0)
            );
            setNewBitassetdata(filteredSmartcoins);
          }
          if (data._balances) {
            setUsrBalances(data._balances);
          }
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      fetching();
    }
  }, [usr, currentNode]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const dynamicIDs = newBitassetData
        .map((x) => baseAssetData.find((y) => y.id === x.asset_id))
        .map((a) => a.dynamic_asset_data_id);

      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(dynamicIDs),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const finalDynamicData = data.map((x) => {
            return {
              ...x,
              asset_id: baseAssetData.find(
                (b) => b.dynamic_asset_data_id === x.id
              ).id,
            };
          });
          setDynamicData(finalDynamicData);
        }
      });
    }

    if (newBitassetData) {
      fetching();
    }
  }, [newBitassetData, baseAssetData]);

  const compatibleSmartcoins = useMemo(() => {
    if (usrBalances && newBitassetData) {
      const _smartcoins = newBitassetData.filter((bitasset) => {
        const collateralAssetBalance = usrBalances.find(
          (x) => x.asset_id === bitasset.options.short_backing_asset
        );

        return !collateralAssetBalance ||
          (collateralAssetBalance && !collateralAssetBalance.amount > 0)
          ? false
          : true;
      });

      return _smartcoins;
    }
  }, [usrBalances, newBitassetData]);

  const heldSmartcoins = useMemo(() => {
    if (usrBalances && newBitassetData) {
      const _smartcoins = newBitassetData.filter((bitasset) => {
        const debtAssetBalance = usrBalances.find(
          (x) => x.asset_id === bitasset.asset_id
        );

        return debtAssetBalance ? true : false;
      });

      return _smartcoins;
    }
  }, [usrBalances, newBitassetData]);

  const [activeTab, setActiveTab] = useState("all");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [mode, setMode] = useState("bitassets");

  const assetSearch = useMemo(() => {
    if (
      !newBitassetData ||
      !newBitassetData.length ||
      !baseAssetData ||
      !assetIssuers
    ) {
      return;
    }

    const updatedBitassetData = newBitassetData.map((bitasset) => {
      const _asset = baseAssetData.find((x) => x.id === bitasset.asset_id);
      const issuerAccount = assetIssuers.find((x) => x.id === _asset.issuer);
      const thisCollateralAssetData = baseAssetData.find(
        (x) => x.id === bitasset.options.short_backing_asset
      );

      return {
        ...bitasset,
        offer_symbol: _asset ? _asset.symbol : "",
        collateral_symbol: thisCollateralAssetData
          ? thisCollateralAssetData.symbol
          : "",
        issuerAccount: issuerAccount ? issuerAccount.name : "",
      };
    });

    let keys;
    if (activeSearch === "borrow") {
      keys = ["offer_symbol", "asset_id"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbol", "collateral"];
    } else if (activeSearch === "issuer") {
      keys = ["issuerAccount"];
    }

    return new Fuse(updatedBitassetData, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [newBitassetData, activeSearch]);

  const [thisInput, setThisInput] = useState();
  const [thisSearchInput, setThisSearchInput] = useState();
  const [thisResult, setThisResult] = useState();

  useEffect(() => {
    if (assetSearch && thisInput) {
      const result = assetSearch.search(thisInput);
      setThisResult(result);
    }
  }, [assetSearch, thisInput]);

  const debouncedSetSearchInput = useCallback(
    // Throttle slider
    debounce((event) => {
      setThisInput(event.target.value);
      window.history.replaceState(
        {},
        "",
        `?tab=search&searchTab=${activeSearch}&searchText=${event.target.value}`
      );
    }, 500),
    []
  );

  const relevantBitassetData = useMemo(() => {
    if (
      !baseAssetData ||
      !baseAssetData.length ||
      !assetIssuers ||
      !assetIssuers.length ||
      !newBitassetData ||
      !newBitassetData.length
    ) {
      return [];
    }

    let result = [];
    if (newBitassetData && activeTab === "all") {
      result = newBitassetData.filter((x) => x.feeds?.length > 0);
    } else if (compatibleSmartcoins && activeTab === "compatible") {
      result = compatibleSmartcoins.filter((x) => x.feeds?.length > 0);
    } else if (heldSmartcoins && activeTab === "holdings") {
      result = heldSmartcoins.filter((x) => x.feeds?.length > 0);
    } else {
      result = newBitassetData;
    }

    result = result.sort(
      (a, b) =>
        parseInt(b.asset_id.replace("1.3.", "")) -
        parseInt(a.asset_id.replace("1.3.", ""))
    );
    result = result.filter((x) => {
      if (x.bitasset_data_id) {
        const desc = x.options?.description || "";
        if (desc.includes("condition") && desc.includes("expiry")) {
          return false;
        }
      }
      return true;
    });

    return result.filter((x) => {
      const _assetData = baseAssetData.find((y) => y.id === x.asset_id);
      const _issuerData = _assetData
        ? assetIssuers.find((z) => z.id === _assetData.issuer)
        : null;

      if (mode === "bitassets") {
        return _issuerData.name === "committee-account";
      } else if (mode === "honest") {
        return _issuerData.name === "honest-quorum";
      } else if (mode === "privateSmartcoins") {
        return (
          _issuerData.name !== "committee-account" &&
          _issuerData.name !== "honest-quorum"
        );
      }
    });
  }, [
    newBitassetData,
    baseAssetData,
    assetIssuers,
    compatibleSmartcoins,
    heldSmartcoins,
    activeTab,
    mode,
  ]);

  function CommonRow({ index, style, bitasset }) {
    if (!bitasset || !baseAssetData || !baseAssetData.length) {
      return null;
    }

    const thisBitassetData = baseAssetData.find(
      (x) => x.id === bitasset.asset_id
    );
    const thisCollateralAssetData = baseAssetData.find(
      (x) => x.id === bitasset.options.short_backing_asset
    );
    const issuer = assetIssuers.find((x) => x.id === thisBitassetData.issuer);

    if (!thisBitassetData || !thisCollateralAssetData || !issuer) {
      return null;
    }

    const _flags = getFlagBooleans(thisBitassetData.options.flags);
    const _issuer_permissions = getFlagBooleans(
      thisBitassetData.options.issuer_permissions
    );

    const foundDynamicData = dynamicData.find(
      (x) => x.asset_id === thisBitassetData.id
    );
    let currentSupply = foundDynamicData
      ? humanReadableFloat(
          parseInt(foundDynamicData.current_supply),
          thisBitassetData.precision
        )
      : 0;

    const _price = parseFloat(
      (
        humanReadableFloat(
          parseInt(bitasset.current_feed.settlement_price.quote.amount),
          thisCollateralAssetData.precision
        ) /
        humanReadableFloat(
          parseInt(bitasset.current_feed.settlement_price.base.amount),
          thisBitassetData.precision
        )
      ).toFixed(thisCollateralAssetData.precision)
    );

    return (
      <div style={{ ...style }} key={`acard-${bitasset.asset_id}`}>
        <div className="ml-2 mr-2 overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm shadow-[0_0_20px_-5px] shadow-[color:hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[0_0_25px_-5px] shadow-[color:hsl(var(--accent-1)/0.15)] transition-all duration-300">
          <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.4)] to-transparent" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">
                <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">
                  {thisBitassetData.symbol}
                </span>
                <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                  ({thisBitassetData.id})
                </span>
              </h3>
              {_price > 0 ? (
                <a href={`/smartcoin/index.html?id=${bitasset.asset_id}`} className="shrink-0">
                  <Button className="h-7 px-3 text-xs bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_10px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 font-semibold hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[0_0_18px_-3px] hover:shadow-[color:hsl(var(--accent-1)/0.6)] active:scale-95 transition-all duration-200 cursor-pointer">
                    {t("Smartcoins:proceedToBorrow", { asset: thisBitassetData.s })}
                  </Button>
                </a>
              ) : (
                <Button disabled className="h-7 px-3 text-xs shrink-0">
                  {t("Smartcoins:proceedToBorrow", { asset: thisBitassetData.s })}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              {issuer ? (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[hsl(var(--accent-1-fg)/0.7)]" />
                  <span>{t("Smartcoins:createdBy")}</span>
                  <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent font-semibold">{issuer.name}</span>
                  <span className="text-xs text-muted-foreground/40">({issuer.id})</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-[hsl(var(--accent-2-fg)/0.7)]" />
                <span>{t("Smartcoins:collateral")}:</span>
                <span className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent font-semibold">{thisCollateralAssetData.symbol}</span>
                <span className="text-xs text-muted-foreground/40">({thisCollateralAssetData.id})</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
                <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
                MCR {bitasset.current_feed.maintenance_collateral_ratio / 10}
              </Badge>
              <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
                <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
                MSSR {bitasset.current_feed.maximum_short_squeeze_ratio / 10}
              </Badge>
              <Badge variant="outline" className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] text-xs">
                <Tag className="h-3 w-3 mr-1 text-[hsl(var(--accent-1-fg)/0.7)]" />
                ICR {bitasset.current_feed.initial_collateral_ratio / 10}
              </Badge>
              <Badge variant="outline" className="border-[hsl(var(--accent-2)/0.2)] bg-[hsl(var(--accent-2)/0.05)] text-xs">
                <Activity className="h-3 w-3 mr-1 text-[hsl(var(--accent-2-fg)/0.7)]" />
                {t("Smartcoins:feedQty", { qty: bitasset.feeds?.length ?? 0 })}
              </Badge>
              {_issuer_permissions && Object.keys(_issuer_permissions).length > 0 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge variant="outline" className="border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.05)] text-xs cursor-pointer hover:bg-[hsl(var(--accent-3)/0.1)] transition-colors">
                      {t("Common:permissions")}: {Object.keys(_issuer_permissions).length}
                      <QuestionMarkCircledIcon className="ml-1 h-3 w-3" />
                    </Badge>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>{t("Common:permissions")}</DialogTitle>
                      <DialogDescription className="text-foreground">
                        {Object.keys(_issuer_permissions).join(", ")}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              ) : (
                <Badge variant="outline" className="border-[hsl(var(--accent-3)/0.2)] bg-[hsl(var(--accent-3)/0.05)] text-xs">
                  {t("Common:permissions")}: 0
                </Badge>
              )}
              {_flags && Object.keys(_flags).length > 0 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge variant="outline" className="border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.05)] text-xs cursor-pointer hover:bg-[hsl(var(--accent-warning)/0.1)] transition-colors">
                      {t("Common:flags")}: {Object.keys(_flags).length}
                      <QuestionMarkCircledIcon className="ml-1 h-3 w-3" />
                    </Badge>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle>{t("Common:flags")}</DialogTitle>
                      <DialogDescription className="text-foreground">
                        {Object.keys(_flags).join(", ")}
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              ) : (
                <Badge variant="outline" className="border-[hsl(var(--accent-warning)/0.2)] bg-[hsl(var(--accent-warning)/0.05)] text-xs">
                  {t("Common:flags")}: 0
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const BitassetRow = ({ index, style }) => {
    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={relevantBitassetData[index]}
      />
    );
  };

  const SearchRow = ({ index, style }) => {
    return (
      <CommonRow
        index={index}
        style={style}
        bitasset={thisResult[index].item}
      />
    );
  };

  useEffect(() => {
    if (assetSearch) {
      //console.log("Parsing url params");
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      if (params && params.tab) {
        if (!["all", "compatible", "holdings", "search"].includes(params.tab)) {
          return;
        }
        setActiveTab(params.tab);
      } else {
        window.history.replaceState({}, "", `?tab=all`);
      }
      if (params && params.searchTab) {
        if (!["borrow", "collateral", "issuer"].includes(params.searchTab)) {
          return;
        }
        setActiveSearch(params.searchTab);
      }
      if (params && params.searchText) {
        const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);
        if (!isValid(params.searchText)) {
          return;
        }
        setThisInput(params.searchText);
      }
    }
  }, [assetSearch]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_0_40px_-8px] shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
            <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))]">
                  <HandCoins className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">
                    {t("Smartcoins:selectBorrowableAsset")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("Smartcoins:smartcoinDescription")}
                  </p>
                </div>
              </div>
              <div className="w-full">
                <div className="grid w-full grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  <Button
                    className={activeTab === "all" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "all" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "all") {
                        setActiveTab("all");
                        window.history.replaceState({}, "", `?tab=all`);
                      }
                    }}
                  >
                    {activeTab === "all"
                      ? t("Smartcoins:viewingAllAssets")
                      : t("Smartcoins:viewAllAssets")}
                  </Button>
                  <Button
                    className={activeTab === "compatible" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "compatible" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "compatible") {
                        setActiveTab("compatible");
                        window.history.replaceState({}, "", `?tab=compatible`);
                      }
                    }}
                  >
                    {activeTab === "compatible"
                      ? t("Smartcoins:viewingCompatible")
                      : t("Smartcoins:viewCompatible")}
                  </Button>
                  <Button
                    className={activeTab === "holdings" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "holdings" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "holdings") {
                        setActiveTab("holdings");
                        window.history.replaceState({}, "", `?tab=holdings`);
                      }
                    }}
                  >
                    {activeTab === "holdings"
                      ? t("Smartcoins:viewingHoldings")
                      : t("Smartcoins:viewHoldings")}
                  </Button>
                  <Button
                    className={activeTab === "search" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}
                    variant={activeTab === "search" ? undefined : "outline"}
                    onClick={() => {
                      if (activeTab !== "search") {
                        setActiveTab("search");
                        window.history.replaceState(
                          {},
                          "",
                          `?tab=search&searchTab=borrow`
                        );
                      }
                    }}
                  >
                    {activeTab === "search"
                      ? t("Smartcoins:searching")
                      : t("Smartcoins:search")}
                  </Button>
                </div>

                <div className="my-4 mb-3 mt-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent" />

                {activeTab === "all" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 md:mb-3 md:ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 md:mb-3 md:ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 md:mb-3 md:mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingAllSmartcoins", {
                        count: relevantBitassetData.length,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={relevantBitassetData.length}
                            rowHeight={130}
                            rowProps={{}}
                          />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={relevantBitassetData.length}
                            rowHeight={165}
                            rowProps={{}}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "compatible" && (
                  <>
                    <div className="grid grid-cols-3 gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 mb-3 mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingCompatibleSmartcoins", {
                        count: relevantBitassetData.length,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={relevantBitassetData.length}
                            rowHeight={130}
                            rowProps={{}}
                          />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={relevantBitassetData.length}
                            rowHeight={165}
                            rowProps={{}}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "holdings" && (
                  <>
                    <div className="grid grid-cols-3 gap-5">
                      <Button
                        onClick={() => {
                          setMode("bitassets");
                        }}
                        variant={`${mode === "bitassets" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "bitassets" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:bitassets")}
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("honest");
                        }}
                        variant={`${mode === "honest" ? "" : "outline"}`}
                        className={`h-6 mb-3 ml-2 ${mode === "honest" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        Honest™️ Smartcoins
                      </Button>
                      <Button
                        onClick={() => {
                          setMode("privateSmartcoins");
                        }}
                        variant={`${
                          mode === "privateSmartcoins" ? "" : "outline"
                        }`}
                        className={`h-6 mb-3 mr-2 ${mode === "privateSmartcoins" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0" : ""}`}
                      >
                        {t("Smartcoins:privateSmartcoins")}
                      </Button>
                    </div>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:listingHeldSmartcoins", {
                        count: relevantBitassetData
                          ? relevantBitassetData.length
                          : 0,
                      })}
                    </h5>
                    {!assetIssuers || !assetIssuers.length ? (
                      <div className="text-center mt-5">
                        {t("CreditBorrow:common.loading")}
                      </div>
                    ) : (
                      <div className="w-full max-h-[600px] overflow-auto">
                        <div className="hidden md:block">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={
                              relevantBitassetData
                                ? relevantBitassetData.length
                                : 0
                            }
                            rowHeight={130}
                            rowProps={{}}
                          />
                        </div>
                        <div className="block md:hidden">
                          <List
                            rowComponent={BitassetRow}
                            rowCount={
                              relevantBitassetData
                                ? relevantBitassetData.length
                                : 0
                            }
                            rowHeight={165}
                            rowProps={{}}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === "search" && (
                  <>
                    <h5 className="mb-2 text-center">
                      {t("Smartcoins:howToSearch")}
                    </h5>{" "}
                    <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        className={activeSearch === "borrow" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "borrow" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "borrow") {
                            setActiveSearch("borrow");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=borrow`
                            );
                          }
                        }}
                      >
                        {activeSearch === "borrow"
                          ? t("Smartcoins:searchingByBorrowable")
                          : t("Smartcoins:searchByBorrowable")}
                      </Button>
                      <Button
                        className={activeSearch === "collateral" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "collateral" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "collateral") {
                            setActiveSearch("collateral");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=collateral`
                            );
                          }
                        }}
                      >
                        {activeSearch === "collateral"
                          ? t("Smartcoins:searchingByCollateral")
                          : t("Smartcoins:searchByCollateral")}
                      </Button>
                      <Button
                        className={activeSearch === "issuer" ? "bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-white shadow-[0_0_15px_-3px] shadow-[color:hsl(var(--accent-1)/0.4)] border-0 h-6" : "h-6"}
                        variant={
                          activeSearch === "issuer" ? undefined : "outline"
                        }
                        onClick={() => {
                          if (activeSearch !== "issuer") {
                            setActiveSearch("issuer");
                            window.history.replaceState(
                              {},
                              "",
                              `?tab=search&searchTab=issuer`
                            );
                          }
                        }}
                      >
                        {activeSearch === "issuer"
                          ? t("Smartcoins:searchingByIssuer")
                          : t("Smartcoins:searchByIssuer")}
                      </Button>
                    </div>
                    <Input
                      name="searchInput"
                      placeholder={
                        thisSearchInput ?? t("Smartcoins:enterSearchText")
                      }
                      className="mb-3 mt-3 w-full border-[hsl(var(--accent-1)/0.2)] bg-card/60"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />
                    {["borrow", "collateral", "issuer"].includes(
                      activeSearch
                    ) && (
                      <>
                        {thisResult && thisResult.length ? (
                          <div className="w-full max-h-[600px] overflow-auto">
                            <div className="hidden md:block">
                              <List
                                rowComponent={SearchRow}
                                rowCount={thisResult.length}
                                rowHeight={130}
                                rowProps={{}}
                              />
                            </div>
                            <div className="block md:hidden">
                              <List
                                rowComponent={SearchRow}
                                rowCount={thisResult.length}
                                rowHeight={165}
                                rowProps={{}}
                              />
                            </div>
                          </div>
                        ) : null}
                        {thisInput && thisResult && !thisResult.length ? (
                          <>{t("Smartcoins:noResultsFound")}</>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
