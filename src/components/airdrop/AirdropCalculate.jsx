import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import AirdropRecipientInput from "./AirdropRecipientInput.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import ExternalLink from "@/components/common/ExternalLink.jsx";
import CurrentUser from "@/components/common/CurrentUser.jsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import SectionHeader from "@/components/asset-form/SectionHeader.jsx";
import { Users, Cog, Gift, Send, Radio, Calculator } from "lucide-react";
import { List } from "react-window";

import {
  parseRecipients,
  buildLeaderboardFromEntries,
  buildTicketLeaderboard,
  buildCallOrderLeaderboard,
  estimateTransferByteModel,
  maxRecipientsPerTx,
  sliceIntoChunks,
  getTransferFeeSat,
  estimateBatchFeeSat,
  computeAmounts,
  buildTransferOps,
} from "@/lib/airdrop.js";
import {
  executeCalculation,
  filterSignature,
  runAllAccountsLottery,
} from "@/lib/airdropAlgos.js";
import { getBlockSignature } from "@/nanoeffects/BlockSignature.ts";
import { getTickets as fetchTickets } from "@/nanoeffects/Tickets.ts";
import { getMaxObjectIDs } from "@/nanoeffects/MaxObjectID.ts";
import { getCallOrderHolders } from "@/nanoeffects/CallOrderHolders.ts";
import { getTopAssetHolders } from "@/nanoeffects/TopAssetHolders.ts";
import { getTopLimitOrderCreators, getTopLimitOrderCreatorsPair } from "@/nanoeffects/TopLimitOrderCreators.ts";
import { getTopLimitOrderFillers, getTopLimitOrderFillersPair } from "@/nanoeffects/TopLimitOrderFillers.ts";
import { getTopLifetimeMembers } from "@/nanoeffects/TopLifetimeMembers.ts";
import { getObjects } from "@/nanoeffects/src/common.ts";
import { humanReadableFloat } from "@/lib/common.js";
import { createChainParametersStore } from "@/nanoeffects/ChainParameters.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

const LOTTERY_ALGOS = [
  "forward",
  "reverse",
  "pi",
  "reverse_pi",
  "cubed",
  "avg_point_lines",
  "alien_blood",
  "bouncing_ball",
  "barrel_of_fish",
];

  const ALGOS = [
    { key: "freebie", lottery: false },
    { key: "forward", lottery: true },
    { key: "reverse", lottery: true },
    { key: "pi", lottery: true },
    { key: "reverse_pi", lottery: true },
    { key: "cubed", lottery: true },
    { key: "avg_point_lines", lottery: true },
    { key: "alien_blood", lottery: true },
    { key: "bouncing_ball", lottery: true },
    { key: "barrel_of_fish", lottery: true },
  ];

