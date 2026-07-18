import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import {
  $customTheme,
  setPageTheme,
  PRESET_THEMES,
} from "@/stores/customTheme.ts";
import { THEMABLE_PAGES } from "@/lib/pages.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export default function PageThemes() {
  const { t } = useTranslation();
  const state = useStore($customTheme);
  const themes = state.themes || {};

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15">
              <Layers className="h-4 w-4 text-amber-500 dark:text-amber-300" />
            </span>
            {t("PageThemes:title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("PageThemes:description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {THEMABLE_PAGES.map((p) => {
              const assigned = state.pageThemeMap[p.slug] || "";
              const overridden = Boolean(assigned && themes[assigned]);
              return (
                <div
                  key={p.slug}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border p-2.5",
                    overridden ? "border-ring bg-accent/40" : "border-border/60"
                  )}
                >
                  <span className="text-xs flex items-center gap-1.5">
                    {overridden ? (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: themes[assigned].seed?.hex || "#808080",
                        }}
                        title={t("PageThemes:overrideActive")}
                      />
                    ) : null}
                    {p.label}
                  </span>
                  <Select
                    value={assigned || "__default__"}
                    onValueChange={(v) =>
                      setPageTheme(p.slug, v === "__default__" ? null : v)
                    }
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">
                        {t("PageThemes:useActive")}
                      </SelectItem>
                      {Object.values(themes).map((th) => (
                        <SelectItem key={th.id} value={th.id}>
                          {th.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
