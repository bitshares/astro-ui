import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  $customTheme,
  getThemeForPage,
  setActiveTheme,
  setMode,
  setPageTheme,
  updateTheme,
  updateThemeSeed,
  updateThemeToken,
  updateBrand,
  updateSectionAccent,
  updateStatusAccent,
  updatePageAccent,
  updateGlobalAccent,
  resolveBrand,
  resolveSectionAccent,
  resolveStatus,
  resolvePageAccent,
  renameTheme,
  createTheme,
  duplicateTheme,
  deleteTheme,
  exportTheme,
  importTheme,
  resetThemes,
  PRESET_THEMES,
  NAV_SECTIONS,
  STATUS_ROLES,
} from "@/stores/customTheme.ts";

import {
  ACCENT_COLORS,
  ACCENT_SHADES,
  EDITABLE_TOKENS,
  paletteHex,
  buildThemeVars,
  contrastRatio,
  readableForeground,
} from "@/lib/tailwindPalette.js";
import { THEMABLE_PAGES } from "@/lib/pages.js";

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Palette,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Check,
} from "lucide-react";

const PAGES = THEMABLE_PAGES;

const TOKEN_LABELS = {
  primary: "Primary",
  background: "Background",
  card: "Card / Popover",
  secondary: "Secondary",
  muted: "Muted",
  accent: "Accent",
  border: "Border / Input",
  ring: "Focus ring",
  destructive: "Destructive",
  sidebar: "Sidebar",
  sidebarAccent: "Sidebar accent",
};

function ShadeDots({ color, activeShade, onSelect }) {
  return (
    <div className="flex items-center gap-1">
      {ACCENT_SHADES.map((shade) => {
        const hex = paletteHex(color, shade);
        const active = shade === activeShade;
        return (
          <button
            key={shade}
            type="button"
            onClick={() => onSelect(shade)}
            title={`${color}-${shade}`}
            className={cn(
              "h-6 w-6 rounded-md border transition-all",
              active
                ? "ring-2 ring-ring border-transparent scale-110"
                : "border-border/60 hover:scale-105"
            )}
            style={{ backgroundColor: hex }}
            aria-label={`${color} ${shade}`}
          />
        );
      })}
    </div>
  );
}

function ColorPicker({ value, onChange, showShades = true }) {
  const { color, shade } = value;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-10 gap-1.5">
        {ACCENT_COLORS.map((c) => {
          const active = c === color;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ color: c, shade })}
              title={c}
              className={cn(
                "h-6 w-full rounded-md border transition-all",
                active
                  ? "ring-2 ring-ring border-transparent"
                  : "border-border/50 hover:scale-105"
              )}
              style={{ backgroundColor: paletteHex(c, 500) }}
              aria-label={c}
            >
              {active ? (
                <Check className="h-3 w-3 mx-auto text-white drop-shadow" />
              ) : null}
            </button>
          );
        })}
      </div>
      {showShades ? (
        <ShadeDots
          color={color}
          activeShade={shade}
          onSelect={(s) => onChange({ color, shade: s })}
        />
      ) : null}
    </div>
  );
}

function SwatchPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {ACCENT_COLORS.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={cn(
              "h-6 w-full rounded-md border transition-all",
              active ? "ring-2 ring-ring border-transparent" : "border-border/50 hover:scale-105"
            )}
            style={{ backgroundColor: paletteHex(c, 500) }}
            aria-label={c}
          >
            {active ? <Check className="h-3 w-3 mx-auto text-white drop-shadow" /> : null}
          </button>
        );
      })}
    </div>
  );
}

// primary + secondary pair editor
function PairPicker({ pair, onChange, disabled, t }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: paletteHex(pair.primary, 500) }} />
          {t("ThemeCustomizer:primary")}
        </Label>
        <SwatchPicker
          value={pair.primary}
          onChange={(c) => !disabled && onChange({ ...pair, primary: c })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: paletteHex(pair.secondary, 500) }} />
          {t("ThemeCustomizer:secondary")}
        </Label>
        <SwatchPicker
          value={pair.secondary}
          onChange={(c) => !disabled && onChange({ ...pair, secondary: c })}
        />
      </div>
    </div>
  );
}

