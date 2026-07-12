import React, { useSyncExternalStore } from "react";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Package } from "lucide-react";

import { $currentUser } from "@/stores/users.ts";
import {
  $airdropPlans,
  allAirdropPlans,
  removeAirdropPlan,
} from "@/stores/airdrop.ts";

export default function AirdropList() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  useSyncExternalStore(
    $airdropPlans.subscribe,
    $airdropPlans.get,
    () => true
  );
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const plans = allAirdropPlans();

  const coreSymbol = usr && usr.chain === "bitshares" ? "BTS" : "TEST";

  return (
    <div className="container mx-auto mt-3 mb-8 px-3 sm:px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">{t("Airdrop:list.title")}</h1>
        <Button
          className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] border-0 shadow-md hover:shadow-lg transition-all"
          onClick={() => (window.location.href = "/airdrop_create/index.html")}
        >
          {t("Airdrop:list.createNew")}
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>{t("Airdrop:list.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("Airdrop:list.emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const total = plan.recipients.reduce(
              (a, r) => a + (r.humanAmount || 0),
              0
            );
            const progress =
              plan.batches > 0
                ? Math.round(
                    (plan.broadcastBatches.length / plan.batches) * 100
                  )
                : 0;
            return (
              <Card key={plan.id} className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.15)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent" />
                <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm truncate">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(plan.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">
                    {t("Airdrop:list.asset")}
                  </div>
                  <div className="text-right font-semibold">
                    {plan.assetSymbol}
                  </div>
                  <div className="text-muted-foreground">
                    {t("Airdrop:list.recipients")}
                  </div>
                  <div className="text-right font-semibold">
                    {plan.recipients.length}
                  </div>
                  <div className="text-muted-foreground">
                    {t("Airdrop:list.total")}
                  </div>
                  <div className="text-right font-semibold">
                    {total.toFixed(plan.precision)} {plan.assetSymbol}
                  </div>
                  <div className="text-muted-foreground">
                    {t("Airdrop:list.progress")}
                  </div>
                  <div className="text-right font-semibold">
                    {progress}% ({plan.broadcastBatches.length}/{plan.batches})
                  </div>
                </CardContent>
                <CardContent className="flex gap-2 pt-0">
                  <Button
                    size="sm"
                    className="flex-1 border-[hsl(var(--accent-1)/0.4)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.6)] transition-all"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/airdrop_perform/index.html?id=${plan.id}`)
                    }
                  >
                    {t("Airdrop:list.open")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[hsl(var(--accent-danger)/0.4)] text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] hover:text-[hsl(var(--accent-danger-fg))] transition-all"
                    onClick={() => removeAirdropPlan(plan.id)}
                  >
                    {t("Airdrop:list.delete")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