export default function AirdropCalculate(props) {
  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST, _globalParamsBTS, _globalParamsTEST } = props;

  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  const currentNode = useStore($currentNode);

  const chain = usr && usr.chain ? usr.chain : "bitshares";
  const assets = chain === "bitshares" ? _assetsBTS : _assetsTEST;
  const marketSearch = chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
  const globalParams = chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;

  // ----- candidate pool source -----
  const [poolSource, setPoolSource] = useState("manual");
  const [qtyLimit, setQtyLimit] = useState(100);
  const [pairAssetSymbol, setPairAssetSymbol] = useState();

  // timeframe for the time-windowed ES pool sources (creators / fillers / ltm)
  const [timeframe, setTimeframe] = useState("30d");
  const [timeframeDate, setTimeframeDate] = useState(undefined);

  // call-order pool: the user must pick a single smartcoin to focus on
  const [callOrderAssetSymbol, setCallOrderAssetSymbol] = useState();
  const [callOrderAssetId, setCallOrderAssetId] = useState(undefined);
  const [callOrderAssetChecking, setCallOrderAssetChecking] = useState(false);
  const [callOrderAssetIsSmartcoin, setCallOrderAssetIsSmartcoin] = useState(false);
  const [callOrderFeedPrice, setCallOrderFeedPrice] = useState(null);
  const [callOrderCollateralPrecision, setCallOrderCollateralPrecision] = useState(5);
  const [callOrderDebtPrecision, setCallOrderDebtPrecision] = useState(5);

  // manual
  const [rawText, setRawText] = useState("");
  const parsed = useMemo(() => parseRecipients(rawText), [rawText]);
  const manualAccounts = useMemo(
    () => [...new Set(parsed.recipients.map((r) => r.account))],
    [parsed],
  );

  // shared pool state
  const [enriching, setEnriching] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [poolCount, setPoolCount] = useState(0);
  const [maxAccountId, setMaxAccountId] = useState(null);
  const [syntheticAll, setSyntheticAll] = useState(false);
  const [poolError, setPoolError] = useState(null);
  const [rawCallOrders, setRawCallOrders] = useState([]);
  const [callOrderWeightBy, setCallOrderWeightBy] = useState("collateral");

  const [weightAssetSymbol, setWeightAssetSymbol] = useState();
  const weightAsset = useMemo(
    () => (weightAssetSymbol ? assets.find((a) => a.symbol === weightAssetSymbol) : undefined),
    [weightAssetSymbol, assets],
  );

  const resetPool = () => {
    setLeaderboard(null);
    setPoolCount(0);
    setMaxAccountId(null);
    setSyntheticAll(false);
    setPoolError(null);
    setRawCallOrders([]);
    setCallOrderWeightBy("collateral");
    setCallOrderAssetSymbol(undefined);
    setCallOrderAssetId(undefined);
    setCallOrderAssetIsSmartcoin(false);
    setCallOrderAssetChecking(false);
    setCallOrderFeedPrice(null);
  };

  const handleCallOrderAssetChange = async (symbol) => {
    setCallOrderAssetSymbol(symbol);
    setCallOrderAssetId(undefined);
    setCallOrderAssetIsSmartcoin(false);
    setCallOrderFeedPrice(null);
    if (!symbol) return;
    const asset = assets.find((a) => a.symbol === symbol);
    if (!asset || !asset.id) return;
    setCallOrderAssetChecking(true);
    try {
      const objs = await getObjects(chain, [asset.id], currentNode ? currentNode.url : null);
      const obj = objs && objs[0];
      if (obj && obj.bitasset_data_id) {
        setCallOrderAssetId(obj.id);
        setCallOrderAssetIsSmartcoin(true);
        setCallOrderDebtPrecision(asset.precision || 5);
        const bitassetObjs = await getObjects(
          chain,
          [obj.bitasset_data_id],
          currentNode ? currentNode.url : null,
        );
        const bitasset = bitassetObjs && bitassetObjs[0];
        if (bitasset && bitasset.current_feed && bitasset.current_feed.settlement_price) {
          const collateralObjs = await getObjects(
            chain,
            [bitasset.options?.collateral_asset || "1.3.0"],
            currentNode ? currentNode.url : null,
          );
          const collateralAsset = collateralObjs && collateralObjs[0];
          const collateralPrecision = collateralAsset ? (collateralAsset.precision || 5) : 5;
          setCallOrderCollateralPrecision(collateralPrecision);
          const quoteAmount = parseInt(bitasset.current_feed.settlement_price.quote.amount, 10);
          const baseAmount = parseInt(bitasset.current_feed.settlement_price.base.amount, 10);
          if (quoteAmount && baseAmount) {
            const feedPrice = parseFloat(
              (
                humanReadableFloat(quoteAmount, collateralPrecision) /
                humanReadableFloat(baseAmount, asset.precision || 5)
              ).toFixed(collateralPrecision),
            );
            setCallOrderFeedPrice(feedPrice);
          }
        }
      } else {
        setCallOrderAssetIsSmartcoin(false);
      }
    } catch (e) {
      console.log(e);
      setCallOrderAssetIsSmartcoin(false);
    } finally {
      setCallOrderAssetChecking(false);
    }
  };

  const isTimeframedSource = (src) =>
    src === "creators" ||
    src === "fillers" ||
    src === "creatorspair" ||
    src === "fillerspair" ||
    src === "ltm";

  const lookbackDaysFromTimeframe = () => {
    if (timeframe === "specific") return 365 * 10;
    return Number(timeframe.replace("d", "")) || 30;
  };
  const fromTimestampFromTimeframe = () =>
    timeframe === "specific" && timeframeDate ? timeframeDate.getTime() : undefined;

  const applyWeightedEntries = (entries) => {
    setLeaderboard(buildLeaderboardFromEntries(entries));
    setPoolCount(entries.length);
  };

  const handleLoad = async () => {
    setEnriching(true);
    setPoolError(null);
    try {
      if (poolSource === "manual") {
        if (!manualAccounts.length) return;
        setLeaderboard(
          buildLeaderboardFromEntries(
            manualAccounts.map((id) => ({ id, weight: 1 })),
          ),
        );
        setPoolCount(manualAccounts.length);
      } else if (poolSource === "tickets") {
        const tickets = await fetchTickets(chain, 0, currentNode ? currentNode.url : null);
        const filtered = (tickets || []).filter(
          (x) => x.target_type !== "liquid" && x.current_type !== "liquid",
        );
        const tallies = {};
        for (const tk of filtered) {
          const acct = tk.account;
          let amt = parseInt(tk.amount?.amount ?? 0, 10);
          let boost = 1;
          switch (tk.target_type ?? tk.current_type) {
            case "lock_180_days":
              boost = 2;
              break;
            case "lock_360_days":
              boost = 4;
              break;
            case "lock_720_days":
              boost = 8;
              break;
            case "lock_forever":
              boost = 8;
              break;
            default:
              amt = 0;
          }
          if (!amt || !acct) continue;
          const hr = parseFloat(humanReadableFloat(amt, 5).toFixed(5)) * boost;
          tallies[acct] = (tallies[acct] || 0) + hr;
        }
        const entries = Object.entries(tallies).map(([id, weight]) => ({ id, weight }));
        setLeaderboard(buildLeaderboardFromEntries(entries));
        setPoolCount(entries.length);
      } else if (poolSource === "callorders") {
        if (!callOrderAssetId || !callOrderAssetIsSmartcoin) {
          setPoolError(t("AirdropCalculate:pool.needSmartcoin"));
          return;
        }
        const callOrders = await getCallOrderHolders(
          chain,
          currentNode ? currentNode.url : null,
          callOrderAssetId,
        );
        setRawCallOrders(callOrders);
        const entries = Object.entries(
          callOrders.reduce((acc, co) => {
            if (!co || !co.id) return acc;
            const weightField = callOrderWeightBy === "debt" ? "debt" : "collateral";
            acc[co.id] = (acc[co.id] || 0) + (co[weightField] || 0);
            return acc;
          }, {}),
        ).map(([id, weight]) => ({ id, weight }));
        setLeaderboard(buildLeaderboardFromEntries(entries));
        setPoolCount(entries.length);
      } else if (poolSource === "allaccounts") {
        const max = await getMaxObjectIDs(chain, 1, 2, currentNode ? currentNode.url : null);
        setMaxAccountId(max);
        setSyntheticAll(true);
        setLeaderboard(null);
        setPoolCount(max);
      } else if (poolSource === "assetholders") {
        if (chain !== "bitshares") return;
        if (!airdropAsset) {
          setPoolError(t("AirdropCalculate:pool.needAsset"));
          return;
        }
        const holders = await getTopAssetHolders(airdropAsset.id, qtyLimit);
        await applyWeightedEntries(
          holders.map((h) => ({ id: h.id, weight: h.balance })),
        );
      } else if (poolSource === "creators") {
        if (chain !== "bitshares") return;
        if (!airdropAsset) {
          setPoolError(t("AirdropCalculate:pool.needAsset"));
          return;
        }
        const creators = await getTopLimitOrderCreators(
          airdropAsset.id,
          qtyLimit,
          lookbackDaysFromTimeframe(),
          fromTimestampFromTimeframe(),
        );
        await applyWeightedEntries(
          creators.map((c) => ({ id: c.id, weight: c.count })),
        );
      } else if (poolSource === "fillers") {
        if (chain !== "bitshares") return;
        if (!airdropAsset) {
          setPoolError(t("AirdropCalculate:pool.needAsset"));
          return;
        }
        const fillers = await getTopLimitOrderFillers(
          airdropAsset.id,
          qtyLimit,
          lookbackDaysFromTimeframe(),
          fromTimestampFromTimeframe(),
        );
        await applyWeightedEntries(
          fillers.map((f) => ({ id: f.id, weight: f.count })),
        );
      } else if (poolSource === "creatorspair") {
        if (chain !== "bitshares") return;
        if (!airdropAsset || !pairAsset) {
          setPoolError(t("AirdropCalculate:pool.needPair"));
          return;
        }
        const creators = await getTopLimitOrderCreatorsPair(
          airdropAsset.id,
          pairAsset.id,
          qtyLimit,
          lookbackDaysFromTimeframe(),
          fromTimestampFromTimeframe(),
        );
        await applyWeightedEntries(
          creators.map((c) => ({ id: c.id, weight: c.count })),
        );
      } else if (poolSource === "fillerspair") {
        if (chain !== "bitshares") return;
        if (!airdropAsset || !pairAsset) {
          setPoolError(t("AirdropCalculate:pool.needPair"));
          return;
        }
        const fillers = await getTopLimitOrderFillersPair(
          airdropAsset.id,
          pairAsset.id,
          qtyLimit,
          lookbackDaysFromTimeframe(),
          fromTimestampFromTimeframe(),
        );
        await applyWeightedEntries(
          fillers.map((f) => ({ id: f.id, weight: f.count })),
        );
      } else if (poolSource === "ltm") {
        if (chain !== "bitshares") return;
        const upgraders = await getTopLifetimeMembers(
          qtyLimit,
          lookbackDaysFromTimeframe(),
          fromTimestampFromTimeframe(),
        );
        await applyWeightedEntries(
          upgraders.map((u) => ({ id: u.id, weight: u.count })),
        );
      }
    } catch (error) {
      console.log({ poolError: error });
      setPoolError(String(error && error.message ? error.message : error));
    } finally {
      setEnriching(false);
    }
  };

  // ----- airdrop asset -----
  const [airdropAssetSymbol, setAirdropAssetSymbol] = useState();
  const airdropAsset = useMemo(
    () => (airdropAssetSymbol ? assets.find((a) => a.symbol === airdropAssetSymbol) : undefined),
    [airdropAssetSymbol, assets],
  );
  const pairAsset = useMemo(
    () => (pairAssetSymbol ? assets.find((a) => a.symbol === pairAssetSymbol) : undefined),
    [pairAssetSymbol, assets],
  );

  // ----- algorithm selection -----
  const [selected, setSelected] = useState({});
  const toggleAlgo = (key) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const selectedKeys = useMemo(
    () => ALGOS.filter((a) => selected[a.key]).map((a) => a.key),
    [selected],
  );
  const needsSignature = useMemo(
    () => selectedKeys.some((k) => LOTTERY_ALGOS.includes(k)),
    [selectedKeys],
  );

  const [bofProjectile, setBofProjectile] = useState("beam");
  const [bofSplinter, setBofSplinter] = useState("yes");

  const [blockNumber, setBlockNumber] = useState("1");
  const [deduplicate, setDeduplicate] = useState("Yes");
  const [alwaysWinning, setAlwaysWinning] = useState("Yes");

  // ----- execute step (merged from AirdropPerform) -----
  const [showExecute, setShowExecute] = useState(false);
  const [executeBatchSize, setExecuteBatchSize] = useState(0);
  const [broadcastBatches, setBroadcastBatches] = useState([]);
  const [executeDialogBatch, setExecuteDialogBatch] = useState(null);

  // ----- chain params for batch sizing -----
  const [chainParams, setChainParams] = useState({
    maxBytes: 2_000_000,
    transferFeeSat: 20,
    pricePerKbyteSat: 10,
  });
  const [byteModel, setByteModel] = useState(null);
  useEffect(() => {
    let active = true;
    estimateTransferByteModel().then((model) => {
      if (active) setByteModel(model);
    });
    return () => {
      active = false;
    };
  }, []);
  const maxPerTx = useMemo(
    () => (byteModel ? maxRecipientsPerTx(chainParams.maxBytes, byteModel) : 50),
    [byteModel, chainParams],
  );
  useEffect(() => {
    const offlineFee = getTransferFeeSat(globalParams);
    if (!currentNode) return;
    const store = createChainParametersStore([chain, currentNode.url]);
    const sub = store.subscribe(({ data, error, loading }) => {
      if (data && !error && !loading) {
        setChainParams({
          maxBytes: data.maxBytes || 2_000_000,
          transferFeeSat: data.transferFeeSat || offlineFee.fee,
          pricePerKbyteSat: data.pricePerKbyteSat || offlineFee.pricePerKbyte,
        });
      }
    });
    return () => sub();
  }, [chain, currentNode, globalParams]);

  // ----- run -----
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState(null);

  const handleRun = async () => {
    setRunError(null);

    if (syntheticAll) {
      const lotteryKeys = selectedKeys.filter((k) => LOTTERY_ALGOS.includes(k));
      const freebieSelected = selectedKeys.includes("freebie");
      if (!lotteryKeys.length && !freebieSelected) {
        setRunError(t("AirdropCalculate:errors.lotteryOnly"));
        return;
      }
      if (!maxAccountId || maxAccountId < 1) {
        setRunError(t("AirdropCalculate:errors.noBlock"));
        return;
      }
      setRunning(true);
      try {
        // "everyone" against the full account space = all accounts.
        if (freebieSelected) {
          const all = [];
          for (let i = 1; i <= maxAccountId; i++) {
            all.push({ id: `1.2.${i}`, name: undefined, qty: 1, ticketsValue: 1, percent: "0" });
          }
          setResult(all);
          return;
        }
        const sig = await getBlockSignature(
          chain,
          blockNumber,
          currentNode ? currentNode.url : null,
        );
        const summary = runAllAccountsLottery(
          lotteryKeys,
          filterSignature(sig),
          maxAccountId,
        );
        setResult(summary);
      } catch (error) {
        console.log({ runError: error });
        setRunError(String(error && error.message ? error.message : error));
      } finally {
        setRunning(false);
      }
      return;
    }

    if (!leaderboard || !leaderboard.length) {
      setRunError(t("AirdropCalculate:errors.noPool"));
      return;
    }
    if (!selectedKeys.length) {
      setRunError(t("AirdropCalculate:errors.noAlgo"));
      return;
    }
    if (needsSignature && (!blockNumber || parseInt(blockNumber, 10) < 0)) {
      setRunError(t("AirdropCalculate:errors.noBlock"));
      return;
    }
    setRunning(true);
    try {
      let filteredSignature = "";
      if (needsSignature) {
        const sig = await getBlockSignature(
          chain,
          blockNumber,
          currentNode ? currentNode.url : null,
        );
        filteredSignature = filterSignature(sig);
      }
      const opts = {
        bof_projectile: bofProjectile,
        bof_splinter: bofSplinter,
        relevantAssets: assets,
      };
      const { summary } = executeCalculation(
        filteredSignature,
        selectedKeys,
        deduplicate,
        alwaysWinning,
        leaderboard,
        opts,
      );
      setResult(summary);
    } catch (error) {
      console.log({ runError: error });
      setRunError(String(error && error.message ? error.message : error));
    } finally {
      setRunning(false);
    }
  };

  // ----- save as plan → show execute step -----
  const [saving, setSaving] = useState(false);
  const handleSave = () => {
    if (!result || !result.length || !airdropAsset || !usr || !usr.id) return;
    setSaving(true);
    const precision = airdropAsset.precision || 0;
    const recipients = result.map((row) => {
      const humanAmount = Number(row.ticketsValue) || 0;
      return {
        account: row.id,
        humanAmount,
        satoshis: Math.round(humanAmount * 10 ** precision),
      };
    });
    const batchSize = maxPerTx || 50;
    setExecuteBatchSize(batchSize);
    setBroadcastBatches([]);
    setShowExecute(true);
    setSaving(false);
  };

  // ----- compute batches for execute step -----
  const executeRecipients = useMemo(() => {
    if (!result || !airdropAsset) return [];
    const precision = airdropAsset.precision || 0;
    return result.map((row) => {
      const humanAmount = Number(row.ticketsValue) || 0;
      return {
        account: row.id,
        humanAmount,
        satoshis: Math.round(humanAmount * 10 ** precision),
      };
    });
  }, [result, airdropAsset]);

  const executeBatches = useMemo(
    () => (executeBatchSize > 0 ? sliceIntoChunks(executeRecipients, executeBatchSize) : []),
    [executeRecipients, executeBatchSize],
  );

  const executeBatchMetrics = useMemo(() => {
    return executeBatches.map((batch) => {
      const n = batch.length;
      const bytes = byteModel ? byteModel.header + byteModel.perOp * n : 0;
      const fee = estimateBatchFeeSat(
        n,
        chainParams.transferFeeSat,
        chainParams.pricePerKbyteSat,
        bytes,
      );
      return { bytes, fee };
    });
  }, [executeBatches, byteModel, chainParams]);

  const executeProgressPct =
    executeBatches.length > 0
      ? Math.round((broadcastBatches.length / executeBatches.length) * 100)
      : 0;

  const toggleBroadcast = (index) => {
    setBroadcastBatches((prev) => {
      const next = prev.includes(index)
        ? prev.filter((x) => x !== index)
        : [...prev, index];
      return next;
    });
  };

  const POOL_METRIC_KEY = {
    manual: "weight",
    tickets: "locked",
    callorders: "collateral",
    assetholders: "balance",
    creators: "orders",
    creatorspair: "orders",
    fillers: "fills",
    fillerspair: "fills",
    ltm: "upgrades",
  };

  const PoolRow = ({ index, style, items, label }) => {
    const row = items[index];
    if (!row) return null;
    return (
      <div style={style} className="px-2">
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
          <ExternalLink
            hyperlink={`https://blocksights.info/#/accounts/${row.id}`}
            type="text"
            text={row.name || row.id}
            classnamecontents="font-mono text-[11px] text-foreground/80 hover:text-foreground truncate"
          />
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {label}: {Number(row.amount || 0).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const CallOrderRow = ({ index, style, items }) => {
    const row = items[index];
    if (!row) return null;
    const collateralHRT = humanReadableFloat(row.collateral || 0, callOrderCollateralPrecision);
    const debtAsset = assets.find((a) => a.id === callOrderAssetId);
    const debtPrecision = debtAsset ? debtAsset.precision : callOrderDebtPrecision;
    const debtHRT = humanReadableFloat(row.debt || 0, debtPrecision);
    const tcr = row.target_collateral_ratio
      ? `${(row.target_collateral_ratio / 10).toFixed(1)}%`
      : "0%";
    const ratio = debtHRT > 0 && callOrderFeedPrice
      ? (collateralHRT / (callOrderFeedPrice * debtHRT)).toFixed(3)
      : debtHRT > 0
        ? (collateralHRT / debtHRT).toFixed(3)
        : "0";
    return (
      <div style={style} className="px-2">
        <div className="grid grid-cols-6 items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-xs">
          <div className="col-span-2 truncate">
            <ExternalLink
              hyperlink={`https://blocksights.info/#/accounts/${row.id}`}
              type="text"
              text={row.id}
              classnamecontents="font-mono text-[11px] text-foreground/80 hover:text-foreground truncate"
            />
          </div>
          <div className="col-span-1 text-right font-bold font-mono">
            {collateralHRT.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
          </div>
          <div className="col-span-1 text-right font-mono text-muted-foreground">
            {debtHRT.toLocaleString(undefined, { minimumFractionDigits: debtPrecision, maximumFractionDigits: debtPrecision })}
          </div>
          <div className="col-span-1 text-right font-mono text-muted-foreground">
            {tcr}
          </div>
          <div className="col-span-1 text-right font-mono text-muted-foreground">
            {ratio}
          </div>
        </div>
      </div>
    );
  };

  const WinnerRow = ({ index, style, items, leaderboardById }) => {
    const row = items[index];
    if (!row) return null;
    const weight = leaderboardById[row.id] ?? 0;
    return (
      <div style={style} className="px-2">
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
          <ExternalLink
            hyperlink={`https://blocksights.info/#/accounts/${row.id}`}
            type="text"
            text={row.name || row.id}
            classnamecontents="font-mono text-[11px] text-foreground/80 hover:text-foreground truncate"
          />
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-20 text-right">
            {Number(row.qty || 0).toLocaleString()}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-28 text-right">
            {Number(row.ticketsValue || 0).toLocaleString()}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-28 text-right">
            {Number(weight || 0).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-3 mb-8 px-3 sm:px-4 space-y-6">
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl px-6 py-5 shadow-lg shadow-black/20 ring-1 dark:ring-white/[0.06] ring-border">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-1-fg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.1)] ring-1 ring-[hsl(var(--accent-1)/0.3)]">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("AirdropCalculate:page.title")}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("AirdropCalculate:page.description")}
              </p>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <SectionHeader
            icon={Users}
            step={1}
            title={t("AirdropCalculate:pool.title")}
            description={t("AirdropCalculate:pool.description")}
          />
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="sm:max-w-sm">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                {t("AirdropCalculate:pool.source")}
              </Label>
              <Select value={poolSource} onValueChange={(v) => { setPoolSource(v); resetPool(); }}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="manual">
                    {t("AirdropCalculate:pool.source.manual")}
                  </SelectItem>
                  <SelectItem value="allaccounts">
                    {t("AirdropCalculate:pool.source.allaccounts")}
                  </SelectItem>
                  <SelectItem value="tickets">
                    {t("AirdropCalculate:pool.source.tickets")}
                  </SelectItem>
                  <SelectItem value="callorders">
                    {t("AirdropCalculate:pool.source.callorders")}
                  </SelectItem>
                  {chain === "bitshares" && (
                    <SelectItem value="assetholders">
                      {t("AirdropCalculate:pool.source.assetholders")}
                    </SelectItem>
                  )}
                  {chain === "bitshares" && (
                    <SelectItem value="creators">
                      {t("AirdropCalculate:pool.source.creators")}
                    </SelectItem>
                  )}
                  {chain === "bitshares" && (
                    <SelectItem value="fillers">
                      {t("AirdropCalculate:pool.source.fillers")}
                    </SelectItem>
                  )}
                  {chain === "bitshares" && (
                    <SelectItem value="creatorspair">
                      {t("AirdropCalculate:pool.source.creatorspair")}
                    </SelectItem>
                  )}
                  {chain === "bitshares" && (
                    <SelectItem value="fillerspair">
                      {t("AirdropCalculate:pool.source.fillerspair")}
                    </SelectItem>
                  )}
                  {chain === "bitshares" && (
                    <SelectItem value="ltm">
                      {t("AirdropCalculate:pool.source.ltm")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {poolSource === "callorders" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:pool.callOrderAsset")}
                  </Label>
                  <div className="mt-2 max-w-sm">
                    <AssetDropDown
                      assetSymbol={callOrderAssetSymbol ?? ""}
                      assetData={null}
                      storeCallback={handleCallOrderAssetChange}
                      otherAsset={null}
                      marketSearch={marketSearch}
                      type={null}
                      chain={chain}
                      balances={null}
                      size="small"
                      triggerVariant="outline"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("AirdropCalculate:pool.callOrderAssetHint")}
                  </p>
                </div>
              </div>
            )}

            {chain === "bitshares" &&
              (poolSource === "assetholders" ||
                poolSource === "creators" ||
                poolSource === "fillers" ||
                poolSource === "creatorspair" ||
                poolSource === "fillerspair" ||
                poolSource === "ltm") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(poolSource === "assetholders" ||
                  poolSource === "creators" ||
                  poolSource === "fillers" ||
                  poolSource === "creatorspair" ||
                  poolSource === "fillerspair") && (
                  <div>
                    <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                      {t("AirdropCalculate:pool.asset")}
                    </Label>
                    <div className="mt-2 max-w-sm">
                      <AssetDropDown
                        assetSymbol={airdropAssetSymbol ?? ""}
                        assetData={null}
                        storeCallback={setAirdropAssetSymbol}
                        otherAsset={null}
                        marketSearch={marketSearch}
                        type={null}
                        chain={chain}
                        balances={null}
                        size="small"
                      triggerVariant="outline"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("AirdropCalculate:pool.assetHint")}
                    </p>
                  </div>
                )}
                {(poolSource === "creatorspair" || poolSource === "fillerspair") && (
                  <div>
                    <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                      {t("AirdropCalculate:pool.pairAsset")}
                    </Label>
                    <div className="mt-2 max-w-sm">
                      <AssetDropDown
                        assetSymbol={pairAssetSymbol ?? ""}
                        assetData={null}
                        storeCallback={setPairAssetSymbol}
                        otherAsset={null}
                        marketSearch={marketSearch}
                        type={null}
                        chain={chain}
                        balances={null}
                        size="small"
                      triggerVariant="outline"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("AirdropCalculate:pool.pairAssetHint")}
                    </p>
                  </div>
                )}
                {isTimeframedSource(poolSource) && (
                  <div>
                    <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                      {t("AirdropCalculate:pool.timeframe")}
                    </Label>
                    <Select value={timeframe} onValueChange={(v) => setTimeframe(v)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="1d">
                          {t("AirdropCalculate:pool.timeframe.1d")}
                        </SelectItem>
                        <SelectItem value="7d">
                          {t("AirdropCalculate:pool.timeframe.7d")}
                        </SelectItem>
                        <SelectItem value="30d">
                          {t("AirdropCalculate:pool.timeframe.30d")}
                        </SelectItem>
                        <SelectItem value="365d">
                          {t("AirdropCalculate:pool.timeframe.365d")}
                        </SelectItem>
                        <SelectItem value="specific">
                          {t("AirdropCalculate:pool.timeframe.specific")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {timeframe === "specific" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="mt-2 w-full justify-start text-left font-normal border-border bg-accent/40 text-foreground/85 hover:bg-accent/60 hover:text-accent-foreground"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {timeframeDate
                              ? format(timeframeDate, "PPP")
                              : t("AirdropCalculate:pool.timeframe.pickDate")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[350px] bg-card border border-border rounded-2xl p-0">
                          <Calendar
                            mode="single"
                            selected={timeframeDate}
                            onSelect={setTimeframeDate}
                            disabled={{ after: new Date() }}
                            initialFocus
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:pool.qtyLimit")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={qtyLimit}
                    onChange={(e) =>
                      setQtyLimit(
                        Math.max(1, Math.min(1000, parseInt(e.target.value || "1", 10))),
                      )
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("AirdropCalculate:pool.qtyLimitHint")}
                  </p>
                </div>
              </div>
            )}

            {(chain === "bitshares" &&
              (poolSource === "assetholders" ||
                poolSource === "creators" ||
                poolSource === "fillers" ||
                poolSource === "creatorspair" ||
                poolSource === "fillerspair") &&
              !airdropAsset) && (
              <p className="text-xs text-destructive">
                {t("AirdropCalculate:pool.needAsset")}
              </p>
            )}
            {(chain === "bitshares" &&
              (poolSource === "creatorspair" || poolSource === "fillerspair") &&
              !pairAsset) && (
              <p className="text-xs text-destructive">
                {t("AirdropCalculate:pool.needPair")}
              </p>
            )}

            {chain === "bitshares" &&
              poolSource === "callorders" &&
              callOrderAssetSymbol &&
              !callOrderAssetChecking &&
              !callOrderAssetIsSmartcoin && (
                <p className="text-xs text-destructive">
                  {t("AirdropCalculate:pool.notSmartcoin")}
                </p>
              )}

            {poolSource === "manual" && (
              <>
                <AirdropRecipientInput
                  rawText={rawText}
                  setRawText={setRawText}
                  recipients={parsed.recipients}
                  errors={parsed.errors}
                  warnings={parsed.warnings}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                      {t("AirdropCalculate:pool.weightAsset")}
                    </Label>
                    <div className="mt-2 max-w-sm">
                      <AssetDropDown
                        assetSymbol={weightAssetSymbol ?? ""}
                        assetData={null}
                        storeCallback={setWeightAssetSymbol}
                        otherAsset={null}
                        marketSearch={marketSearch}
                        type={null}
                        chain={chain}
                        balances={null}
                        size="small"
                      triggerVariant="outline"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("AirdropCalculate:pool.weightAssetHint")}
                    </p>
                  </div>
                </div>
              </>
            )}

            {poolSource === "allaccounts" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.allAccountsHint")}
              </p>
            )}

            {poolSource === "tickets" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.ticketsHint")}
              </p>
            )}

            {poolSource === "callorders" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.callOrdersHint")}
              </p>
            )}

            {poolSource === "assetholders" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.assetHoldersHint")}
              </p>
            )}

            {poolSource === "creators" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.creatorsHint")}
              </p>
            )}

            {poolSource === "fillers" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.fillersHint")}
              </p>
            )}

            {poolSource === "creatorspair" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.creatorsPairHint")}
              </p>
            )}

            {poolSource === "fillerspair" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.fillersPairHint")}
              </p>
            )}

            {poolSource === "ltm" && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:pool.ltmHint")}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
                onClick={handleLoad}
                disabled={
                  enriching ||
                  (poolSource === "callorders" &&
                    (!callOrderAssetId || !callOrderAssetIsSmartcoin))
                }
              >
                {enriching
                  ? t("AirdropCalculate:pool.loading")
                  : t("AirdropCalculate:pool.load")}
              </Button>
              {poolCount > 0 && (
                <Badge variant="secondary">
                  {syntheticAll
                    ? t("AirdropCalculate:pool.accountsLoaded", { count: poolCount })
                    : t("AirdropCalculate:pool.loaded", { count: poolCount })}
                </Badge>
              )}
              {poolError && <Badge variant="destructive">{poolError}</Badge>}
              {poolSource === "callorders" && poolCount > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider whitespace-nowrap">
                    {t("AirdropCalculate:pool.weightBy")}
                  </Label>
                  <Select value={callOrderWeightBy} onValueChange={(v) => {
                    setCallOrderWeightBy(v);
                    // Rebuild leaderboard with new weight field
                    const entries = Object.entries(
                      rawCallOrders.reduce((acc, co) => {
                        if (!co || !co.id) return acc;
                        const weightField = v === "debt" ? "debt" : "collateral";
                        acc[co.id] = (acc[co.id] || 0) + (co[weightField] || 0);
                        return acc;
                      }, {}),
                    ).map(([id, weight]) => ({ id, weight }));
                    setLeaderboard(buildLeaderboardFromEntries(entries));
                  }}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="collateral">
                        {t("AirdropCalculate:pool.weightByCollateral")}
                      </SelectItem>
                      <SelectItem value="debt">
                        {t("AirdropCalculate:pool.weightByDebt")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!syntheticAll && leaderboard && leaderboard.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:preview.title")}
                  </Label>
                  <Badge variant="outline">
                    {t("AirdropCalculate:preview.count", { count: leaderboard.length })}
                  </Badge>
                </div>
                <div className="w-full border border-border/60 rounded-xl overflow-hidden bg-card/30">
                  {poolSource === "callorders" && rawCallOrders.length > 0 ? (
                    <>
                      <div className="grid grid-cols-6 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border/40">
                        <div className="col-span-2">Borrower</div>
                        <div className={"col-span-1 text-right" + (callOrderWeightBy === "collateral" ? " font-bold text-foreground" : "")}>Collateral</div>
                        <div className={"col-span-1 text-right" + (callOrderWeightBy === "debt" ? " font-bold text-foreground" : "")}>Debt</div>
                        <div className="col-span-1 text-right">TCR</div>
                        <div className="col-span-1 text-right">Ratio</div>
                      </div>
                      <List
                        rowComponent={CallOrderRow}
                        rowCount={rawCallOrders.length}
                        rowHeight={52}
                        rowProps={{ items: rawCallOrders }}
                        style={{ height: Math.min(360, rawCallOrders.length * 52) }}
                      />
                    </>
                  ) : (
                    <List
                      rowComponent={PoolRow}
                      rowCount={leaderboard.length}
                      rowHeight={52}
                      rowProps={{
                        items: leaderboard,
                        label: t("AirdropCalculate:preview." + (POOL_METRIC_KEY[poolSource] || "weight")),
                      }}
                      style={{ height: 360 }}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <SectionHeader
            icon={Cog}
            step={2}
            title={t("AirdropCalculate:algos.title")}
            description={t("AirdropCalculate:algos.description")}
          />
          <div className={poolCount === 0 && !syntheticAll ? "pointer-events-none opacity-50" : ""}>
          <CardContent className="grid grid-cols-1 gap-2">
            {ALGOS.map((algo) => (
              <label
                key={algo.key}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-accent/10 px-3 py-2 cursor-pointer hover:border-[hsl(var(--accent-1)/0.3)]"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={!!selected[algo.key]}
                  onCheckedChange={() => toggleAlgo(algo.key)}
                />
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium text-foreground/90">
                    {t(`AirdropCalculate:algos.${algo.key}.name`)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(`AirdropCalculate:algos.${algo.key}.desc`)}
                  </span>
                </div>
              </label>
            ))}

            {selected.barrel_of_fish && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 rounded-lg border border-border/60 bg-card/30">
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:algos.barrel_of_fish.projectile")}
                  </Label>
                  <Select value={bofProjectile} onValueChange={setBofProjectile}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="beam">
                        {t("AirdropCalculate:algos.barrel_of_fish.beam")}
                      </SelectItem>
                      <SelectItem value="slow">
                        {t("AirdropCalculate:algos.barrel_of_fish.slow")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:algos.barrel_of_fish.splinter")}
                  </Label>
                  <Select value={bofSplinter} onValueChange={setBofSplinter}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="yes">
                        {t("AirdropCalculate:algos.barrel_of_fish.yes")}
                      </SelectItem>
                      <SelectItem value="no">
                        {t("AirdropCalculate:algos.barrel_of_fish.no")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {needsSignature && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 rounded-lg border border-border/60 bg-card/30">
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("AirdropCalculate:block.title")}
                  </Label>
                  <Input
                    className="mt-2"
                    type="number"
                    value={blockNumber}
                    onChange={(e) => setBlockNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("AirdropCalculate:block.description")}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                  {t("AirdropCalculate:options.deduplicate")}
                </Label>
                <Select value={deduplicate} onValueChange={setDeduplicate}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="Yes">
                      {t("AirdropCalculate:options.yes")}
                    </SelectItem>
                    <SelectItem value="No">
                      {t("AirdropCalculate:options.no")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                  {t("AirdropCalculate:options.alwaysWinning")}
                </Label>
                <Select value={alwaysWinning} onValueChange={setAlwaysWinning}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="Yes">
                      {t("AirdropCalculate:options.yes")}
                    </SelectItem>
                    <SelectItem value="No">
                      {t("AirdropCalculate:options.no")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
                onClick={handleRun}
                disabled={running || (!syntheticAll && !poolCount)}
              >
                {running
                  ? t("AirdropCalculate:run.running")
                  : t("AirdropCalculate:run.run")}
              </Button>
              {runError && <Badge variant="destructive">{runError}</Badge>}
            </div>
          </CardContent>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <SectionHeader
            icon={Gift}
            step={3}
            title={t("AirdropCalculate:result.title")}
            description={t("AirdropCalculate:result.description")}
          />
          <div className={!result ? "pointer-events-none opacity-50" : ""}>
          <CardContent className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                {t("AirdropCalculate:result.asset")}
              </Label>
              <div className="mt-2 max-w-sm">
                <AssetDropDown
                  assetSymbol={airdropAssetSymbol ?? ""}
                  assetData={null}
                  storeCallback={setAirdropAssetSymbol}
                  otherAsset={null}
                  marketSearch={marketSearch}
                  type={null}
                  chain={chain}
                  balances={null}
                  size="small"
                  triggerVariant="outline"
                />
              </div>
            </div>

            {result && result.length > 0 && (
              <>
                <Badge variant="secondary">
                  {t("AirdropCalculate:result.winners", { count: result.length })}
                </Badge>
                <div className="mt-3">
                  <div className="flex items-center px-3 py-1.5 text-xs text-muted-foreground font-medium">
                    <span className="flex-1 min-w-0">{t("AirdropCalculate:result.account")}</span>
                    <span className="w-20 text-right">{t("AirdropCalculate:result.qty")}</span>
                    <span className="w-28 text-right">{t("AirdropCalculate:result.amount")}</span>
                    <span className="w-28 text-right">{t("AirdropCalculate:result.weight")}</span>
                  </div>
                  <div className="w-full border border-border/60 rounded-xl overflow-hidden bg-card/30">
                    <List
                      rowComponent={WinnerRow}
                      rowCount={result.length}
                      rowHeight={52}
                      rowProps={{
                        items: result,
                        leaderboardById: leaderboard
                          ? Object.fromEntries(leaderboard.map((l) => [l.id, l.amount]))
                          : {},
                      }}
                      style={{ height: 420 }}
                    />
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
                  onClick={handleSave}
                  disabled={saving || !airdropAsset}
                >
                  {t("AirdropCalculate:result.save")}
                </Button>
              </>
            )}
            {result && result.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("AirdropCalculate:result.none")}
              </p>
            )}
          </CardContent>
          </div>
        </Card>

        <Card className={`relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]${!showExecute || executeBatches.length === 0 ? " pointer-events-none opacity-50" : ""}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
            <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
            <SectionHeader
              icon={Radio}
              step={4}
              title={t("Airdrop:perform.senderTitle")}
              description={t("Airdrop:perform.senderDescription")}
            />
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <CurrentUser />
                </div>
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("Airdrop:perform.batchSize")}
                  </Label>
                  <Input
                    className="mt-1 bg-card/40"
                    type="number"
                    value={executeBatchSize}
                    max={maxPerTx || undefined}
                    onChange={(e) =>
                      setExecuteBatchSize(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                  {maxPerTx !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Airdrop:perform.maxPerTx", { max: maxPerTx })}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                    {t("Airdrop:perform.progress")}
                  </Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={executeProgressPct} className="h-2" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {executeProgressPct}% ({broadcastBatches.length}/{executeBatches.length})
                    </span>
                  </div>
                </div>
              </div>

              {!usr || !usr.id ? (
                <Card className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-danger)/0.4)] bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-danger)/0.15)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-danger)/0.7)] to-transparent" />
                  <CardContent className="py-4 text-sm text-[hsl(var(--accent-danger-fg))]">
                    {t("Airdrop:perform.connectRequired")}
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                {executeBatches.map((batch, i) => {
                  const bytes = executeBatchMetrics[i]?.bytes || 0;
                  const fee = executeBatchMetrics[i]?.fee || 0;
                  const totalAmount = batch.reduce(
                    (acc, r) => acc + humanReadableFloat(r.satoshis || 0, airdropAsset?.precision || 0),
                    0,
                  );
                  const pct = bytes && chainParams.maxBytes
                    ? Math.min(100, (bytes / chainParams.maxBytes) * 100)
                    : 0;
                  const isBroadcasted = broadcastBatches.includes(i);
                  const coreSymbol = chain === "bitshares" ? "BTS" : "TEST";

                  return (
                    <Card key={i} className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
                      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
                      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold">
                          {t("Airdrop:batch.title", { index: i + 1, total: executeBatches.length })}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {isBroadcasted ? (
                            <Badge variant="secondary">{t("Airdrop:batch.done")}</Badge>
                          ) : (
                            <Badge variant="outline">{t("Airdrop:batch.pending")}</Badge>
                          )}
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
                            disabled={!usr || !usr.id || !batch.length}
                            onClick={() => setExecuteDialogBatch(i)}
                          >
                            {t("Airdrop:batch.broadcast")}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">
                            {t("Airdrop:batch.recipients")}
                          </div>
                          <div className="font-semibold">{batch.length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t("Airdrop:batch.amount")}</div>
                          <div className="font-semibold">
                            {totalAmount.toFixed(airdropAsset?.precision || 0)} {airdropAsset?.symbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t("Airdrop:batch.bytes")}</div>
                          <div className="font-semibold">
                            {bytes} / {chainParams.maxBytes}
                          </div>
                          <Progress value={pct} className="mt-1 h-1" />
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t("Airdrop:batch.fee")}</div>
                          <div className="font-semibold">
                            {humanReadableFloat(fee || 0, 5).toFixed(5)} {coreSymbol}
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
                          <Checkbox
                            checked={!!isBroadcasted}
                            onCheckedChange={() => toggleBroadcast(i)}
                            id={`exec-batch-${i}`}
                            className="border-[hsl(var(--accent-1)/0.5)] data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
                          />
                          <label
                            htmlFor={`exec-batch-${i}`}
                            className="text-muted-foreground cursor-pointer"
                          >
                            {t("Airdrop:batch.markDone")}
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        {showExecute && executeDialogBatch !== null && executeBatches[executeDialogBatch] && (() => {
          const trxJSON = buildTransferOps(usr ? usr.id : "", airdropAsset?.id || "", executeBatches[executeDialogBatch]);
          const trxSize = new TextEncoder().encode(JSON.stringify(trxJSON)).length;
          return (
            <DeepLinkDialog
              trxJSON={trxJSON}
              operationNames={executeBatches[executeDialogBatch].map(() => "transfer")}
              username={usr ? usr.username : ""}
              usrChain={usr ? usr.chain : "bitshares"}
              userID={usr ? usr.id : ""}
              dismissCallback={(open) => { if (!open) setExecuteDialogBatch(null); }}
              headerText={t("Airdrop:batch.broadcastHeader", {
                index: executeDialogBatch + 1,
                total: executeBatches.length,
              })}
              disableQR={trxSize > 2000}
              disableDeeplink={trxSize > 1999}
            />
          );
        })()}
    </div>
  );
}
