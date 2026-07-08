import React from "react";
import { useTranslation } from "react-i18next";
import { locale } from "@/lib/i18n";

const STEP_COLORS = {
  1: { icon: "bg-violet-500/15 text-violet-400 ring-violet-500/30", badge: "bg-violet-500/15 text-violet-400", border: "border-violet-500/20" },
  2: { icon: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/30", badge: "bg-cyan-500/15 text-cyan-400", border: "border-cyan-500/20" },
  3: { icon: "bg-amber-500/15 text-amber-400 ring-amber-500/30", badge: "bg-amber-500/15 text-amber-400", border: "border-amber-500/20" },
  4: { icon: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30", badge: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/20" },
  5: { icon: "bg-rose-500/15 text-rose-400 ring-rose-500/30", badge: "bg-rose-500/15 text-rose-400", border: "border-rose-500/20" },
  6: { icon: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30", badge: "bg-indigo-500/15 text-indigo-400", border: "border-indigo-500/20" },
};

export default function SectionHeader({ icon: Icon, title, description, step, optional, recommended, right }) {
  const { t } = useTranslation("AssetCommon", { i18n: locale.get() });
  const colors = STEP_COLORS[step] || STEP_COLORS[1];
  return (
    <div className="flex items-start gap-3 border-b border-border px-6 py-4">
      <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 " + colors.icon}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step && (
            <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + colors.badge}>
              {t("AssetCommon:sectionHeader.stepBadge", { number: step })}
              {recommended ? ` ${t("AssetCommon:sectionHeader.recommended")}` : ""}
              {optional ? ` ${t("AssetCommon:sectionHeader.optional")}` : ""}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right && (
        <div className="shrink-0 ml-auto">{right}</div>
      )}
    </div>
  );
}
