import React from "react";

export default function SummaryRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={
            "mt-0.5 truncate text-sm text-foreground " + (mono ? "font-mono" : "")
          }
        >
          {value || <span className="text-muted-foreground/40">—</span>}
        </div>
      </div>
    </div>
  );
}
