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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import AirdropRecipientInput from "./AirdropRecipientInput.jsx";

import {
  parseRecipients,
  computeAmounts,
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
import { addAirdropPlan } from "@/stores/airdrop.ts";

export default function AirdropCreate(properties) {
  const {
    _assetsBTS,
    _assetsTEST,
    _marketSearchBTS,
    _marketSearchTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const chain = usr && usr.chain ? usr.chain : "bitshares";
  const assets =
    chain === "bitshares" ? _assetsBTS : _assetsTEST;
  const marketSearch =
    chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
  const globalParams =
    chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
  const coreSymbol = chain === "bitshares" ? "BTS" : "TEST";

  const [rawText, setRawText] = useState("");
  const [name, setName] = useState("");
  const [selectedAsset, setSelectedAsset] = useState();
  const [distributionMode, setDistributionMode] = useState("equal");
  const [fixedAmount, setFixedAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const [chainParams, setChainParams] = useState({
    maxBytes: 2_000_000,
    transferFeeSat: 0,
    pricePerKbyteSat: 0,
  });
  const [byteModel, setByteModel] = useState(null);
  const [batchSize, setBatchSize] = useState(0);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseRecipients(rawText), [rawText]);
  const foundAsset = useMemo(
    () => (selectedAsset ? assets.find((a) => a.symbol === selectedAsset) : undefined),
    [selectedAsset, assets]
  );
  const precision = foundAsset ? foundAsset.precision : 0;

  const hasParsedAmounts = parsed.recipients.some(
    (r) => r.amount !== undefined
  );

  const amounts = useMemo(() => {
    if (!parsed.recipients.length) return [];
    return computeAmounts(parsed.recipients, distributionMode, {
      fixedAmount: parseFloat(fixedAmount),
      totalAmount: parseFloat(totalAmount),
      precision,
    });
  }, [parsed, distributionMode, fixedAmount, totalAmount, precision]);

  const totalHuman = useMemo(
    () => amounts.reduce((a, r) => a + (r.humanAmount || 0), 0),
    [amounts]
  );

  // Load byte model (offline probe) once.
  useEffect(() => {
    let active = true;
    estimateTransferByteModel().then((model) => {
      if (active) setByteModel(model);
    });
    return () => {
      active = false;
    };
  }, []);

  const maxPerTx = useMemo(() => {
    if (!byteModel) return null;
    return maxRecipientsPerTx(chainParams.maxBytes, byteModel);
  }, [byteModel, chainParams]);

  // Default the batch size to the computed maximum once known.
  useEffect(() => {
    if (maxPerTx && batchSize === 0) {
      setBatchSize(maxPerTx);
    }
  }, [maxPerTx, batchSize]);

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

  const batches = useMemo(
    () => (batchSize > 0 ? sliceIntoChunks(amounts, batchSize) : []),
    [amounts, batchSize]
  );

  const representativeBytes = useMemo(() => {
    if (!byteModel || !batchSize) return 0;
    return byteModel.header + byteModel.perOp * batchSize;
  }, [byteModel, batchSize]);

  const representativeFee = estimateBatchFeeSat(
    batchSize,
    chainParams.transferFeeSat,
    chainParams.pricePerKbyteSat,
    representativeBytes
  );

  const canSave =
    parsed.recipients.length > 0 &&
    foundAsset &&
    batchSize > 0 &&
    batches.length > 0 &&
    !saving;

  const handleSave = () => {
    if (!canSave || !usr || !usr.id) return;
    setSaving(true);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plan = {
      id,
      name: name.trim() || `Airdrop ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      chain,
      assetSymbol: foundAsset.symbol,
      assetId: foundAsset.id,
      precision,
      distributionMode,
      totalAmount:
        distributionMode === "equal" ? parseFloat(totalAmount) : undefined,
      fixedAmount:
        distributionMode === "fixed" ? parseFloat(fixedAmount) : undefined,
      recipients: amounts.map((a) => ({
        account: a.account,
        humanAmount: a.humanAmount,
        satoshis: a.satoshis,
      })),
      batchSize,
      batches: batches.length,
      status: "ready",
      broadcastBatches: [],
    };
    addAirdropPlan(plan);
    window.location.href = `/airdrop_perform/index.html?id=${id}`;
  };

  return (
    <div className="container mx-auto mt-3 mb-8 px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 grid grid-cols-1 gap-4">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <CardHeader>
            <CardTitle className="text-base">
              {t("Airdrop:create.recipientsTitle")}
            </CardTitle>
            <CardDescription>
              {t("Airdrop:create.recipientsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AirdropRecipientInput
              rawText={rawText}
              setRawText={setRawText}
              recipients={parsed.recipients}
              errors={parsed.errors}
              warnings={parsed.warnings}
              precision={precision}
              symbol={foundAsset ? foundAsset.symbol : ""}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <CardHeader>
            <CardTitle className="text-base">
              {t("Airdrop:create.assetTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                {t("Airdrop:create.asset")}
              </Label>
              <div className="mt-2">
                <AssetDropDown
                  assetSymbol={selectedAsset ?? ""}
                  assetData={null}
                  storeCallback={setSelectedAsset}
                  otherAsset={null}
                  marketSearch={marketSearch}
                  type={null}
                  chain={chain}
                  balances={null}
                  triggerVariant="outline"
                />
              </div>
              {foundAsset && (
                <p className="text-xs text-muted-foreground mt-2">
                  {foundAsset.symbol} ({foundAsset.id}) · {t(
                    "Airdrop:create.precision",
                    { precision: foundAsset.precision }
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <CardHeader>
            <CardTitle className="text-base">
              {t("Airdrop:create.distributionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                {t("Airdrop:create.mode")}
              </Label>
              <Select
                value={distributionMode}
                onValueChange={setDistributionMode}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="equal">
                    {t("Airdrop:create.mode.equal")}
                  </SelectItem>
                  <SelectItem value="fixed">
                    {t("Airdrop:create.mode.fixed")}
                  </SelectItem>
                  <SelectItem value="custom" disabled={!hasParsedAmounts}>
                    {t("Airdrop:create.mode.custom")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionMode === "equal" && (
              <div className="sm:col-span-2">
                <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                  {t("Airdrop:create.totalAmount")}
                </Label>
                <Input
                  className="mt-2 bg-card/40"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="100000"
                />
              </div>
            )}
            {distributionMode === "fixed" && (
              <div className="sm:col-span-2">
                <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                  {t("Airdrop:create.fixedAmount")}
                </Label>
                <Input
                  className="mt-2 bg-card/40"
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="10"
                />
              </div>
            )}
            {distributionMode === "custom" && (
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                {t("Airdrop:create.customHint")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-3 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
          <CardHeader>
            <CardTitle className="text-base">
              {t("Airdrop:create.reviewTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">
                {t("Airdrop:create.recipients")}
              </div>
              <div className="text-right font-semibold">
                {parsed.recipients.length}
              </div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.asset")}
              </div>
              <div className="text-right font-semibold">
                {foundAsset ? foundAsset.symbol : "—"}
              </div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.totalAmount")}
              </div>
              <div className="text-right font-semibold">
                {totalHuman.toFixed(precision)} {foundAsset ? foundAsset.symbol : ""}
              </div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.maxPerTx")}
              </div>
              <div className="text-right font-semibold">
                {maxPerTx === null ? "…" : maxPerTx}
              </div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.batchSize")}
              </div>
              <div className="text-right font-semibold">{batchSize || "—"}</div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.batches")}
              </div>
              <div className="text-right font-semibold">{batches.length}</div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.batchBytes")}
              </div>
              <div className="text-right font-semibold">
                {representativeBytes} / {chainParams.maxBytes}
              </div>
              <div className="text-muted-foreground">
                {t("Airdrop:create.batchFee")}
              </div>
              <div className="text-right font-semibold">
                {humanReadableFloat(representativeFee, 5).toFixed(5)} {coreSymbol}
              </div>
            </div>

            {batches.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {t("Airdrop:create.splitNote", {
                  batches: batches.length,
                  perBatch: batchSize,
                })}
              </p>
            )}

            <div className="mt-2">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">
                {t("Airdrop:create.planName")}
              </Label>
              <Input
                className="mt-1 bg-card/40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Airdrop:create.planNamePlaceholder")}
              />
            </div>

            <Button
              className="mt-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
              disabled={!canSave}
              onClick={handleSave}
            >
              {t("Airdrop:create.save")}
            </Button>
            {!usr || !usr.id ? (
              <p className="text-xs text-[hsl(var(--accent-danger-fg))]">
                {t("Airdrop:create.connectAccount")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