// primary + secondary + tertiary triple editor (page component accents)
function TriplePicker({ triple, onChange, disabled, t }) {
  const roles = ["primary", "secondary", "tertiary"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {roles.map((role) => (
        <div key={role} className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: paletteHex(triple[role], 500) }} />
            {t(`ThemeCustomizer:${role}`)}
          </Label>
          <SwatchPicker
            value={triple[role]}
            onChange={(c) => !disabled && onChange({ ...triple, [role]: c })}
          />
        </div>
      ))}
    </div>
  );
}

function ContrastBadge({ bgHex, fgHex }) {
  const ratio = contrastRatio(bgHex, fgHex);
  const rounded = Math.round(ratio * 10) / 10;
  const pass = ratio >= 4.5;
  const passLarge = ratio >= 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono border",
        pass
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40"
          : passLarge
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40"
          : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-400/40"
      )}
      title={pass ? "WCAG AA" : passLarge ? "AA large text only" : "Fails WCAG AA"}
    >
      {rounded}:1 {pass ? "AA" : passLarge ? "AA-lg" : "!"}
    </span>
  );
}

function PreviewPanel({ theme, accent, status }) {
  const { light, dark } = buildThemeVars(theme);
  const vars = theme.baseMode === "dark" ? dark : light;
  const swatch = (label, color) => (
    <div key={label} className="flex flex-col items-center gap-1">
      <span
        className="h-6 w-6 rounded-md border border-black/10"
        style={{ backgroundColor: paletteHex(color, 500) }}
        title={`${label}: ${color}`}
      />
      <span className="text-[9px] opacity-70">{label}</span>
    </div>
  );
  const style = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v])
  );
  const wrapStyle = {
    background: `hsl(${vars["--background"]})`,
    color: `hsl(${vars["--foreground"]})`,
    ...style,
  };
  return (
    <div
      className="rounded-xl border border-border p-4 space-y-3"
      style={wrapStyle}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Preview</span>
        <span className="text-xs opacity-70">{theme.baseMode} mode</span>
      </div>
      <div
        className="rounded-lg p-3 border"
        style={{
          background: `hsl(${vars["--card"]})`,
          color: `hsl(${vars["--card-foreground"]})`,
          borderColor: `hsl(${vars["--border"]})`,
        }}
      >
        <div className="text-sm font-medium mb-2">Card surface</div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              background: `hsl(${vars["--primary"]})`,
              color: `hsl(${vars["--primary-foreground"]})`,
            }}
          >
            Primary
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
            style={{
              background: `hsl(${vars["--secondary"]})`,
              color: `hsl(${vars["--secondary-foreground"]})`,
            }}
          >
            Secondary
          </span>
          <span
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm"
            style={{
              background: `hsl(${vars["--accent"]})`,
              color: `hsl(${vars["--accent-foreground"]})`,
            }}
          >
            Accent
          </span>
        </div>
      </div>
      {accent ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {swatch("1", accent.primary)}
          {swatch("2", accent.secondary)}
          {swatch("3", accent.tertiary)}
          {status ? (
            <>
              {swatch("ok", status.success)}
              {swatch("err", status.danger)}
              {swatch("warn", status.warning)}
              {swatch("info", status.info)}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ThemeCustomizer() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const state = useStore($customTheme);
  const [importText, setImportText] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);
  const [accentPage, setAccentPage] = React.useState(PAGES[0]?.slug || "index");

  const themes = state.themes || {};
  const activeId = state.activeThemeId;
  const theme = themes[activeId] || PRESET_THEMES.default;
  const isPreset = Boolean(PRESET_THEMES[activeId]);

  const seedHex = paletteHex(theme.seed.color, theme.seed.shade);

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: theme list + management */}
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm lg:col-span-1">
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15">
                <Palette className="h-4 w-4 text-violet-500 dark:text-violet-300" />
              </span>
              {t("ThemeCustomizer:themes")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("ThemeCustomizer:themesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
              {Object.values(themes).map((th) => {
                const active = th.id === activeId;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setActiveTheme(th.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-ring bg-accent"
                        : "border-border/60 hover:bg-accent/50"
                    )}
                  >
                    <span
                      className="h-5 w-5 rounded-md border border-border/50 shrink-0"
                      style={{ backgroundColor: paletteHex(th.seed.color, th.seed.shade) }}
                    />
                    <span className="flex-1 truncate text-sm">{th.name}</span>
                    {PRESET_THEMES[th.id] ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t("ThemeCustomizer:preset")}
                      </span>
                    ) : null}
                    {active ? <Check className="h-4 w-4 text-foreground/70" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => createTheme(t("ThemeCustomizer:newTheme"))}>
                <Plus className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:create")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => duplicateTheme(activeId)}>
                <Copy className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:duplicate")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = exportTheme(activeId);
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                  }
                  setImportText(data);
                  setImportOpen(true);
                }}
              >
                <Download className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:export")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen((v) => !v)}
              >
                <Upload className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:import")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 dark:text-rose-300"
                disabled={isPreset}
                onClick={() => deleteTheme(activeId)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:delete")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => resetThemes()}>
                <RotateCcw className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:reset")}
              </Button>
            </div>

            {importOpen ? (
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-muted-foreground">
                  {t("ThemeCustomizer:importDesc")}
                </Label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                  placeholder='{ "name": "...", "seed": { "color": "violet", "shade": 600 } }'
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const id = importTheme(importText);
                    if (id) {
                      setImportOpen(false);
                      setImportText("");
                    }
                  }}
                >
                  {t("ThemeCustomizer:applyImport")}
                </Button>
              </div>
            ) : null}

            <PreviewPanel
              theme={theme}
              accent={resolvePageAccent(theme, accentPage)}
              status={{
                success: resolveStatus(theme, "success"),
                danger: resolveStatus(theme, "danger"),
                warning: resolveStatus(theme, "warning"),
                info: resolveStatus(theme, "info"),
              }}
            />
          </CardContent>
        </Card>

        {/* Right: editor */}
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm lg:col-span-2">
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500" />
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Input
                  value={theme.name}
                  disabled={isPreset}
                  onChange={(e) => renameTheme(activeId, e.target.value)}
                  className="h-9 w-56 font-medium"
                />
                <Select
                  value={theme.baseMode}
                  onValueChange={(v) => !isPreset && updateTheme(activeId, { baseMode: v })}
                >
                  <SelectTrigger className="h-9 w-40" disabled={isPreset} title={t("ThemeCustomizer:previewModeHelp")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("ThemeCustomizer:previewLight")}</SelectItem>
                    <SelectItem value="dark">{t("ThemeCustomizer:previewDark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isPreset ? (
              <CardDescription className="text-amber-600 dark:text-amber-300">
                {t("ThemeCustomizer:presetReadonly")}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <Tabs value={state.mode} onValueChange={(v) => setMode(v)}>
              <TabsList className="mb-4">
                <TabsTrigger value="simple">{t("ThemeCustomizer:simple")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("ThemeCustomizer:advanced")}</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    {t("ThemeCustomizer:seedColor")}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:seedColorDesc")}
                  </p>
                  <ColorPicker
                    value={theme.seed}
                    onChange={(ref) => !isPreset && updateThemeSeed(activeId, ref)}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("ThemeCustomizer:contrast")}:
                  </span>
                  <ContrastBadge bgHex={seedHex} fgHex={readableForeground(seedHex)} />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                {/* Token overrides */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:tokens")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:tokensDesc")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EDITABLE_TOKENS.map((token) => {
                      const ref = theme.tokenOverrides[token] || theme.seed;
                      return (
                        <div key={token} className="rounded-lg border border-border/60 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">
                              {TOKEN_LABELS[token] || token}
                            </Label>
                            {theme.tokenOverrides[token] ? (
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => !isPreset && updateThemeToken(activeId, token, null)}
                              >
                                {t("ThemeCustomizer:auto")}
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {t("ThemeCustomizer:derived")}
                              </span>
                            )}
                          </div>
                          <ColorPicker
                            value={ref}
                            onChange={(r) => !isPreset && updateThemeToken(activeId, token, r)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Brand colors (hero + page header backdrop) */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:brand")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:brandDesc")}
                  </p>
                  <div className="rounded-lg border border-border/60 p-3">
                    <PairPicker
                      pair={resolveBrand(theme)}
                      disabled={isPreset}
                      t={t}
                      onChange={(pair) => !isPreset && updateBrand(activeId, pair)}
                    />
                  </div>
                </div>

                {/* Section accents (nav + home cards) */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:sectionAccents")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:sectionAccentsDesc")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {NAV_SECTIONS.map((section) => {
                      const customized = Boolean(theme.sectionAccents?.[section]);
                      const pair = resolveSectionAccent(theme, section);
                      return (
                        <div key={section} className="rounded-lg border border-border/60 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium capitalize">{section}</span>
                            {customized ? (
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => !isPreset && updateSectionAccent(activeId, section, null)}
                              >
                                {t("ThemeCustomizer:reset")}
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {t("ThemeCustomizer:derived")}
                              </span>
                            )}
                          </div>
                          <PairPicker
                            pair={pair}
                            disabled={isPreset}
                            t={t}
                            onChange={(p) => !isPreset && updateSectionAccent(activeId, section, p)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status colors */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:status")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:statusDesc")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {STATUS_ROLES.map((role) => (
                      <div key={role} className="rounded-lg border border-border/60 p-3 space-y-2">
                        <Label className="text-xs font-medium capitalize flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: paletteHex(resolveStatus(theme, role), 500) }}
                          />
                          {t(`ThemeCustomizer:status_${role}`)}
                        </Label>
                        <SwatchPicker
                          value={resolveStatus(theme, role)}
                          onChange={(c) => !isPreset && updateStatusAccent(activeId, role, c)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Global page accent */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:globalAccent")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:globalAccentDesc")}
                  </p>
                  <div className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-end">
                      {theme.globalAccent ? (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => !isPreset && updateGlobalAccent(activeId, null)}
                        >
                          {t("ThemeCustomizer:clear")}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {t("ThemeCustomizer:perPageDefault")}
                        </span>
                      )}
                    </div>
                    <TriplePicker
                      triple={theme.globalAccent || resolvePageAccent(theme, accentPage)}
                      disabled={isPreset}
                      t={t}
                      onChange={(tr) => !isPreset && updateGlobalAccent(activeId, tr)}
                    />
                  </div>
                </div>

                {/* Per-page accents */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">
                    {t("ThemeCustomizer:pageAccents")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:pageAccentsDesc")}
                  </p>
                  <div className="rounded-lg border border-border/60 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Select value={accentPage} onValueChange={setAccentPage}>
                        <SelectTrigger className="h-8 w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGES.map((p) => (
                            <SelectItem key={p.slug} value={p.slug}>
                              {p.label}
                              {theme.pageAccents?.[p.slug] ? " ●" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {theme.pageAccents?.[accentPage] ? (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => !isPreset && updatePageAccent(activeId, accentPage, null)}
                        >
                          {t("ThemeCustomizer:reset")}
                        </button>
                      ) : null}
                    </div>
                    <TriplePicker
                      triple={resolvePageAccent(theme, accentPage)}
                      disabled={isPreset}
                      t={t}
                      onChange={(tr) => !isPreset && updatePageAccent(activeId, accentPage, tr)}
                    />
                  </div>
                </div>

                {/* Per-page assignment */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    {t("ThemeCustomizer:perPage")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("ThemeCustomizer:perPageDesc")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PAGES.map((p) => {
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
                                  backgroundColor: paletteHex(
                                    themes[assigned].seed.color,
                                    themes[assigned].seed.shade
                                  ),
                                }}
                                title={t("ThemeCustomizer:overrideActive")}
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
                                {t("ThemeCustomizer:useActive")}
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
