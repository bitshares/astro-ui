import React, {
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import Fuse from "fuse.js";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { GearIcon } from "@radix-ui/react-icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { $favouriteAssets } from "@/stores/favourites.ts";
import { $blockList } from "@/stores/blocklist.ts";

/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function AssetDropDown(properties) {
  const {
    assetSymbol,
    assetData,
    storeCallback,
    otherAsset,
    otherAssets, // Array of other chosen assets to exclude
    marketSearch,
    type,
    size,
    chain,
    balances,
    triggerLabel, // optional custom trigger label
    triggerVariant, // optional custom trigger variant
    triggerClassName, // optional custom trigger class
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const marketSearchContents = useMemo(() => {
    if (!marketSearch || !marketSearch.length) {
      return [];
    } else {
      let currentContents = otherAsset
        ? marketSearch.filter(
            (asset) => asset.s !== otherAsset && asset.s !== assetSymbol
          )
        : marketSearch.filter((asset) => asset.s !== assetSymbol);

      if (otherAssets && Array.isArray(otherAssets) && otherAssets.length) {
        currentContents = currentContents.filter(
          (asset) => !otherAssets.includes(asset.s)
        );
      }

      if (chain === "bitshares" && blocklist && blocklist.users) {
        currentContents = currentContents.filter(
          (asset) =>
            !blocklist.users.includes(
              toHex(
                sha256(
                  utf8ToBytes(
                    asset.u.split(" ")[1].replace("(", "").replace(")", "")
                  )
                )
              )
            )
        );
      }

      return currentContents;
    }
  }, [marketSearch, blocklist, chain]);

  const fuse = useMemo(
    () =>
      new Fuse(marketSearchContents, {
        includeScore: true,
        keys: [
          "id",
          "s", // symbol
          "u", // `name (id) (ltm?)`
        ],
      }),
    [marketSearchContents]
  );

  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    if (thisInput) {
      const result = fuse.search(thisInput);
      setThisResult(result);
    }
  }, [thisInput, fuse]);

  const Row = ({ index, style }) => {
    let res;
    if (mode === "search") {
      res = thisResult[index].item;
    } else if (mode === "featured") {
      res = featuredAssets[index];
    } else if (mode === "favourites") {
      res = relevantAssets[index];
    } else if (mode === "balances" && balances && balances.length) {
      const _balance = balances[index];
      res = marketSearchContents.find(
        (asset) => asset.id === _balance.asset_id
      );
    }

    if (!res) {
      return null;
    }

    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <button
          type="button"
          key={`acard-${res.id}`}
          style={{ marginBottom: "2px" }}
          onClick={() => {
            setTimeout(() => {
              if (
                mode === "search" ||
                mode === "featured" ||
                mode === "balances"
              ) {
                storeCallback(res.s);
              } else if (mode === "favourites") {
                storeCallback(res.symbol);
              }
            }, 0);
            setDialogOpen(false);
          }}
          className="w-full text-left rounded-lg border border-border/60 bg-accent/20 hover:bg-cyan-500/[0.08] hover:border-cyan-500/30 transition-colors px-3 py-2.5 cursor-pointer"
        >
          <div className="text-sm font-semibold text-foreground/90">
            {mode === "search" || mode === "featured" || mode === "balances"
              ? `${res.s} (${res.id})`
              : null}
            {mode === "favourites" ? `${res.symbol} (${res.id})` : null}
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
            {mode === "search" || mode === "featured" || mode === "balances"
              ? t("AssetDropDownCard:issued", { user: res.u })
              : null}
            {mode === "favourites"
              ? t("AssetDropDownCard:issued", { user: res.issuer })
              : null}
          </div>
        </button>
      </div>
    );
  };

  const [mode, setMode] = useState("search");

  const favouriteAssets = useStore($favouriteAssets);

  const featuredAssets = useMemo(() => {
    if (!chain || !marketSearchContents) {
      return [];
    }
    const _featuredSymbols = [
      "XBTSX.",
      "xbtsx.",
      "BTWTY.",
      "btwty.",
      "HONEST.",
      "honest.",
      "NFTEA.",
      "nftea.",
    ];
    const _featuredIssuers = [
      "committee-account",
      "honest-quorum",
      "nftprofessional1",
    ];

    let _featuredAssets = marketSearchContents.filter((asset) => {
      if (chain === "bitshares") {
        if (_featuredIssuers.includes(asset.u.split(" ")[0])) {
          return true;
        }
        if (_featuredSymbols.some((str) => asset.s.includes(str))) {
          return true;
        }
      }
      return false;
    });

    return _featuredAssets;
  }, [assetSymbol, otherAsset, marketSearchContents, chain]);

  const relevantAssets = useMemo(() => {
    if (!chain || !favouriteAssets) {
      return [];
    }

    const _chainAssets = favouriteAssets[chain];

    if (!assetSymbol && !otherAsset) {
      return _chainAssets;
    }

    return _chainAssets.filter((asset) =>
      assetSymbol && otherAsset
        ? asset.symbol !== assetSymbol && asset.symbol !== otherAsset
        : asset.symbol !== assetSymbol
    );
  }, [favouriteAssets, assetSymbol, otherAsset, chain]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setThisResult();
        }
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        {size && size === "cog" ? (
          <GearIcon onClick={() => setDialogOpen(true)} />
        ) : (
          <Button
            variant={
              triggerVariant
                ? triggerVariant
                : "ghost"
            }
            className={`${
              size && size === "small" ? "h-7 text-xs px-2 " : "h-9 px-3 "
            } w-full justify-between font-semibold ${
              type === "quote"
                ? "bg-accent/50 hover:bg-white/[0.1] text-foreground border border-border"
                : "bg-accent/40 hover:bg-accent/60 text-foreground/85 border border-border"
            } ${triggerClassName ?? ""}`}
            onClick={() => setDialogOpen(true)}
          >
            <span className="truncate">
              {triggerLabel
                ? triggerLabel
                : !assetSymbol
                ? t("AssetDropDownCard:select")
                : !size && assetSymbol
                ? t("AssetDropDownCard:change")
                : size && assetSymbol && assetSymbol.length < 12
                ? assetSymbol
                : size && assetSymbol && assetSymbol.length >= 12
                ? assetData.id
                : null}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[550px] !bg-card border border-border text-foreground"
      >
        <DialogHeader>
          <DialogTitle>
            <h3 className="text-xl font-bold tracking-tight">
              {assetSymbol
                ? t("AssetDropDownCard:replacing", { assetSymbol: assetSymbol })
                : t("AssetDropDownCard:selecting")}
            </h3>
          </DialogTitle>
        </DialogHeader>
        <>
          <div
            className={`grid grid-cols-${
              balances && balances.length ? 4 : 3
            } gap-1 rounded-lg border border-border bg-accent/20 p-1`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("search")}
              className={
                mode === "search"
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/20 hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                  : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/40 border border-transparent"
              }
            >
              {t("AssetDropDownCard:search")}
            </Button>
            {balances && balances.length ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("balances")}
                className={
                  mode === "balances"
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/20 hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                    : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/40 border border-transparent"
                }
              >
                {t("PortfolioTabs:balances")}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("featured")}
              className={
                mode === "featured"
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/20 hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                  : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/40 border border-transparent"
              }
            >
              {t("AssetDropDownCard:featured")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("favourites")}
              className={
                mode === "favourites"
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/20 hover:text-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                  : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/40 border border-transparent"
              }
            >
              {t("AssetDropDownCard:favourites")}
            </Button>
          </div>

          {mode === "search" ? (
            <>
              <h4 className="text-sm font-semibold tracking-tight text-muted-foreground">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              <Input
                name="assetSearch"
                placeholder={t("AssetDropDownCard:search")}
                onChange={(event) => {
                  setThisInput(event.target.value);
                }}
                className="bg-accent/40 border-border text-foreground placeholder:text-muted-foreground"
              />
              {thisResult && thisResult.length ? (
                <div className="w-full max-h-[350px] overflow-auto">
                  <List
                    rowComponent={Row}
                    rowCount={thisResult.length}
                    rowHeight={70}
                    rowProps={{}}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          {mode === "balances" ? (
            <>
              <h4 className="text-sm font-semibold tracking-tight text-muted-foreground">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              {balances && balances.length ? (
                <div className="w-full max-h-[350px] overflow-auto">
                  <List
                    rowComponent={Row}
                    rowCount={balances.length}
                    rowHeight={70}
                    rowProps={{}}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-accent/20 px-4 py-8 text-center text-sm text-muted-foreground/70">
                  No balances...
                </div>
              )}
            </>
          ) : null}

          {mode === "featured" ? (
            <>
              <h4 className="text-sm font-semibold tracking-tight text-muted-foreground">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              {featuredAssets && featuredAssets.length ? (
                <div className="w-full max-h-[350px] overflow-auto">
                  <List
                    rowComponent={Row}
                    rowCount={featuredAssets.length}
                    rowHeight={70}
                    rowProps={{}}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-accent/20 px-4 py-8 text-center text-sm text-muted-foreground/70">
                  No featured assets...
                </div>
              )}
            </>
          ) : null}

          {mode === "favourites" ? (
            <>
              <h4 className="text-sm font-semibold tracking-tight text-muted-foreground">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              {relevantAssets && relevantAssets.length ? (
                <div className="w-full max-h-[350px] overflow-auto">
                  <List
                    rowComponent={Row}
                    rowCount={relevantAssets.length}
                    rowHeight={70}
                    rowProps={{}}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-accent/20 px-4 py-8 text-center text-sm text-muted-foreground/70">
                  No favourite assets...
                </div>
              )}
            </>
          ) : null}
        </>
      </DialogContent>
    </Dialog>
  );
}
