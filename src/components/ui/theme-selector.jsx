"use client";
import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { $customTheme, setActiveTheme } from "@/stores/customTheme.ts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check, SlidersHorizontal } from "lucide-react";

export default function ThemeSelector() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const state = useStore($customTheme);
  const themes = state.themes || {};
  const activeId = state.activeThemeId;
  const active = themes[activeId];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative h-12 w-12 bg-card/55 backdrop-blur-xl dark:text-white text-foreground border border-border hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-card/60 transition-all duration-200 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          aria-label={t("ThemeCustomizer:selectTheme")}
          title={t("ThemeCustomizer:selectTheme")}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, #d946efcc, transparent)",
            }}
          />
          <Palette className="h-5 w-5" />
          {active ? (
            <span
              className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-background"
              style={{
                backgroundColor: active.seed?.hex || "#808080",
              }}
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("ThemeCustomizer:themeLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-auto">
          {Object.values(themes).map((th) => (
            <DropdownMenuItem
              key={th.id}
              onClick={() => setActiveTheme(th.id)}
              className={cn(
                "flex items-center gap-2",
                th.id === activeId && "bg-accent text-accent-foreground"
              )}
            >
              <span
                className="h-4 w-4 rounded-md border border-border/60 shrink-0"
                style={{ backgroundColor: th.seed?.hex || "#808080" }}
              />
              <span className="truncate">{th.name}</span>
              {th.id === activeId ? <Check className="h-4 w-4 ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/theme/index.html" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span>{t("ThemeCustomizer:customizeThemes")}</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
