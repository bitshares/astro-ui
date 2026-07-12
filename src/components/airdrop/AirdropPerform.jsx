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
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Package } from "lucide-react";

import AirdropBatchCard from "./AirdropBatchCard.jsx";
import CurrentUser from "@/components/common/CurrentUser.jsx";

import {
  sliceIntoChunks,
  estimateTransferByteModel,
  maxRecipientsPerTx,
  getTransferFeeSat,
  estimateBatchFeeSat,
  humanReadableFloat,
} from "@/lib/airdrop.js";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createChainParametersStore } from "@/nanoeffects/ChainParameters.ts";
import {
  getAirdropPlan,
  updateAirdropPlan,
} from "@/stores/airdrop.ts";

export default function AirdropPerform(properties) {
  const { id, _globalParamsBTS, _globalParamsTEST } = properties;
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);
  const plan = id ? getAirdropPlan(id) : undefined;

  const [batchSize, setBatchSize] = useState(plan ? plan.batchSize : 0);
  const [byteModel, setByteModel] = useState(null);
  const [chainParams, setChainParams] = useState({
    maxBytes: 2_000_000,
    transferFeeSat: 0,
    pricePerKbyteSat: 0,
  });
  const [broadcastBatches, setBroadcastBatches] = useState(
    plan ? plan.broadcastBatches : []
  );

  const chain = plan ? plan.chain : usr?.chain || "bitshares";
  const globalParams =
    chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
  const coreSymbol = chain === "bitshares" ? "BTS" : "TEST";

  useEffect(() => {
    let active = true;
    estimateTransferByteModel().then((model) => active && setByteModel(model));
    return () => {
      active = false;
    };
  }, []);

  // Pull live chain parameters (max transaction size + fee schedule) from the
  // nanoeffect store, falling back to the offline fee schedule when unavailable.
  useEffect(() => {
    const offlineFee = getTransferFeeSat(globalParams);
    if (!currentNode) return;
    const chainParamsStore = createChainParametersStore([
      chain,
      currentNode ? currentNode.url : null,
    ]);
    const sub = chainParamsStore.subscribe(({ data, error, loading }) => {
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

  const maxPerTx = useMemo(
    () => (byteModel ? maxRecipientsPerTx(chainParams.maxBytes, byteModel) : null),
    [byteModel, chainParams]
  );

  const batches = useMemo(
    () =>
      plan && batchSize > 0
        ? sliceIntoChunks(plan.recipients, batchSize)
        : [],
    [plan, batchSize]
  );

  const toggleBroadcast = (index) => {
    setBroadcastBatches((prev) => {
      const next = prev.includes(index)
        ? prev.filter((x) => x !== index)
        : [...prev, index];
      if (plan) {
        updateAirdropPlan(plan.id, {
          broadcastBatches: next,
          status:
            next.length === batches.length ? "completed" : "in_progress",
        });
      }
      return next;
    });
  };

  if (!plan) {
    return (
      <div className="container mx-auto mt-3 mb-8 px-3 sm:px-4">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>{t("Airdrop:perform.notFoundTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("Airdrop:perform.notFoundDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <Button
                className="mt-4 border-[hsl(var(--accent-1)/0.4)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.6)] transition-all"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/airdrop/index.html")
                }
              >
                {t("Airdrop:perform.backToList")}
              </Button>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct =
    batches.length > 0
      ? Math.round((broadcastBatches.length / batches.length) * 100)
      : 0;

  const batchMetrics = batches.map((batch) => {
    const n = batch.length;
    const bytes = byteModel ? byteModel.header + byteModel.perOp * n : 0;
    const fee = estimateBatchFeeSat(
      n,
      chainParams.transferFeeSat,
      chainParams.pricePerKbyteSat,
      bytes
    );
    return { bytes, fee };
  });

  return (
    <div className="container mx-auto mt-3 mb-8 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{plan.name}</h1>
          <p className="text-xs text-muted-foreground">
            {plan.assetSymbol} ({plan.assetId}) · {plan.recipients.length}{" "}
            {t("Airdrop:perform.recipientsSuffix")} · {batches.length}{" "}
            {t("Airdrop:perform.batchesSuffix")}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-[hsl(var(--accent-1)/0.4)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.6)] transition-all"
          onClick={() => (window.location.href = "/airdrop/index.html")}
        >
          {t("Airdrop:perform.backToList")}
        </Button>
      </div>

      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)] mb-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t("Airdrop:perform.senderTitle")}
          </CardTitle>
          <CardDescription>
            {t("Airdrop:perform.senderDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
              value={batchSize}
              max={maxPerTx || undefined}
              onChange={(e) =>
                setBatchSize(Math.max(1, parseInt(e.target.value) || 1))
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
              <Progress value={progressPct} className="h-2" />
              <span className="text-xs font-semibold whitespace-nowrap">
                {progressPct}% ({broadcastBatches.length}/{batches.length})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!usr || !usr.id ? (
        <Card className="relative overflow-hidden rounded-2xl border border-[hsl(var(--accent-danger)/0.4)] bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-danger)/0.15)] mb-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-danger)/0.7)] to-transparent" />
          <CardContent className="py-4 text-sm text-[hsl(var(--accent-danger-fg))]">
            {t("Airdrop:perform.connectRequired")}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {batches.map((batch, i) => (
          <AirdropBatchCard
            key={i}
            batch={batch}
            index={i}
            totalBatches={batches.length}
            senderId={usr ? usr.id : ""}
            assetId={plan.assetId}
            assetSymbol={plan.assetSymbol}
            precision={plan.precision}
            bytes={batchMetrics[i].bytes}
            maxBytes={chainParams.maxBytes}
            feeSat={batchMetrics[i].fee}
            coreSymbol={coreSymbol}
            broadcasted={broadcastBatches.includes(i)}
            onToggleBroadcast={toggleBroadcast}
          />
        ))}
      </div>
    </div>
  );
}
