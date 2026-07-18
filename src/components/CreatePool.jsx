import {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
  EmptyDescription,
} from "@/components/ui/empty";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Droplets, Layers, Coins, ArrowLeftRight, Percent, ArrowDownUp } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { debounce, humanReadableFloat } from "@/lib/common.js";

export default function IssuedAssets(properties) {
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

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const [issuedAssets, setIssuedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLoading(false);
          setIssuedAssets(data);
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      setLoading(true);
      fetching();
    }
  }, [usr, currentNode]);

  const relevantAssets = useMemo(() => {
    if (!issuedAssets || !issuedAssets.length) {
      return [];
    }

    return issuedAssets.filter(
      (asset) => !asset.bitasset_data_id && !asset.for_liquidity_pool // no smartcoins/pmas & no existing pool share assets!
    );
  }, [issuedAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(
          relevantAssets.map((asset) => asset.dynamic_asset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = Array.isArray(data)
            ? data.filter((d) => {
                const confidential = Number(d?.confidential_supply ?? 0);
                const current = Number(d?.current_supply ?? 0);
                return confidential === 0 && current === 0;
              })
            : [];

          setDynamicData(filteredData);
        }
      });
    }

    if (relevantAssets && relevantAssets.length) {
      fetching();
    }
  }, [relevantAssets]);

  const eligibleAssets = useMemo(() => {
    if (!relevantAssets || !relevantAssets.length) {
      return [];
    }

    const dynamicDataIds = dynamicData.map((d) => d.id.replace("2.3.", "1.3."));

    return relevantAssets.filter((asset) => dynamicDataIds.includes(asset.id));
  }, [dynamicData, relevantAssets]);

  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
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
            setBalances(filteredData);
          }
        });
      }
    }

    fetchBalances();
  }, [usr, assets, currentNode]);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const AssetRow = ({ index, style }) => {
    const issuedAsset = eligibleAssets[index];
    if (!issuedAsset) {
      return null;
    }

    const maxSupply =
      issuedAsset.options && issuedAsset.options.max_supply
        ? humanReadableFloat(
            issuedAsset.options.max_supply,
            issuedAsset.precision
          ).toLocaleString(undefined, { maximumFractionDigits: 0 })
        : "0";

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card
          className={cn(
            "ml-2 mr-2 cursor-pointer transition-colors border-border hover:border-[hsl(var(--accent-1)/0.4)]",
            selectedAsset && selectedAsset !== issuedAsset.id
              ? "bg-accent"
              : "",
            selectedAsset && selectedAsset === issuedAsset.id
              ? "bg-[hsl(var(--accent-1)/0.1)] border-[hsl(var(--accent-1)/0.5)]"
              : ""
          )}
          onClick={() => setSelectedAsset(issuedAsset.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="pb-0">
                {selectedAsset && selectedAsset === issuedAsset.id ? (
                  <span className="text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))]">
                    ✔️{" "}
                  </span>
                ) : (
                  ""
                )}
                {`${issuedAsset.symbol} (${issuedAsset.id})`}
              </CardTitle>
              <div className="text-xs font-medium text-muted-foreground/80 whitespace-nowrap text-right">
                {t("CreatePool:max_supply")}: {maxSupply} {issuedAsset.symbol}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [takerFeePercent, setTakerFeePercent] = useState(0);
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(0);
  const [assetA, setAssetA] = useState(null);
  const [assetB, setAssetB] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const swapAssets = () => {
    const temp = assetA;
    setAssetA(assetB);
    setAssetB(temp);
  };

  const assetAData = useMemo(() => {
    if (assets && assetA) {
      return assets.find((asset) => asset.symbol === assetA);
    }
    return null;
  }, [assets, assetA]);

  const assetBData = useMemo(() => {
    if (assets && assetB) {
      return assets.find((asset) => asset.symbol === assetB);
    }
    return null;
  }, [assets, assetB]);

  const shareAsset = useMemo(() => {
    if (!eligibleAssets || !selectedAsset) {
      return null;
    }
    return eligibleAssets.find((asset) => asset.id === selectedAsset) || null;
  }, [eligibleAssets, selectedAsset]);

  const shareAssetMaxSupply = useMemo(() => {
    if (
      !shareAsset ||
      !shareAsset.options ||
      !shareAsset.options.max_supply
    ) {
      return null;
    }
    return humanReadableFloat(
      shareAsset.options.max_supply,
      shareAsset.precision
    ).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }, [shareAsset]);

  const debouncedPercent = useCallback(
    debounce((input, setCommissionFunction) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0) {
        setCommissionFunction(0);
        return;
      }

      const split = parsedInput.toString().split(".");
      if (split.length > 1) {
        const decimals = split[1].length;
        if (decimals > 2) {
          parsedInput = parseFloat(parsedInput.toFixed(2));
        }
      }

      if (parsedInput > 100) {
        setCommissionFunction(100);
      } else if (parsedInput < 0.01) {
        setCommissionFunction(0.01);
      } else {
        setCommissionFunction(parsedInput);
      }
    }, 500),
    []
  );

  const StepHeader = ({ icon: Icon, step, title, description, done }) => (
    <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          done
            ? "bg-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.4)]"
            : "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.3)]"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
          {`Step ${step}`}
          {done ? (
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[hsl(var(--accent-1)/0.3)]">
              ✓
            </span>
          ) : null}
        </span>
        <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl px-6 py-5 shadow-lg shadow-black/20 ring-1 dark:ring-white/[0.06] ring-border">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
              <Droplets className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("CreatePool:title")}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("CreatePool:description")}
              </p>
            </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={Coins}
                step={1}
                title={t("CreatePool:step1_title")}
                description={t("CreatePool:step1_description")}
                done={!!selectedAsset}
              />
              <CardContent className="p-5 sm:p-6">
                {loading ? (
                  <div className="text-center mt-5">
                    {t("CreditBorrow:common.loading")}
                  </div>
                ) : !eligibleAssets || !eligibleAssets.length ? (
                  <Empty className="mt-2">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                          <Droplets className="h-6 w-6" strokeWidth={1.75} />
                        </span>
                      </EmptyMedia>
                      <EmptyTitle>{t("IssuedAssets:noUIA")}</EmptyTitle>
                      <EmptyDescription>
                        {t("CreatePool:noEligibleAssets")}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        asChild
                        variant="outline"
                        className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                      >
                        <a href="/create_uia.html">
                          {t("PageHeader:create_uia")}
                        </a>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingUIA", {
                        count: eligibleAssets.length,
                      })}
                    </h5>
                    <div className="w-full max-h-[350px] min-h-[350px] overflow-auto rounded-lg bg-card/30 border border-[hsl(var(--accent-1)/0.2)]">
                      <List
                        rowComponent={AssetRow}
                        rowCount={eligibleAssets.length}
                        rowHeight={75}
                        rowProps={{}}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground/80 leading-relaxed">
                      {t("CreatePool:step1_max_supply_note")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={ArrowLeftRight}
                step={2}
                title={t("CreatePool:step2_title")}
                description={t("CreatePool:step2_description")}
                done={!!(assetA && assetB)}
              />
              <CardContent className="p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                  <div>
                    <HoverInfo
                      header={t("CreatePool:assetA")}
                      content={t("CreatePool:assetA_description")}
                    />
                    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 mt-1">
                      <AssetDropDown
                        assetSymbol={assetA ?? ""}
                        assetData={assetAData}
                        storeCallback={(sym) => {
                          if (sym && sym === assetB) {
                            return;
                          }
                          setAssetA(sym);
                        }}
                        otherAsset={assetB}
                        marketSearch={marketSearch}
                        type={"quote"}
                        size="small"
                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                        balances={balances}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={swapAssets}
                    className="self-stretch flex items-center justify-center"
                    aria-label={t("CreatePool:swap_pair")}
                    title={t("CreatePool:swap_pair")}
                  >
                    <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border bg-card/80 text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)] transition-all group">
                      <ArrowDownUp className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                    </span>
                  </button>

                  <div>
                    <HoverInfo
                      header={t("CreatePool:assetB")}
                      content={t("CreatePool:assetB_description")}
                    />
                    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 mt-1">
                      <AssetDropDown
                        assetSymbol={assetB ?? ""}
                        assetData={assetBData}
                        storeCallback={(sym) => {
                          if (sym && sym === assetA) {
                            return;
                          }
                          setAssetB(sym);
                        }}
                        otherAsset={assetA}
                        marketSearch={marketSearch}
                        type={"base"}
                        size="small"
                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                        balances={balances}
                      />
                    </div>
                  </div>
                </div>
                {assetA && assetB && assetA === assetB ? (
                  <p className="mt-3 text-xs font-medium text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]">
                    ⚠ {t("CreatePool:duplicate_assets")}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={Percent}
                step={3}
                title={t("CreatePool:step3_title")}
                description={t("CreatePool:step3_description")}
                done={!!(selectedAsset && assetA && assetB)}
              />
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4">
                  <HoverInfo
                    header={t("CreatePool:taker_fee_header")}
                    content={t("CreatePool:taker_fee_content")}
                  />
                  <Input
                    placeholder={0}
                    value={takerFeePercent}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    pattern="^\d*(\.\d{0,2})?$"
                    onInput={(e) => {
                      setTakerFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setTakerFeePercent
                      );
                    }}
                    className="mt-1 !bg-card/40 border-border focus-visible:!ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                  />
                </div>
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4">
                  <HoverInfo
                    header={t("CreatePool:withdrawal_fee_header")}
                    content={t("CreatePool:withdrawal_fee_content")}
                  />
                  <Input
                    placeholder={0}
                    value={withdrawalFeePercent}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    pattern="^\d*(\.\d{0,2})?$"
                    onInput={(e) => {
                      setWithdrawalFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setWithdrawalFeePercent
                      );
                    }}
                    className="mt-1 !bg-card/40 border-border focus-visible:!ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                  />
                </div>
              </CardContent>
            </Card>

            {selectedAsset && assetA && assetB && assetA !== assetB ? (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-[hsl(var(--accent-1)/0.04)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <Layers className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("CreatePool:summary_title")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("CreatePool:summary_ready")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_share_asset")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                      {selectedAsset}
                    </div>
                    {shareAssetMaxSupply ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {t("CreatePool:max_supply")}: {shareAssetMaxSupply}{" "}
                        {shareAsset ? shareAsset.symbol : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_pair")}
                    </div>
                    <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] truncate">
                      {`${assetA} / ${assetB}`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_taker_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${takerFeePercent}%`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_withdrawal_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${withdrawalFeePercent}%`}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <button
                type="button"
                disabled={!(assetA && assetB && selectedAsset && assetA !== assetB)}
                onClick={() => {
                  setShowDialog(true);
                }}
                className={cn(
                  "w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] flex items-center justify-center gap-2 text-base transition-all group",
                  assetA && assetB && selectedAsset
                    ? "bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(20,184,166,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
                    : "bg-card/60 border border-border/40 dark:border-white/5 text-muted-foreground cursor-not-allowed"
                )}
              >
                <Droplets
                  className="h-4 w-4 group-hover:scale-110 transition-transform"
                  strokeWidth={2.5}
                />
                {t("CreateUIA:buttons.submit")}
              </button>
            </div>
          </div>
      </div>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={["liquidity_pool_create"]}
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`CreatingPool`}
          headerText={t("CreatePool:deeplinkDialogTitle")}
          trxJSON={[
            {
              account: usr.id,
              asset_a: assetAData.id,
              asset_b: assetBData.id,
              share_asset: selectedAsset,
              taker_fee_percent: takerFeePercent,
              withdrawal_fee_percent: withdrawalFeePercent,
              extensions: {},
            },
          ]}
        />
      ) : null}
    </>
  );
}
