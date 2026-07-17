import React, {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Shuffle,
  Plus,
  Trash2,
  UserPlus,
  X,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import { blockchainFloat } from "@/lib/common.js";

const CARD_SHELL =
  "relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]";
const GRADIENT_HAIRLINE =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.70)] to-transparent";
const ICON_CHIP =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-gradFg))] flex-shrink-0";
const GRADIENT_BUTTON =
  "gap-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))] shadow-[0_8px_30px_-8px_hsl(var(--accent-1)/0.6)] hover:shadow-[0_12px_40px_-8px_hsl(var(--accent-1)/0.9)] active:scale-[0.99] transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none";
const FIELD_LABEL =
  "text-[10px] uppercase tracking-wider text-muted-foreground/70";
const HEX_MONO = "font-mono text-xs";

function newOwner() {
  return {
    weight_threshold: "1",
    account_auths: [],
    key_auths: [],
  };
}

function serializeOwner(owner) {
  return {
    weight_threshold: Number(owner.weight_threshold) || 1,
    account_auths: (owner.account_auths || []).map(([id, w]) => [
      id,
      Number(w) || 1,
    ]),
    key_auths: (owner.key_auths || []).map(([k, w]) => [k, Number(w) || 1]),
    address_auths: [],
  };
}

function newOutput() {
  return {
    commitment: "",
    range_proof: "",
    owner: newOwner(),
    stealthEnabled: false,
    stealth_memo: { one_time_key: "", to: "", encrypted_memo: "" },
  };
}

function serializeOutput(o) {
  const out = {
    commitment: o.commitment,
    range_proof: o.range_proof,
    owner: serializeOwner(o.owner),
  };
  if (o.stealthEnabled) {
    out.stealth_memo = {
      one_time_key: o.stealth_memo.one_time_key,
      to: o.stealth_memo.to,
      encrypted_memo: o.stealth_memo.encrypted_memo,
    };
  }
  return out;
}

function newInput() {
  return { commitment: "", owner: newOwner() };
}

function serializeInput(i) {
  return { commitment: i.commitment, owner: serializeOwner(i.owner) };
}

const TABS = [
  { key: "to_blind", icon: ArrowDownToLine, op: "transfer_to_blind" },
  { key: "blind_transfer", icon: Shuffle, op: "blind_transfer" },
  { key: "from_blind", icon: ArrowUpFromLine, op: "transfer_from_blind" },
];

