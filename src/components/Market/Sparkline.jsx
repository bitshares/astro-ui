import React, { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function Sparkline({
  data = [],
  width = 200,
  height = 56,
  strokeWidth = 1.5,
  showArea = true,
  className = "",
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const { path, areaPath, points, min, max, trend } = useMemo(() => {
    if (!data || data.length < 2) {
      return {
        path: "",
        areaPath: "",
        points: [],
        min: 0,
        max: 0,
        trend: 0,
      };
    }
    const values = data.map((d) => d.value);
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const range = mx - mn || 1;
    const stepX = width / (data.length - 1);
    const pad = 4;
    const innerH = height - pad * 2;

    const pts = data.map((d, i) => ({
      x: i * stepX,
      y: pad + (1 - (d.value - mn) / range) * innerH,
      ...d,
    }));

    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    const first = pts[0];
    const last = pts[pts.length - 1];
    const area = `${linePath} L${last.x.toFixed(2)},${(height - pad).toFixed(2)} L${first.x.toFixed(
      2
    )},${(height - pad).toFixed(2)} Z`;

    const t = data[data.length - 1].value - data[0].value;

    return {
      path: linePath,
      areaPath: area,
      points: pts,
      min: mn,
      max: mx,
      trend: t,
    };
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[10px] text-muted-foreground/60",
          className
        )}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const isUp = trend >= 0;
  const stroke = isUp ? "rgb(52 211 153)" : "rgb(251 113 133)";
  const fillStops = isUp
    ? { start: "rgba(52, 211, 153, 0.35)", end: "rgba(52, 211, 153, 0)" }
    : { start: "rgba(251, 113, 133, 0.35)", end: "rgba(251, 113, 133, 0)" };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("relative cursor-crosshair", className)}
            style={{ width, height }}
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const stepX = width / (data.length - 1);
              const idx = Math.max(
                0,
                Math.min(data.length - 1, Math.round(x / stepX))
              );
              setHoverIdx(idx);
            }}
          >
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="overflow-visible"
            >
              <defs>
                <linearGradient
                  id={`sparkfill-${isUp ? "up" : "down"}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={fillStops.start} />
                  <stop offset="100%" stopColor={fillStops.end} />
                </linearGradient>
              </defs>
              {showArea ? (
                <path d={areaPath} fill={`url(#sparkfill-${isUp ? "up" : "down"})`} />
              ) : null}
              <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {hoverIdx !== null && points[hoverIdx] ? (
                <>
                  <line
                    x1={points[hoverIdx].x}
                    y1={0}
                    x2={points[hoverIdx].x}
                    y2={height}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={points[hoverIdx].x}
                    cy={points[hoverIdx].y}
                    r={3}
                    fill={stroke}
                    stroke="rgba(2, 6, 23, 0.9)"
                    strokeWidth={1.5}
                  />
                </>
              ) : null}
            </svg>
          </div>
        </TooltipTrigger>
        {hoverIdx !== null && points[hoverIdx] ? (
          <TooltipContent
            side="top"
            className="!bg-card border border-border text-foreground px-2.5 py-1.5"
          >
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">{points[hoverIdx].label || ""}</span>
              <span className="font-semibold tabular-nums" style={{ color: stroke }}>
                {points[hoverIdx].value}
              </span>
            </div>
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}
