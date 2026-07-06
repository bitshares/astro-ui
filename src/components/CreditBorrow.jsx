import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import Fuse from "fuse.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import {
  HandCoins,
  Search,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Star,
  StarOff,
  Ban,
} from "lucide-react";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar } from "./Avatar.tsx";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createCreditOfferStore } from "@/nanoeffects/CreditOffers.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import {
  $blockList,
  $userBlockList,
  addBlockedUser,
} from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
} from "@/stores/favourites.ts";

import { humanReadableFloat, debounce } from "@/lib/common.js";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

const isValid = (str) => /^[a-zA-Z0-9.-]+$/.test(str);

export default function CreditBorrow(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const currentNode = useStore($currentNode);
  const favouriteUsers = useStore($favouriteUsers)[usr?.chain ?? "bitshares"] ?? [];
  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );
  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) return [];
    return userBlockList[usr?.chain ?? "bitshares"] ?? [];
  }, [userBlockList, usr]);

  const { _assetsBTS, _assetsTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [allOffers, setAllOffers] = useState([]);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    async function fetchCreditOffers() {
      const creditOfferStore = createCreditOfferStore([
        _chain,
        currentNode ? currentNode.url : null,
      ]);

      creditOfferStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setAllOffers(data);
        }
      });
    }

    fetchCreditOffers();
  }, [_chain, currentNode]);

  const offers = useMemo(() => {
    if (_chain && allOffers && allOffers.length) {
      let currentOffers = allOffers;

      if (!showExpired) {
        currentOffers = currentOffers.filter(
          (x) => hoursTillExpiration(x.auto_disable_time) >= 0
        );
      }

      if (_chain === "bitshares" && blocklist && blocklist.users) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !blocklist.users.includes(
              toHex(sha256(utf8ToBytes(offer.owner_account)))
            )
        );
      }

      if (chainUserBlockList && chainUserBlockList.length) {
        currentOffers = currentOffers.filter(
          (offer) =>
            !chainUserBlockList.some((u) => u.id === offer.owner_account)
        );
      }

      return currentOffers;
    }
    return [];
  }, [allOffers, _chain, blocklist, chainUserBlockList, showExpired]);

  const [activeTab, setActiveTab] = useState("allOffers");
  const [activeSearch, setActiveSearch] = useState("borrow");
  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();

  const [usrBalances, setUsrBalances] = useState();
  const [balanceAssetIDs, setBalanceAssetIDs] = useState([]);
  useEffect(() => {
    async function fetchUserBalances() {
      if (usr && usr.id) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );

            setBalanceAssetIDs(filteredData.map((x) => x.asset_id));
            setUsrBalances(filteredData);
          }
        });
      }
    }

    fetchUserBalances();
  }, [usr]);

  const compatibleOffers = useMemo(() => {
    if (!offers || !balanceAssetIDs) return [];

    return offers.filter((offer) => {
      return offer.acceptable_collateral.some((x) => {
        return balanceAssetIDs.includes(x[0]);
      });
    });
  }, [offers, balanceAssetIDs]);

  const offerSearch = useMemo(() => {
    if (!offers || !offers.length || !assets || !assets.length) {
      return;
    }

    let adjustedOffers = [];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      if (!offer) {
        continue;
      }
      if (offer.acceptable_collateral) {
        offer["collateral_symbols"] = offer.acceptable_collateral
          .map((asset) => {
            const searched = assets.find((x) => x.id === asset[0]);
            return searched?.symbol;
          })
          .filter((x) => x);
      }
      offer["offer_symbols"] = [
        assets.find((x) => x.id === offer.asset_type).symbol,
      ];
      adjustedOffers.push(offer);
    }

    let keys = [];
    if (activeSearch === "borrow") {
      keys = ["offer_symbols"];
    } else if (activeSearch === "collateral") {
      keys = ["collateral_symbols"];
    } else if (activeSearch === "owner_name") {
      keys = ["owner_name"];
    }
    return new Fuse(offers, {
      includeScore: true,
      threshold: 0.2,
      keys: keys,
    });
  }, [offers, assets, activeSearch]);

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    let finalTab = "";
    let finalSearchTab = "";
    let searchInput = "";
    let finalURL = "?";
    if (
      params &&
      params.tab &&
      ["allOffers", "availableOffers", "searchOffers"].includes(params.tab)
    ) {
      finalTab = params.tab;
      finalURL += `tab=${params.tab}`;
    } else {
      finalTab = "allOffers";
      finalURL += "tab=allOffers";
    }

    if (
      params &&
      params.tab &&
      params.tab === "searchOffers" &&
      params.searchTab
    ) {
      if (["borrow", "collateral", "owner_name"].includes(params.searchTab)) {
        finalSearchTab = params.searchTab;
        finalURL += `&searchTab=${params.searchTab}`;
      } else {
        finalSearchTab = "borrow";
        finalURL += "&searchTab=borrow";
      }
    }

    if (
      params &&
      params.tab &&
      params.searchTab &&
      params.tab === "searchOffers" &&
      params.searchText &&
      params.searchText.length
    ) {
      if (isValid(params.searchText)) {
        searchInput = params.searchText;
        finalURL += `&searchText=${params.searchText}`;
      } else {
        searchInput = "";
        finalURL += "&searchText=bts";
      }
    }

    setActiveTab(finalTab);
    setActiveSearch(finalSearchTab);
    setThisInput(searchInput);
    window.history.replaceState({}, "", finalURL);
  }, []);

  useEffect(() => {
    if (offerSearch && thisInput) {
      if (!isValid(thisInput)) {
        return;
      }
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch ?? "borrow"}${
          thisInput ? `&searchText=${thisInput}` : ""
        }`
      );
      const result = offerSearch.search(thisInput);
      setThisResult(result);
    }
  }, [offerSearch, thisInput]);

  function CommonRow({ index, style, res, foundAsset }) {
    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="mx-2 mb-2 rounded-xl border border-emerald-500/15 bg-card/60 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] hover:shadow-md hover:shadow-emerald-500/5 transition-all">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:text-emerald-200 text-emerald-700 flex-shrink-0">
                  <HandCoins className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {t("CreditBorrow:common.offer")} #{res.id.replace("1.21.", "")}
                  </h3>
                  <Badge variant="outline" className="gap-1.5 border-emerald-400/30 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <Avatar
                            size={16}
                            name={res.owner_name}
                            extra="offer-owner"
                            expression={{ eye: "normal", mouth: "smile" }}
                          />
                          <span className="truncate max-w-[120px]">{res.owner_name}</span>
                          <span className="text-muted-foreground/50 text-[10px] flex-shrink-0">
                            ({res.owner_account})
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          onClick={() => {
                            const chain = usr?.chain ?? "bitshares";
                            const isFav = favouriteUsers.some(
                              (u) => u.id === res.owner_account
                            );
                            if (isFav) {
                              removeFavouriteUser(chain, {
                                name: res.owner_name,
                                id: res.owner_account,
                              });
                            } else {
                              addFavouriteUser(chain, {
                                name: res.owner_name,
                                id: res.owner_account,
                              });
                            }
                          }}
                        >
                          {favouriteUsers.some((u) => u.id === res.owner_account) ? (
                            <StarOff className="h-4 w-4 mr-2" />
                          ) : (
                            <Star className="h-4 w-4 mr-2" />
                          )}
                          {favouriteUsers.some((u) => u.id === res.owner_account)
                            ? t("CreditBorrow:card.unfavouriteAccount")
                            : t("CreditBorrow:card.favouriteAccount")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (chainUserBlockList.some((u) => u.id === res.owner_account)) {
                              return;
                            }
                            const chain = usr?.chain ?? "bitshares";
                            addBlockedUser(chain, {
                              name: res.owner_name,
                              id: res.owner_account,
                            });
                          }}
                          disabled={chainUserBlockList.some((u) => u.id === res.owner_account)}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          {chainUserBlockList.some((u) => u.id === res.owner_account)
                            ? t("CreditBorrow:card.alreadyBlocked")
                            : t("CreditBorrow:card.blockAccount")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Badge>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 text-[10px] border-emerald-400/30 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700 flex-shrink-0">
                <Clock className="h-3 w-3" />
                {hoursTillExpiration(res.auto_disable_time)}h
              </Badge>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/40 p-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {t("CreditBorrow:common.offering")}
                  </div>
                  <div className="font-mono text-sm tabular-nums dark:text-emerald-100/90 text-emerald-700">
                    {humanReadableFloat(res.current_balance, foundAsset.precision)} {foundAsset.symbol}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {t("CreditBorrow:common.accepting")}
                  </div>
                  <div className="font-mono text-sm tabular-nums text-foreground/85">
                    {assets && assets.length
                      ? res.acceptable_collateral
                          .map((asset) => asset[0])
                          .map((x) => assets.find((y) => y.id === x)?.symbol)
                          .filter((x) => x)
                          .map((x, index, array) => (
                            <span key={`${x}-${index}`}>
                              {x}
                              {index < array.length - 1 && ", "}
                            </span>
                          ))
                      : t("CreditBorrow:common.loading")}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("CreditBorrow:common.fee", { fee: "" })}
                </div>
                <div className="font-mono text-xs tabular-nums dark:text-emerald-100/90 text-emerald-700">
                  {(res.fee_rate / 10000).toFixed(2)}%
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("CreditBorrow:common.repayPeriod", { repayPeriod: "" })}
                </div>
                <div className="font-mono text-xs tabular-nums text-foreground/85">
                  {(res.max_duration_seconds / 60 / 60).toFixed(
                    res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                  )}h
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("CreditBorrow:common.min", { amount: "", asset: "" })}
                </div>
                <div className="font-mono text-xs tabular-nums text-foreground/85">
                  {humanReadableFloat(res.min_deal_amount, foundAsset.precision)} {foundAsset.symbol}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                  {t("CreditBorrow:common.validity", { validity: "" })}
                </div>
                <div className="font-mono text-xs tabular-nums text-foreground/85">
                  {hoursTillExpiration(res.auto_disable_time)}h
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href={`/offer/index.html?id=${res.id}`} className="flex-1">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-0 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] transition-all">
                  {t("CreditBorrow:common.proceed", {
                    offerID: res.id.replace("1.21.", ""),
                  })}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
              <a href={`/lend/index.html?id=${res.id}`}>
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
                  {t(
                    `CreditBorrow:common.${
                      usr.id === res.owner_account ? "edit" : "view"
                    }`,
                    {
                      offerID: res.id.replace("1.21.", ""),
                    }
                  )}
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const BalanceRow = ({ index, style }) => {
    let res = compatibleOffers[index];
    const foundAsset = assets.find((x) => x.id === res.asset_type);
    if (!res || !foundAsset) {
      return null;
    }
    return (
      <CommonRow index={index} style={style} res={res} foundAsset={foundAsset} />
    );
  };

  const OfferRow = ({ index, style }) => {
    let res = offers[index];
    const foundAsset = assets.find((x) => x.id === res.asset_type);
    if (!res || !foundAsset) {
      return null;
    }
    return (
      <CommonRow index={index} style={style} res={res} foundAsset={foundAsset} />
    );
  };

  const SearchRow = ({ index, style }) => {
    let res = thisResult[index].item;
    const foundAsset = assets.find((x) => x.id === res.asset_type);
    if (!res || !foundAsset) {
      return null;
    }
    return (
      <CommonRow index={index} style={style} res={res} foundAsset={foundAsset} />
    );
  };

  const [thisSearchInput, setThisSearchInput] = useState();

  const debouncedSetSearchInput = useCallback(
    debounce((event) => {
      setThisInput(event.target.value);
      window.history.replaceState(
        {},
        "",
        `?tab=searchOffers&searchTab=${activeSearch}&searchText=${event.target.value}`
      );
    }, 500),
    []
  );

  const tabs = [
    { id: "allOffers", label: t("CreditBorrow:card.viewAll"), activeLabel: t("CreditBorrow:card.viewingAll"), icon: Sparkles },
    { id: "availableOffers", label: t("CreditBorrow:card.viewAvailable"), activeLabel: t("CreditBorrow:card.viewingAvailable"), icon: ShieldCheck },
    { id: "searchOffers", label: t("CreditBorrow:card.viewSearch"), activeLabel: t("CreditBorrow:card.viewingSearch"), icon: Search },
  ];

  const searchTabs = [
    { id: "borrow", label: t("CreditBorrow:card.borrowSearch"), activeLabel: t("CreditBorrow:card.borrowSearching") },
    { id: "collateral", label: t("CreditBorrow:card.collateralSearch"), activeLabel: t("CreditBorrow:card.collateralSearching") },
    { id: "owner_name", label: t("CreditBorrow:card.ownerSearch"), activeLabel: t("CreditBorrow:card.ownerSearching") },
  ];

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-emerald-950/20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl"
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:text-emerald-200 text-emerald-700">
                <HandCoins className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("CreditBorrow:card.title")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("CreditBorrow:card.description")}
                </p>
              </div>
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}
                    onClick={() => setShowExpired(!showExpired)}
                    className={cn(
                      "h-9 w-9 rounded-xl border transition-all",
                      showExpired
                        ? "border-emerald-400/40 bg-emerald-500/15 dark:text-emerald-200 text-emerald-700"
                        : "border-border bg-card/60 text-muted-foreground hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                    )}
                  >
                    {showExpired ? <EyeOpenIcon className="h-4 w-4" /> : <EyeClosedIcon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border text-foreground/85">
                  <p>{showExpired ? t("CreditBorrow:card.hideExpired") : t("CreditBorrow:card.showExpired")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {allOffers && allOffers.length ? (
            <>
              <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-5">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (activeTab !== tab.id) {
                          setActiveTab(tab.id);
                          window.history.replaceState(
                            {},
                            "",
                            `?tab=${tab.id}`
                          );
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5",
                        active
                          ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:text-emerald-100 text-emerald-700 border border-emerald-400/40 shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                          : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {active ? tab.activeLabel : tab.label}
                    </Button>
                  );
                })}
              </div>

              {activeTab === "allOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Sparkles className="h-3.5 w-3.5 dark:text-emerald-200/70 text-emerald-600/80" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-emerald-200/70 text-emerald-600/80">
                      {t("CreditBorrow:card.allOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {offers.length} {offers.length === 1 ? "offer" : "offers"}
                    </span>
                  </div>
                  {assets && offers && offers.length ? (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <span className="hidden md:block">
                        <List
                          rowComponent={OfferRow}
                          rowCount={offers.length}
                          rowHeight={330}
                          rowProps={{}}
                        />
                      </span>
                      <span className="block md:hidden">
                        <List
                          rowComponent={OfferRow}
                          rowCount={offers.length}
                          rowHeight={380}
                          rowProps={{}}
                        />
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "availableOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <ShieldCheck className="h-3.5 w-3.5 dark:text-emerald-200/70 text-emerald-600/80" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-emerald-200/70 text-emerald-600/80">
                      {t("CreditBorrow:card.availableOffers")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <span className="text-xs text-muted-foreground">
                      {compatibleOffers.length} compatible
                    </span>
                  </div>
                  {assets && compatibleOffers && compatibleOffers.length ? (
                    <div className="w-full max-h-[500px] overflow-auto">
                      <span className="hidden md:block">
                        <List
                          rowComponent={BalanceRow}
                          rowCount={compatibleOffers.length}
                          rowHeight={330}
                          rowProps={{}}
                        />
                      </span>
                      <span className="block md:hidden">
                        <List
                          rowComponent={BalanceRow}
                          rowCount={compatibleOffers.length}
                          rowHeight={380}
                          rowProps={{}}
                        />
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t("CreditBorrow:card.noCompatibleOffers")}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "searchOffers" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Search className="h-3.5 w-3.5 dark:text-emerald-200/70 text-emerald-600/80" />
                    <span className="text-xs font-medium uppercase tracking-wider dark:text-emerald-200/70 text-emerald-600/80">
                      {t("CreditBorrow:card.searchPrompt")}
                    </span>
                  </div>

                  <div className="inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 mb-3">
                    {searchTabs.map((tab) => {
                      const active = activeSearch === tab.id;
                      return (
                        <Button
                          key={tab.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (activeSearch !== tab.id) {
                              setActiveSearch(tab.id);
                              window.history.replaceState(
                                {},
                                "",
                                `?tab=searchOffers&searchTab=${tab.id}${
                                  thisInput ? `&searchText=${thisInput}` : ""
                                }`
                              );
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            active
                              ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:text-emerald-100 text-emerald-700 border border-emerald-400/40 shadow-[0_0_18px_-8px_rgba(16,185,129,0.6)]"
                              : "text-muted-foreground hover:text-accent-foreground/90 hover:bg-accent/40 border border-transparent"
                          )}
                        >
                          {active ? tab.activeLabel : tab.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      name="searchInput"
                      placeholder={thisSearchInput ?? t("Smartcoins:enterSearchText")}
                      className="pl-9 bg-card/40 border-border focus-visible:ring-emerald-400/40 focus-visible:border-emerald-400/50"
                      value={thisSearchInput || ""}
                      onChange={(event) => {
                        setThisSearchInput(event.target.value);
                        debouncedSetSearchInput(event);
                      }}
                    />
                  </div>

                  {["borrow", "collateral", "owner_name"].includes(activeSearch) && (
                    <>
                      {thisResult && thisResult.length ? (
                        <div className="w-full max-h-[500px] overflow-auto">
                          <span className="hidden md:block">
                            <List
                              rowComponent={SearchRow}
                              rowCount={thisResult.length}
                              rowHeight={330}
                              rowProps={{}}
                            />
                          </span>
                          <span className="block md:hidden">
                            <List
                              rowComponent={SearchRow}
                              rowCount={thisResult.length}
                              rowHeight={380}
                              rowProps={{}}
                            />
                          </span>
                        </div>
                      ) : null}
                      {thisInput && thisResult && !thisResult.length ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {t("CreditBorrow:card.noResults")}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner className="size-6 dark:text-emerald-300 text-emerald-700" />
              <p className="text-foreground/70 text-sm">
                {t("CreditBorrow:card.loading")}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
