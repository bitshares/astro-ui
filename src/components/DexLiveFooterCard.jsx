import React, { useEffect, useState } from "react";
import { Activity, Clock, Box, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterNodeDomain } from "@/lib/dexHash";

export default function DexLiveFooterCard({
  lastFetchAt,
  isSubscribed,
  blockNumber,
  nodeUrl,
  warningThresholdSec = 10,
}) {
  // Always show after first block/fetch - indicate Subscribed vs Disconnected; hide during initial skeleton
  const hasEverSubscribed = lastFetchAt !== null || blockNumber !== null;
  if (!hasEverSubscribed && !isSubscribed) return null;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secsSince = lastFetchAt ? Math.max(0, Math.floor((now - lastFetchAt) / 1000)) : null;
  const timeLabel = secsSince !== null ? `${secsSince}s ago` : "—";
  const isWarning = secsSince !== null && secsSince > warningThresholdSec;
  const isDisconnected = !isSubscribed || isWarning;
  const domain = filterNodeDomain(nodeUrl);

  return (
    <div className="grid grid-cols-1 mt-5">
      <div className="mx-auto w-full max-w-2xl">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[hsl(var(--accent-1)/0.08)] via-[hsl(var(--accent-1)/0.02)] to-transparent" />
          <div className="relative p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-sm font-semibold text-[hsl(var(--accent-1-fg))]">Live subscription</h4>
              <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", !isDisconnected ? "border-[hsl(var(--accent-success)/0.3)] bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))]" : "border-[hsl(var(--accent-danger)/0.3)] bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))]")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", !isDisconnected ? "bg-[hsl(var(--accent-success))]" : "bg-[hsl(var(--accent-danger))]")} />
                {!isDisconnected ? "Subscribed" : "Disconnected"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.015] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last update</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono tabular-nums font-semibold truncate">
                  <span className={isWarning ? "text-[hsl(var(--accent-warning-fg))]" : "text-foreground/85"}>{timeLabel}</span>
                  {isWarning ? <span title="Stale - no update in a while">⚠️</span> : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.015] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Box className="h-3.5 w-3.5" />
                  <span>Block</span>
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold truncate text-foreground/85" title={blockNumber ? String(blockNumber) : ""}>
                  {blockNumber ? `#${Number(blockNumber).toLocaleString("en-US")}` : "—"}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/[0.015] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                  <span>Node</span>
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold truncate text-foreground/85" title={nodeUrl || ""}>
                  {domain}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
