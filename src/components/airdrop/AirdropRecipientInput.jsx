import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ExternalLink from "@/components/common/ExternalLink.jsx";

const EXPLORER = "https://blocksights.info/#/accounts/";
const ROW_HEIGHT = 34;

function RecipientRow({ index, style, recipients, precision, symbol }) {
  const r = recipients[index];
  if (!r) return null;
  return (
    <div
      style={style}
      className="flex items-center gap-2 px-1 border-b border-border/60"
    >
      <span className="text-[11px] text-muted-foreground w-12 shrink-0 text-right pr-2">
        {index + 1}
      </span>
      <ExternalLink
        hyperlink={`${EXPLORER}${r.account}`}
        type="text"
        text={r.account}
        classnamecontents="rounded bg-card/60 border border-border px-1.5 py-0.5 text-[11px] font-mono text-foreground/80 hover:text-foreground hover:border-[hsl(var(--accent-1))] transition-colors"
      />
      {r.amount !== undefined && !Number.isNaN(r.amount) && (
        <span className="ml-auto text-[11px] text-muted-foreground">
          {Number(r.amount).toFixed(precision)} {symbol}
        </span>
      )}
    </div>
  );
}

export default function AirdropRecipientInput({
  rawText,
  setRawText,
  recipients,
  errors,
  warnings,
  precision = 0,
  symbol = "",
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const fileRef = useRef(null);
  const [showAll, setShowAll] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    e.target.value = "";
  };

  const hasErrors = errors && errors.length > 0;
  const hasWarnings = warnings && warnings.length > 0;
  const visible = showAll ? recipients : recipients.slice(0, 200);

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-foreground/70 text-xs uppercase tracking-wider">
          {t("Airdrop:recipients.label")}
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[hsl(var(--accent-1)/0.4)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.6)] transition-all"
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            {t("Airdrop:recipients.upload")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={handleFile}
          />
          {recipients.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))] transition-all"
              onClick={() => setRawText("")}
            >
              {t("Airdrop:recipients.clear")}
            </Button>
          )}
        </div>
      </div>

      <Textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={t("Airdrop:recipients.placeholder")}
        className="min-h-[180px] bg-card/40 border-border text-foreground font-mono text-xs"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary">
          {t("Airdrop:recipients.count", { count: recipients.length })}
        </Badge>
        {hasErrors && (
          <Badge variant="destructive">
            {t("Airdrop:recipients.errors", { count: errors.length })}
          </Badge>
        )}
        {hasWarnings && (
          <Badge variant="outline">
            {t("Airdrop:recipients.warnings", { count: warnings.length })}
          </Badge>
        )}
      </div>

      {hasErrors && (
        <ul className="text-xs text-[hsl(var(--accent-danger-fg))] list-disc ml-4 max-h-24 overflow-auto">
          {errors.slice(0, 20).map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {recipients.length > 0 && (
        <div className="rounded-lg border border-border bg-card/30 p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs text-muted-foreground">
              {t("Airdrop:recipients.preview", {
                shown: visible.length,
                total: recipients.length,
              })}
            </span>
            {recipients.length > 200 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-[hsl(var(--accent-1-fg))] hover:text-[hsl(var(--accent-1))] transition-all"
                  onClick={() => setShowAll((v) => !v)}
                >
                {showAll
                  ? t("Airdrop:recipients.showLess")
                  : t("Airdrop:recipients.showAll", { total: recipients.length })}
              </Button>
            )}
          </div>
          <div className="w-full">
            <List
              style={{ height: 280 }}
              rowComponent={RecipientRow}
              rowCount={visible.length}
              rowHeight={ROW_HEIGHT}
              rowProps={{ recipients: visible, precision, symbol }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
