import React, {
  useSyncExternalStore,
  useMemo,
  useEffect,
  useState,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import {
  Empty,
  EmptyContent,
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

import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { createVestingBalanceStore } from "@/nanoeffects/VestingBalances.ts";

import { humanReadableFloat } from "@/lib/common.js";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { Coins, PiggyBank, TrendingUp, Clock, Calendar, ArrowUpCircle, Info } from "lucide-react";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

export default function Vesting(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);
  const [chosenVestingBalance, setChosenVestingBalance] = useState(null);

  const [vestingType, setVestingType] = useState("cashback");

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

  const vestingStore = useMemo(() => {
    if (!usr || !usr.chain || !usr.id || !currentNode) {
      return;
    }
    return createVestingBalanceStore([
      usr.chain,
      usr.id,
      currentNode ? currentNode.url : null,
    ]);
  }, [usr, currentNode]);

  const {
    data: vestingData,
    loading: vestingLoading,
    error: vestingError,
  } = useStore(vestingStore);

  const chosenVestingData = useMemo(() => {
    if (!vestingData || !vestingData.length) {
      return [];
    }
    return vestingData.filter((x) => x.balance_type === vestingType);
  }, [vestingData, vestingType]);

  const VestingRow = ({ index, style }) => {
    let res = chosenVestingData[index];
    const foundAsset = assets.find((x) => x.id === res.balance.asset_id);

    if (!res || !foundAsset) {
      return null;
    }

    const readableBalance = ` ${humanReadableFloat(
      res.balance.amount,
      foundAsset.precision
    )} ${foundAsset.symbol}`;

    const policy = res.balance_type === "cashback" ? res.policy[1] : null;

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <div className="m-2 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.04] to-transparent hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] transition-all px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-400/30 dark:text-emerald-200 text-emerald-700">
                <Coins className="h-3 w-3" />
              </span>
              <span className="font-mono text-sm font-semibold text-emerald-400">
                {readableBalance}
              </span>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-400/30 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700 text-[10px] font-mono"
            >
              {res.id}
            </Badge>
          </div>
          
          {policy ? (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground">{t("Vesting:vesting_seconds")}</span>
                  <span className="font-mono text-xs text-foreground/85">{policy.vesting_seconds}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground">{t("Vesting:start_claim")}</span>
                  <span className="font-mono text-xs text-foreground/70">
                    {new Date(policy.start_claim).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground">{t("Vesting:coin_seconds_earned")}</span>
                  <span className="font-mono text-xs text-foreground/85">{policy.coin_seconds_earned}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground">{t("Vesting:coin_seconds_earned_last_update")}</span>
                  <span className="font-mono text-xs text-foreground/70">
                    {new Date(policy.coin_seconds_earned_last_update).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="mt-3 pt-3 border-t border-border/40">
            <Button
              onClick={() => {
                setChosenVestingBalance({ res, readableBalance });
                setShowDialog(true);
              }}
              className="w-full h-9 rounded-xl font-semibold transition-all border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:text-emerald-100 text-emerald-700 hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.4)]"
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {t(
                `Vesting:${
                  res.balance_type === "cashback" ? "claim_a" : "claim_b"
                }`
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5 w-full md:w-3/4 lg:1/2">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-green-500/10 blur-3xl"
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent dark:text-emerald-200 text-emerald-700">
              <PiggyBank className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-400/30 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700 text-[10px]"
                >
                  Vesting
                </Badge>
                <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                  {t("Vesting:card.title")}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("Vesting:card.description")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              onClick={() => setVestingType("cashback")}
              variant={vestingType === "cashback" ? "" : "outline"}
              className={
                vestingType === "cashback"
                  ? "border-emerald-400/40 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700 hover:bg-emerald-500/20"
                  : "border-border hover:border-emerald-400/30 hover:bg-emerald-500/[0.03]"
              }
            >
              <Coins className="h-4 w-4 mr-2" />
              {t("Vesting:cashback")}
            </Button>
            <Button
              onClick={() => setVestingType("market_fee_sharing")}
              variant={vestingType === "market_fee_sharing" ? "" : "outline"}
              className={
                vestingType === "market_fee_sharing"
                  ? "border-emerald-400/40 bg-emerald-500/10 dark:text-emerald-200 text-emerald-700 hover:bg-emerald-500/20"
                  : "border-border hover:border-emerald-400/30 hover:bg-emerald-500/[0.03]"
              }
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {t("Vesting:market_fees")}
            </Button>
          </div>

          <>
            {chosenVestingData && chosenVestingData.length ? (
              <div className="w-full mt-4 max-h-[400px] overflow-auto">
                <List
                  rowComponent={VestingRow}
                  rowCount={chosenVestingData.length}
                  rowHeight={vestingType === "cashback" ? 200 : 100}
                  rowProps={{}}
                />
              </div>
            ) : null}
            {chosenVestingData && !chosenVestingData.length ? (
              <Empty className="mt-4 border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/[0.03]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-emerald-500/15 text-emerald-400">
                    <PiggyBank className="w-6 h-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">
                    {t("Vesting:card.empty")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : null}
          </>
        </div>
      </div>

      {showDialog ? (
        <DeepLinkDialog
          operationNames={["vesting_balance_withdraw"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`deeplink-dialog-${chosenVestingBalance.res.id}`}
          headerText={t("Vesting:dialogContent.header", {
            readable: chosenVestingBalance.readableBalance,
          })}
          trxJSON={[
            {
              vesting_balance: chosenVestingBalance.res.id,
              owner: usr.id,
              amount: {
                amount: chosenVestingBalance.res.balance.amount,
                asset_id: chosenVestingBalance.res.balance.asset_id,
              },
            },
          ]}
        />
      ) : null}
    </div>
  );
}
