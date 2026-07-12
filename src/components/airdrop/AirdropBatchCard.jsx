import React, { useState, useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import { buildTransferOps, humanReadableFloat } from "@/lib/airdrop.js";
import { $currentUser } from "@/stores/users.ts";

export default function AirdropBatchCard({
  batch,
  index,
  totalBatches,
  senderId,
  assetId,
  assetSymbol,
  precision,
  bytes,
  maxBytes,
  feeSat,
  coreSymbol,
  broadcasted,
  onToggleBroadcast,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [showDialog, setShowDialog] = useState(false);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const trxJSON = useMemo(
    () => buildTransferOps(senderId, assetId, batch),
    [batch, senderId, assetId]
  );

  const totalAmount = batch.reduce(
    (acc, r) => acc + humanReadableFloat(r.satoshis || 0, precision),
    0
  );
  const pct = bytes && maxBytes ? Math.min(100, (bytes / maxBytes) * 100) : 0;

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">
          {t("Airdrop:batch.title", { index: index + 1, total: totalBatches })}
        </CardTitle>
        <div className="flex items-center gap-2">
          {broadcasted ? (
            <Badge variant="secondary">{t("Airdrop:batch.done")}</Badge>
          ) : (
            <Badge variant="outline">{t("Airdrop:batch.pending")}</Badge>
          )}
          <Button
            size="sm"
            className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
            disabled={!senderId || !batch.length}
            onClick={() => setShowDialog(true)}
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
            {totalAmount.toFixed(precision)} {assetSymbol}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("Airdrop:batch.bytes")}</div>
          <div className="font-semibold">
            {bytes} / {maxBytes}
          </div>
          <Progress value={pct} className="mt-1 h-1" />
        </div>
        <div>
          <div className="text-muted-foreground">{t("Airdrop:batch.fee")}</div>
          <div className="font-semibold">
            {humanReadableFloat(feeSat || 0, 5).toFixed(5)} {coreSymbol}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
          <Checkbox
            checked={!!broadcasted}
            onCheckedChange={() => onToggleBroadcast(index)}
            id={`batch-${index}`}
            className="border-[hsl(var(--accent-1)/0.5)] data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=checked]:border-[hsl(var(--accent-1))]"
          />
          <label
            htmlFor={`batch-${index}`}
            className="text-muted-foreground cursor-pointer"
          >
            {t("Airdrop:batch.markDone")}
          </label>
        </div>
      </CardContent>

      {showDialog && (
        <DeepLinkDialog
          trxJSON={trxJSON}
          operationNames={trxJSON.map(() => "transfer")}
          username={usr ? usr.username : ""}
          usrChain={usr ? usr.chain : "bitshares"}
          userID={senderId}
          dismissCallback={(open) => setShowDialog(open)}
          headerText={t("Airdrop:batch.broadcastHeader", {
            index: index + 1,
            total: totalBatches,
          })}
        />
      )}
    </Card>
  );
}
