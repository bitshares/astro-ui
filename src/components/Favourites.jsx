import React, {
  useMemo,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ArrowLeftRight,
  Coins,
  Send,
  Trash2,
  Star,
  ShieldCheck,
} from "lucide-react";

import {
  $favouriteAssets,
  addFavouriteAsset,
  removeFavouriteAsset,
  $favouriteUsers,
  addFavouriteUser,
  removeFavouriteUser,
  $favouritePairs,
  addFavouritePair,
  removeFavouritePair,
} from "@/stores/favourites.ts";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";

import AccountSearch from "@/components/AccountSearch.jsx";
import PoolDialogs from "@/components/Market/PoolDialogs.jsx";
import AssetIssuerActions from "@/components/AssetIssuerActions.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { cn } from "@/lib/utils";

function RemoveButton({ onClick, label }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ActionPill({ href, icon: Icon, children, accent = "slate" }) {
  const palette = {
    slate: "border-border text-foreground/70 hover:bg-accent/60 hover:text-accent-foreground",
    emerald: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
  }[accent];

  return (
    <a href={href} className="no-underline">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`h-8 gap-1.5 px-3 rounded-full border ${palette}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{children}</span>
      </Button>
    </a>
  );
}

export default function Favourites(properties) {
  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _poolsBTS,
    _poolsTEST,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const favourites = useStore($favouriteAssets);
  const favouriteUsers = useStore($favouriteUsers);
  const favouritePairs = useStore($favouritePairs);

  const currentUser = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(() => {
    // Fall back to bitshares if chain not initialised yet
    if (currentUser && currentUser.chain) return currentUser.chain;
    return "bitshares";
  }, [currentUser]);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain === "bitshares") return _marketSearchBTS ?? [];
    return _marketSearchTEST ?? [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const chainFavourites = useMemo(() => {
    // favourite assets
    if (!favourites) return [];
    return favourites[_chain] ?? [];
  }, [favourites, _chain]);

  const favouriteAssets = useMemo(() => {
    if (!chainFavourites) return [];
    return assets.filter((asset) =>
      chainFavourites.some((fav) => fav.id === asset.id)
    );
  }, [chainFavourites, assets]);

  const [fullFavouriteAssetData, setFullFavouriteAssetData] = useState([]);
  const [fullFavouriteLoading, setFullFavouriteLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(favouriteAssets.map((asset) => asset.id)),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setFullFavouriteAssetData(data);
          setFullFavouriteLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      setFullFavouriteLoading(true);
      fetching();
    } else {
      setFullFavouriteLoading(false);
    }
  }, [favouriteAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(
          favouriteAssets.map((asset) => asset.id.replace("1.3.", "2.3."))
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setDynamicData(data);
          setDynamicLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      setDynamicLoading(true);
      fetching();
    } else {
      setDynamicLoading(false);
    }
  }, [favouriteAssets]);

  const [bitassetData, setBitassetData] = useState([]);
  const [bitassetLoading, setBitassetLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(
          favouriteAssets
            .filter((asset) => asset.bitasset_data_id)
            .map((asset) => asset.bitasset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBitassetData(data);
          setBitassetLoading(false);
        }
      });
    }

    if (_chain && favouriteAssets && favouriteAssets.length) {
      const ids = favouriteAssets
        .filter((asset) => asset.bitasset_data_id)
        .map((asset) => asset.bitasset_data_id);
      if (ids && ids.length) {
        setBitassetLoading(true);
        fetching();
      } else {
        setBitassetLoading(false);
      }
    }
  }, [favouriteAssets]);

  const priceFeederAccountIDs = useMemo(() => {
    if (!bitassetData) {
      return [];
    }

    const priceFeeders = Array.from(
      new Set(bitassetData.flatMap((data) => data.feeds.map((feed) => feed[0])))
    );

    return priceFeeders;
  }, [bitassetData]);

  const [priceFeederAccounts, setPriceFeederAccounts] = useState([]);
  const [feederLoading, setFeederLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        _chain,
        JSON.stringify(priceFeederAccountIDs),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setPriceFeederAccounts(data);
          setFeederLoading(false);
        }
      });
    }

    if (_chain && priceFeederAccountIDs && priceFeederAccountIDs.length) {
      setFeederLoading(true);
      fetching();
    } else {
      setFeederLoading(false);
    }
  }, [priceFeederAccountIDs]);

  const loading =
    dynamicLoading || bitassetLoading || feederLoading || fullFavouriteLoading;

  const chainPairs = useMemo(() => {
    if (!favouritePairs) return [];
    return favouritePairs[_chain] ?? [];
  }, [favouritePairs, _chain]);

  const [addSelection, setAddSelection] = useState();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState();
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairBaseSelection, setPairBaseSelection] = useState();
  const [pairQuoteSelection, setPairQuoteSelection] = useState();

  // When a new symbol is chosen from the AssetDropDown, look up its details and add to favourites
  useEffect(() => {
    if (!addSelection) return;

    const found = assets.find((a) => a.symbol === addSelection);
    if (found) {
      addFavouriteAsset(_chain, {
        symbol: found.symbol,
        id: found.id,
        issuer: found.issuer,
      });
    }
    setAddSelection(undefined);
  }, [addSelection, assets, _chain]);

  // Handle user selection from dialog
  useEffect(() => {
    if (!selectedUser) return;
    addFavouriteUser(_chain, { name: selectedUser.name, id: selectedUser.id });
    setSelectedUser(undefined);
    setUserDialogOpen(false);
  }, [selectedUser, _chain]);

  // Reset pair selections when closing the dialog
  useEffect(() => {
    if (!pairDialogOpen) {
      setPairBaseSelection(undefined);
      setPairQuoteSelection(undefined);
    }
  }, [pairDialogOpen]);

  const Row = ({ index, style }) => {
    const item = chainFavourites[index];

    if (!item) {
      return;
    }

    const assetDetails = fullFavouriteAssetData.find((a) => a.id === item.id);

    const issuerLookup = marketSearch.find((x) => x.u && x.u.includes(`(${item.issuer})`));
    const issuerName = issuerLookup ? issuerLookup.u.split(" (")[0] : null;

    const showIssuerActions = !!(
      currentUser?.id &&
      item?.issuer &&
      currentUser.id === item.issuer &&
      (!currentUser.chain || currentUser.chain === _chain)
    );

    const fullAsset = favouriteAssets.find((a) => a.id === item.id) ?? null;

    const relevantDynamicData = fullAsset
      ? dynamicData.find((data) => data.id === fullAsset.id.replace("1.3.", "2.3."))
      : null;

    const relevantBitassetData =
      fullAsset && fullAsset.bitasset_data_id
        ? bitassetData.find((data) => data.id === fullAsset.bitasset_data_id)
        : null;

    const tradeHref = `/dex/index.html?market=${item.symbol}_${
      item.symbol === "BTS" ? "HONEST.USD" : "BTS"
    }`;

    const renderCard = (layout) => {
      const isStacked = layout === "stacked";
      const cardCls = isStacked
        ? "mb-3 group bg-card/60 border border-amber-500/15 hover:border-amber-500/30 hover:bg-amber-500/[0.03] hover:shadow-md hover:shadow-amber-500/5 transition-all rounded-xl block md:hidden"
        : "mb-3 group bg-card/60 border border-amber-500/15 hover:border-amber-500/30 hover:bg-amber-500/[0.03] hover:shadow-md hover:shadow-amber-500/5 transition-all rounded-xl hidden md:block";
      const headerCls = isStacked
        ? "px-4 py-4"
        : "px-4 py-4 flex flex-row items-center justify-between gap-3";

      return (
        <Card className={cardCls}>
          <CardHeader className={headerCls}>
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base text-foreground truncate">
                <span className="font-semibold">{item.symbol}</span>
                <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                  {item.id}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">
                {issuerName || item.issuer}
              </CardDescription>
            </div>
            <div
              className={
                isStacked
                  ? "mt-3 flex items-center gap-2 flex-wrap"
                  : "flex items-center gap-2 flex-shrink-0"
              }
            >
              <ActionPill href={tradeHref} icon={ArrowLeftRight} accent="emerald">
                {t("IssuedAssets:proceedToTrade")}
              </ActionPill>

              {showIssuerActions && assetDetails ? (
                <AssetIssuerActions
                  asset={assetDetails}
                  assets={assets}
                  chain={_chain}
                  currentUser={currentUser}
                  node={currentNode}
                  dynamicAssetData={relevantDynamicData}
                  bitassetData={relevantBitassetData}
                  priceFeederAccounts={priceFeederAccounts}
                  buttonVariant="outline"
                  buttonSize="sm"
                  className="border-border text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                />
              ) : null}

              <div className={isStacked ? "ml-auto" : "ml-1"}>
                <RemoveButton
                  onClick={() => removeFavouriteAsset(_chain, item)}
                  label={t("Favourites:remove")}
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    };

    return (
      <div style={{ ...style, paddingRight: "10px" }}>
        {renderCard("stacked")}
        {renderCard("row")}
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-4xl text-foreground">
      <Card className="mb-8 rounded-xl overflow-hidden bg-card/60 border-border">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-500" />
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-accent/30 dark:bg-white/[0.05] border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:assetsHeader")}
              </CardTitle>

            </div>
          </div>
          <div className="flex items-center gap-2">
            <AssetDropDown
              assetSymbol={""}
              assetData={null}
              storeCallback={setAddSelection}
              otherAsset={null}
              marketSearch={marketSearch}
              type={null}
              chain={_chain}
              balances={null}
              triggerLabel={t("Favourites:addAsset")}
              triggerVariant="outline"
              triggerClassName="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {chainFavourites && chainFavourites.length ? (
            <>
              {loading ? (
                <div className="space-y-2 mt-1" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-accent/30 dark:bg-white/[0.05]"
                    >
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-3 w-40 flex-1" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                    <List
                      rowComponent={Row}
                      rowCount={chainFavourites.length}
                      rowHeight={128}
                      rowProps={{}}
                    />
                  </div>
                  <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                    <List
                      rowComponent={Row}
                      rowCount={chainFavourites.length}
                      rowHeight={96}
                      rowProps={{}}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <Empty className="mt-2 border border-dashed border-amber-500/20 rounded-xl bg-amber-500/[0.03]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-amber-500/15 text-amber-400"><Star className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:assetsEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:assetsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 rounded-xl overflow-hidden bg-card/60 border-border">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-sky-500" />
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-accent/30 dark:bg-white/[0.05] border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:pairsHeader")}
              </CardTitle>

            </div>
          </div>
          <Dialog
            open={pairDialogOpen}
            onOpenChange={(open) => setPairDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
                {t("Favourites:addPair")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addPairDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addPairDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <AssetDropDown
                  assetSymbol={pairBaseSelection}
                  assetData={null}
                  storeCallback={setPairBaseSelection}
                  otherAsset={pairQuoteSelection}
                  marketSearch={marketSearch}
                  type="base"
                  chain={_chain}
                  balances={null}
                  triggerLabel={
                    pairBaseSelection
                      ? `${t("Favourites:selectBase")}: ${pairBaseSelection}`
                      : t("Favourites:selectBase")
                  }
                  triggerVariant="outline"
                />
                <AssetDropDown
                  assetSymbol={pairQuoteSelection}
                  assetData={null}
                  storeCallback={setPairQuoteSelection}
                  otherAsset={pairBaseSelection}
                  marketSearch={marketSearch}
                  type="quote"
                  chain={_chain}
                  balances={null}
                  triggerLabel={
                    pairQuoteSelection
                      ? `${t("Favourites:selectQuote")}: ${pairQuoteSelection}`
                      : t("Favourites:selectQuote")
                  }
                  triggerVariant="outline"
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="mr-3">
                    {t("Favourites:selectBase")}:
                    <strong className="ml-1">{pairBaseSelection || "—"}</strong>
                  </span>
                  <span>
                    {t("Favourites:selectQuote")}:
                    <strong className="ml-1">
                      {pairQuoteSelection || "—"}
                    </strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-accent/60"
                    onClick={() => {
                      setPairBaseSelection(undefined);
                      setPairQuoteSelection(undefined);
                    }}
                  >
                    {t("Favourites:clear")}
                  </Button>
                  <Button
                    disabled={
                      !pairBaseSelection ||
                      !pairQuoteSelection ||
                      pairBaseSelection === pairQuoteSelection
                    }
                    onClick={() => {
                      if (
                        pairBaseSelection &&
                        pairQuoteSelection &&
                        pairBaseSelection !== pairQuoteSelection
                      ) {
                        const pair = `${pairBaseSelection}_${pairQuoteSelection}`;
                        addFavouritePair(_chain, pair);
                        setPairDialogOpen(false);
                      }
                    }}
                  >
                    {t("Favourites:savePair")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4">
          {chainPairs && chainPairs.length ? (
            <>
              <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                <List
                  rowComponent={({ index, style }) => {
                    const pair = chainPairs[index];
                    if (!pair) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 group bg-card/60 border border-cyan-500/15 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] hover:shadow-md transition-all rounded-xl">
                          <CardHeader className="px-4 py-4">
                            <div className="space-y-1">
                              <CardTitle className="text-base text-foreground font-semibold">
                                {pair}
                              </CardTitle>
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <ActionPill
                                href={`/dex/index.html?market=${pair}`}
                                icon={ArrowLeftRight}
                                accent="slate"
                              >
                                {t("Favourites:trade")}
                              </ActionPill>
                              <div className="ml-auto">
                                <RemoveButton
                                  onClick={() =>
                                    removeFavouritePair(_chain, pair)
                                  }
                                  label={t("Favourites:remove")}
                                />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={chainPairs.length}
                  rowHeight={120}
                  rowProps={{}}
                />
              </div>

              <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                <List
                  rowComponent={({ index, style }) => {
                    const pair = chainPairs[index];
                    if (!pair) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 group bg-card/60 border border-cyan-500/15 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] hover:shadow-md transition-all rounded-xl">
                          <CardHeader className="px-4 py-4 flex flex-row items-center justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-base text-foreground font-semibold">
                                {pair}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <ActionPill
                                href={`/dex/index.html?market=${pair}`}
                                icon={ArrowLeftRight}
                                accent="slate"
                              >
                                {t("Favourites:trade")}
                              </ActionPill>
                              <div className="ml-1">
                                <RemoveButton
                                  onClick={() =>
                                    removeFavouritePair(_chain, pair)
                                  }
                                  label={t("Favourites:remove")}
                                />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={chainPairs.length}
                  rowHeight={88}
                  rowProps={{}}
                />
              </div>
            </>
          ) : (
            <Empty className="mt-2 border border-dashed border-cyan-500/20 rounded-xl bg-cyan-500/[0.03]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-cyan-500/15 text-cyan-400"><ArrowLeftRight className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:pairsEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:pairsEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 rounded-xl overflow-hidden bg-card/60 border-border">
        <div className="h-1 w-full bg-gradient-to-r from-sky-500 to-blue-500" />
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between bg-accent/30 dark:bg-white/[0.05] border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
              <Send className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                {t("Favourites:usersHeader")}
              </CardTitle>

            </div>
          </div>
          <Dialog
            open={userDialogOpen}
            onOpenChange={(open) => setUserDialogOpen(open)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                {t("Favourites:addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{t("Favourites:addUserDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("Favourites:addUserDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <AccountSearch
                chain={_chain}
                excludedUsers={[]}
                setChosenAccount={setSelectedUser}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4">
          {favouriteUsers && (favouriteUsers[_chain] ?? []).length ? (
            <>
              <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                <List
                  rowComponent={({ index, style }) => {
                    const user = favouriteUsers[_chain][index];
                    if (!user) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 group bg-card/60 border border-sky-500/15 hover:border-sky-500/30 hover:bg-sky-500/[0.03] hover:shadow-md transition-all rounded-xl">
                          <CardHeader className="px-4 py-4">
                            <div className="space-y-1 min-w-0">
                              <CardTitle className="text-base text-foreground truncate">
                                <span className="font-semibold">{user.name}</span>
                                <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                                  {user.id}
                                </span>
                              </CardTitle>
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <ActionPill
                                href={`/transfer.html?to=${encodeURIComponent(
                                  user.name
                                )}`}
                                icon={Send}
                                accent="emerald"
                              >
                                {t("Favourites:transfer")}
                              </ActionPill>
                              <div className="ml-auto">
                                <RemoveButton
                                  onClick={() =>
                                    removeFavouriteUser(_chain, user)
                                  }
                                  label={t("Favourites:remove")}
                                />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={120}
                  rowProps={{}}
                />
              </div>

              <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                <List
                  rowComponent={({ index, style }) => {
                    const user = favouriteUsers[_chain][index];
                    if (!user) return null;
                    return (
                      <div style={{ ...style, paddingRight: "10px" }}>
                        <Card className="mb-3 group bg-card/60 border border-sky-500/15 hover:border-sky-500/30 hover:bg-sky-500/[0.03] hover:shadow-md transition-all rounded-xl">
                          <CardHeader className="px-4 py-4 flex flex-row items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <CardTitle className="text-base text-foreground truncate">
                                <span className="font-semibold">{user.name}</span>
                                <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                                  {user.id}
                                </span>
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <ActionPill
                                href={`/transfer.html?to=${encodeURIComponent(
                                  user.name
                                )}`}
                                icon={Send}
                                accent="emerald"
                              >
                                {t("Favourites:transfer")}
                              </ActionPill>
                              <div className="ml-1">
                                <RemoveButton
                                  onClick={() =>
                                    removeFavouriteUser(_chain, user)
                                  }
                                  label={t("Favourites:remove")}
                                />
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </div>
                    );
                  }}
                  rowCount={favouriteUsers[_chain].length}
                  rowHeight={88}
                  rowProps={{}}
                />
              </div>
            </>
          ) : (
            <Empty className="mt-2 border border-dashed border-sky-500/20 rounded-xl bg-sky-500/[0.03]">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-sky-500/15 text-sky-400"><Send className="w-6 h-6" /></EmptyMedia>
                <EmptyTitle className="text-foreground/80">{t("Favourites:usersEmptyTitle")}</EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {t("Favourites:usersEmptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