export default function BlindTransfers({ _assetsBTS, _assetsTEST }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  useStore($blockList);
  useStore($currentNode);

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  const assets = useMemo(() => {
    if (_chain !== "bitshares") return _assetsTEST || [];
    return _assetsBTS || [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [activeTab, setActiveTab] = useState("to_blind");
  const [broadcast, setBroadcast] = useState(null);

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-5xl text-foreground">
      <div className="grid grid-cols-1 gap-4">
        <div className={CARD_SHELL}>
          <span className={GRADIENT_HAIRLINE} />
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[hsl(var(--accent-1)/0.15)] blur-3xl" />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className={ICON_CHIP}>
                <EyeOff className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {t("BlindTransfers:title")}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {t("BlindTransfers:description")}
                </p>
              </div>
            </div>

            {/* Segmented tab toggle */}
            <div className="mt-4 inline-flex rounded-xl border border-border bg-card/40 p-1 gap-1 w-full sm:w-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={
                      "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 " +
                      (active
                        ? "bg-gradient-to-r from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-foreground border border-[hsl(var(--accent-1)/0.40)] shadow-[0_0_18px_-8px_hsl(var(--accent-1)/0.6)]"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t(`BlindTransfers:tab.${tab.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced notice */}
        <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.3)] bg-[hsl(var(--accent-warning)/0.08)] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent-warning-fg))] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[hsl(var(--accent-warning-fg))]">
            {t("BlindTransfers:advancedNotice")}
          </p>
        </div>

        {activeTab === "to_blind" ? (
          <ToBlindForm
            t={t}
            usr={usr}
            chain={_chain}
            assets={assets}
            onSubmit={(trx) =>
              setBroadcast({ trx, op: "transfer_to_blind" })
            }
          />
        ) : null}
        {activeTab === "blind_transfer" ? (
          <BlindTransferForm
            t={t}
            usr={usr}
            chain={_chain}
            onSubmit={(trx) => setBroadcast({ trx, op: "blind_transfer" })}
          />
        ) : null}
        {activeTab === "from_blind" ? (
          <FromBlindForm
            t={t}
            usr={usr}
            chain={_chain}
            assets={assets}
            onSubmit={(trx) =>
              setBroadcast({ trx, op: "transfer_from_blind" })
            }
          />
        ) : null}
      </div>

      {broadcast ? (
        <DeepLinkDialog
          operationNames={[broadcast.op]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={(open) => {
            if (!open) setBroadcast(null);
          }}
          key={`blind-${broadcast.op}-${usr.id}`}
          headerText={t(`BlindTransfers:${broadcast.op}Header`)}
          trxJSON={[broadcast.trx]}
        />
      ) : null}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <div className={CARD_SHELL}>
      <span className={GRADIENT_HAIRLINE} />
      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className={ICON_CHIP}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function AmountAssetField({ t, amount, setAmount, assetId, setAssetId, assets }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
      <div className="space-y-1">
        <Label className={FIELD_LABEL}>{t("BlindTransfers:amountLabel")}</Label>
        <Input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
        />
      </div>
      <div className="space-y-1">
        <Label className={FIELD_LABEL}>{t("BlindTransfers:assetLabel")}</Label>
        <Select value={assetId} onValueChange={setAssetId}>
          <SelectTrigger className="min-w-[160px]">
            <SelectValue placeholder={t("BlindTransfers:assetPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="max-h-[280px]">
            {(assets || []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {a.id}
                </span>
                {a.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function OwnerBuilder({ t, chain, owner, setOwner }) {
  const [showSearch, setShowSearch] = useState(false);

  const update = (patch) => setOwner({ ...owner, ...patch });

  return (
    <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
        <Label className="text-sm font-semibold">
          {t("BlindTransfers:ownerLabel")}
        </Label>
      </div>

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:weightThresholdLabel")}
        </Label>
        <Input
          type="number"
          min="1"
          value={owner.weight_threshold}
          onChange={(e) => update({ weight_threshold: e.target.value })}
          className="max-w-[140px]"
        />
      </div>

      {/* account_auths */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={FIELD_LABEL}>
            {t("BlindTransfers:accountAuthsLabel")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSearch(true)}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addAccount")}
          </Button>
        </div>
        {owner.account_auths.length ? (
          <div className="space-y-1.5">
            {owner.account_auths.map(([id, weight], idx) => (
              <div
                key={`${id}-${idx}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
              >
                <span className="font-mono text-xs text-foreground flex-1 truncate">
                  {id}
                </span>
                <Input
                  type="number"
                  min="1"
                  value={weight}
                  onChange={(e) => {
                    const next = [...owner.account_auths];
                    next[idx] = [id, e.target.value];
                    update({ account_auths: next });
                  }}
                  className="h-7 w-16 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
                  onClick={() =>
                    update({
                      account_auths: owner.account_auths.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground italic">
            {t("BlindTransfers:noAccountAuths")}
          </div>
        )}
      </div>

      {/* key_auths */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={FIELD_LABEL}>
            {t("BlindTransfers:keyAuthsLabel")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              update({ key_auths: [...owner.key_auths, ["", 1]] })
            }
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addKey")}
          </Button>
        </div>
        {owner.key_auths.map(([k, weight], idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1.5"
          >
            <Input
              value={k}
              placeholder={t("BlindTransfers:publicKeyPlaceholder")}
              onChange={(e) => {
                const next = [...owner.key_auths];
                next[idx] = [e.target.value, weight];
                update({ key_auths: next });
              }}
              className="h-7 text-xs font-mono flex-1"
            />
            <Input
              type="number"
              min="1"
              value={weight}
              onChange={(e) => {
                const next = [...owner.key_auths];
                next[idx] = [k, e.target.value];
                update({ key_auths: next });
              }}
              className="h-7 w-16 text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
              onClick={() =>
                update({
                  key_auths: owner.key_auths.filter((_, i) => i !== idx),
                })
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {showSearch ? (
        <Dialog open onOpenChange={(open) => !open && setShowSearch(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("BlindTransfers:searchAccountTitle")}</DialogTitle>
              <DialogDescription>
                {t("BlindTransfers:searchAccountDescription")}
              </DialogDescription>
            </DialogHeader>
            <AccountSearch
              chain={chain}
              excludedUsers={[]}
              setChosenAccount={(acct) => {
                if (acct && acct.id) {
                  if (!owner.account_auths.some(([id]) => id === acct.id)) {
                    update({
                      account_auths: [...owner.account_auths, [acct.id, 1]],
                    });
                  }
                }
                setShowSearch(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function OutputEditor({ t, chain, output, setOutput, onRemove, index, removable }) {
  const update = (patch) => setOutput({ ...output, ...patch });
  const updateMemo = (patch) =>
    update({ stealth_memo: { ...output.stealth_memo, ...patch } });

  return (
    <div className="rounded-xl border border-[hsl(var(--accent-2)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-2)/0.06)] to-transparent p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--accent-2-fg))]">
          {t("BlindTransfers:output")} #{index + 1}
        </span>
        {removable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:commitmentLabel")}
        </Label>
        <Input
          className={HEX_MONO}
          value={output.commitment}
          onChange={(e) => update({ commitment: e.target.value })}
          placeholder={t("BlindTransfers:commitmentPlaceholder")}
        />
      </div>

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:rangeProofLabel")}
        </Label>
        <Textarea
          className={`${HEX_MONO} min-h-[70px]`}
          value={output.range_proof}
          onChange={(e) => update({ range_proof: e.target.value })}
          placeholder={t("BlindTransfers:rangeProofPlaceholder")}
        />
      </div>

      <OwnerBuilder
        t={t}
        chain={chain}
        owner={output.owner}
        setOwner={(owner) => update({ owner })}
      />

      <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2">
        <Label className="text-xs">{t("BlindTransfers:stealthMemoToggle")}</Label>
        <input
          type="checkbox"
          checked={output.stealthEnabled}
          onChange={(e) => update({ stealthEnabled: e.target.checked })}
          className="h-4 w-4 accent-[hsl(var(--accent-1))]"
        />
      </div>

      {output.stealthEnabled ? (
        <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
          <div className="space-y-1">
            <Label className={FIELD_LABEL}>
              {t("BlindTransfers:oneTimeKeyLabel")}
            </Label>
            <Input
              className={HEX_MONO}
              value={output.stealth_memo.one_time_key}
              onChange={(e) => updateMemo({ one_time_key: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className={FIELD_LABEL}>{t("BlindTransfers:memoToLabel")}</Label>
            <Input
              className={HEX_MONO}
              value={output.stealth_memo.to}
              onChange={(e) => updateMemo({ to: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className={FIELD_LABEL}>
              {t("BlindTransfers:encryptedMemoLabel")}
            </Label>
            <Textarea
              className={`${HEX_MONO} min-h-[60px]`}
              value={output.stealth_memo.encrypted_memo}
              onChange={(e) => updateMemo({ encrypted_memo: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InputEditor({ t, chain, input, setInput, onRemove, index, removable }) {
  const update = (patch) => setInput({ ...input, ...patch });
  return (
    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.25)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--accent-1-fg))]">
          {t("BlindTransfers:input")} #{index + 1}
        </span>
        {removable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:commitmentLabel")}
        </Label>
        <Input
          className={HEX_MONO}
          value={input.commitment}
          onChange={(e) => update({ commitment: e.target.value })}
          placeholder={t("BlindTransfers:commitmentPlaceholder")}
        />
      </div>
      <OwnerBuilder
        t={t}
        chain={chain}
        owner={input.owner}
        setOwner={(owner) => update({ owner })}
      />
    </div>
  );
}

function ToBlindForm({ t, usr, chain, assets, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [assetId, setAssetId] = useState("");
  const [blindingFactor, setBlindingFactor] = useState("");
  const [outputs, setOutputs] = useState([newOutput()]);

  const asset = useMemo(
    () => (assets || []).find((a) => a.id === assetId),
    [assets, assetId]
  );

  const canSubmit =
    usr?.id && asset && amount && Number(amount) > 0 && outputs.length > 0;

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: "1.3.0" },
      amount: {
        amount: blockchainFloat(Number(amount), asset.precision).toFixed(0),
        asset_id: asset.id,
      },
      from: usr.id,
      blinding_factor: blindingFactor,
      outputs: outputs.map(serializeOutput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={ArrowDownToLine}
      title={t("BlindTransfers:tab.to_blind")}
      description={t("BlindTransfers:toBlindDescription")}
    >
      <AmountAssetField
        t={t}
        amount={amount}
        setAmount={setAmount}
        assetId={assetId}
        setAssetId={setAssetId}
        assets={assets}
      />

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:blindingFactorLabel")}
        </Label>
        <Input
          className={HEX_MONO}
          value={blindingFactor}
          onChange={(e) => setBlindingFactor(e.target.value)}
          placeholder={t("BlindTransfers:blindingFactorPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:outputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOutputs([...outputs, newOutput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addOutput")}
          </Button>
        </div>
        {outputs.map((o, idx) => (
          <OutputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            output={o}
            removable={outputs.length > 1}
            setOutput={(next) =>
              setOutputs(outputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setOutputs(outputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!canSubmit}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>
    </SectionCard>
  );
}

function BlindTransferForm({ t, chain, onSubmit }) {
  const [inputs, setInputs] = useState([newInput()]);
  const [outputs, setOutputs] = useState([newOutput()]);

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: "1.3.0" },
      inputs: inputs.map(serializeInput),
      outputs: outputs.map(serializeOutput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={Shuffle}
      title={t("BlindTransfers:tab.blind_transfer")}
      description={t("BlindTransfers:blindTransferDescription")}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:inputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setInputs([...inputs, newInput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addInput")}
          </Button>
        </div>
        {inputs.map((inp, idx) => (
          <InputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            input={inp}
            removable={inputs.length > 1}
            setInput={(next) =>
              setInputs(inputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setInputs(inputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:outputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOutputs([...outputs, newOutput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-2)/0.3)] hover:bg-[hsl(var(--accent-2)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addOutput")}
          </Button>
        </div>
        {outputs.map((o, idx) => (
          <OutputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            output={o}
            removable={outputs.length > 1}
            setOutput={(next) =>
              setOutputs(outputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setOutputs(outputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!inputs.length || !outputs.length}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>
    </SectionCard>
  );
}

function FromBlindForm({ t, usr, chain, assets, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [assetId, setAssetId] = useState("");
  const [toAccount, setToAccount] = useState(null);
  const [blindingFactor, setBlindingFactor] = useState("");
  const [inputs, setInputs] = useState([newInput()]);
  const [showSearch, setShowSearch] = useState(false);

  const asset = useMemo(
    () => (assets || []).find((a) => a.id === assetId),
    [assets, assetId]
  );

  const canSubmit =
    asset && amount && Number(amount) > 0 && toAccount?.id && inputs.length > 0;

  const submit = () => {
    const trx = {
      fee: { amount: 0, asset_id: "1.3.0" },
      amount: {
        amount: blockchainFloat(Number(amount), asset.precision).toFixed(0),
        asset_id: asset.id,
      },
      to: toAccount.id,
      blinding_factor: blindingFactor,
      inputs: inputs.map(serializeInput),
    };
    onSubmit(trx);
  };

  return (
    <SectionCard
      icon={ArrowUpFromLine}
      title={t("BlindTransfers:tab.from_blind")}
      description={t("BlindTransfers:fromBlindDescription")}
    >
      <AmountAssetField
        t={t}
        amount={amount}
        setAmount={setAmount}
        assetId={assetId}
        setAssetId={setAssetId}
        assets={assets}
      />

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>{t("BlindTransfers:toLabel")}</Label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={
              toAccount ? `${toAccount.name} (${toAccount.id})` : ""
            }
            placeholder={t("BlindTransfers:toPlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSearch(true)}
            className="gap-1 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <UserPlus className="h-4 w-4" />
            {t("BlindTransfers:selectAccount")}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>
          {t("BlindTransfers:blindingFactorLabel")}
        </Label>
        <Input
          className={HEX_MONO}
          value={blindingFactor}
          onChange={(e) => setBlindingFactor(e.target.value)}
          placeholder={t("BlindTransfers:blindingFactorPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("BlindTransfers:inputs")}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setInputs([...inputs, newInput()])}
            className="gap-1 h-7 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("BlindTransfers:addInput")}
          </Button>
        </div>
        {inputs.map((inp, idx) => (
          <InputEditor
            key={idx}
            index={idx}
            t={t}
            chain={chain}
            input={inp}
            removable={inputs.length > 1}
            setInput={(next) =>
              setInputs(inputs.map((x, i) => (i === idx ? next : x)))
            }
            onRemove={() => setInputs(inputs.filter((_, i) => i !== idx))}
          />
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!canSubmit}
        className={`${GRADIENT_BUTTON} w-full`}
      >
        {t("BlindTransfers:reviewBroadcast")}
      </Button>

      {showSearch ? (
        <Dialog open onOpenChange={(open) => !open && setShowSearch(false)}>
          <DialogContent className="sm:max-w-[420px] bg-card">
            <DialogHeader>
              <DialogTitle>{t("BlindTransfers:searchAccountTitle")}</DialogTitle>
              <DialogDescription>
                {t("BlindTransfers:searchAccountDescription")}
              </DialogDescription>
            </DialogHeader>
            <AccountSearch
              chain={chain}
              excludedUsers={[]}
              setChosenAccount={(acct) => {
                if (acct && acct.id) setToAccount(acct);
                setShowSearch(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </SectionCard>
  );
}
