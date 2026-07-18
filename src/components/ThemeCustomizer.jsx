import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";

import {
  $customTheme,
  $draftTheme,
  setActiveTheme,
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
  createDraftTheme,
  duplicateDraftTheme,
  saveDraftTheme,
  discardDraftTheme,
  deleteTheme,
  isValidThemeName,
  PRESET_THEMES,
  NAV_SECTIONS,
  STATUS_ROLES,
} from "@/stores/customTheme.ts";

import { ColorPicker, ColorArea, ColorSlider } from "@fluentui/react-color-picker";
import {
  EDITABLE_TOKENS,
  buildThemeVars,
  contrastRatio,
  readableForeground,
  hexToRgb,
  hsvToHex,
  hexToHsv,
} from "@/lib/tailwindPalette.js";
import { THEMABLE_PAGES } from "@/lib/pages.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Check,
  Save,
  X,
  SlidersHorizontal,
} from "lucide-react";


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

// ColorField: label+swatch sidebar on left, Fluent ColorPicker + palette shortcuts on right
function ColorField({ label, value, onChange, disabled }) {
  const currentHex = value?.hex || "#808080";
  const rgb = hexToRgb(currentHex) || { r: 128, g: 128, b: 128 };
  const [hsv, setHsv] = React.useState(() => hexToHsv(currentHex));
  const [hexInput, setHexInput] = React.useState("");
  const [rgbInputs, setRgbInputs] = React.useState({ r: "", g: "", b: "" });
  const [editingField, setEditingField] = React.useState(null);

  React.useEffect(() => {
    const hsvFromPalette = hexToHsv(currentHex);
    setHsv(hsvFromPalette);
  }, [currentHex]);

  React.useEffect(() => {
    if (editingField !== "hex") setHexInput(hsvToHex(hsv.h, hsv.s, hsv.v).replace("#", "").toUpperCase());
    if (editingField !== "rgb") setRgbInputs({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
  }, [hsv, rgb.r, rgb.g, rgb.b, editingField]);

  const handleFluentChange = React.useCallback((_, data) => {
    const newHsv = { h: data.color.h, s: data.color.s, v: data.color.v };
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onChange({ hex });
  }, [onChange]);

  const commitHex = (raw) => {
    const clean = raw.replace(/[^a-fA-F0-9]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      const hex = "#" + clean;
      setHsv(hexToHsv(hex));
      onChange({ hex });
    }
  };

  const commitRgb = (key, raw) => {
    const clean = raw.replace(/[^0-9]/g, "").slice(0, 3);
    const val = Math.min(255, Math.max(0, parseInt(clean || "0", 10)));
    const next = { ...rgbInputs, [key]: clean };
    setRgbInputs(next);
    if (clean.length >= 1) {
      const r = key === "r" ? val : parseInt(rgbInputs.r || "0", 10);
      const g = key === "g" ? val : parseInt(rgbInputs.g || "0", 10);
      const b = key === "b" ? val : parseInt(rgbInputs.b || "0", 10);
      const toHex = (n) => n.toString(16).padStart(2, "0");
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      setHsv(hexToHsv(hex));
      onChange({ hex });
    }
  };

  return (
    <div className="rounded-lg p-3 space-y-3 overflow-hidden">
      {/* Fluent ColorPicker */}
      <div className="w-full max-w-full overflow-hidden">
        <ColorPicker color={hsv} onColorChange={handleFluentChange} shape="square">
          <ColorArea />
          <ColorSlider channel="hue" />
        </ColorPicker>
      </div>
      {/* Hex + RGB inputs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">#</span>
          <input
            type="text"
            value={hexInput}
            disabled={disabled}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={() => commitHex(hexInput)}
            onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
            onFocus={() => setEditingField("hex")}
            maxLength={6}
            placeholder="FFFFFF"
            className={cn(
              "w-[68px] h-6 rounded border border-border/60 bg-background px-1.5 text-[11px] font-mono uppercase",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <div className="flex items-center gap-0.5">
          {["r", "g", "b"].map((key) => (
            <React.Fragment key={key}>
              {key !== "r" && <span className="text-[9px] text-muted-foreground">,</span>}
              <input
                type="text"
                value={rgbInputs[key]}
                disabled={disabled}
                onChange={(e) => commitRgb(key, e.target.value)}
                onFocus={() => setEditingField("rgb")}
                maxLength={3}
                placeholder={key.toUpperCase()}
                className={cn(
                  "w-[30px] h-6 rounded border border-border/60 bg-background px-1 text-[11px] font-mono text-center",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
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

function PreviewPanel({ theme, accent, status, mode }) {
  const { light, dark } = buildThemeVars(theme);
  const vars = mode === "dark" ? dark : light;
  const swatch = (label, color) => (
    <div key={label} className="flex flex-col items-center gap-1">
      <span
        className="h-6 w-6 rounded-md border border-black/10"
        style={{ backgroundColor: color || "#808080" }}
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
        <span className="text-xs opacity-70">{mode} mode</span>
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

// Row component for the react-window saved themes list
function ThemeRow({ index, style, themes, activeId, draftTheme, onSelect }) {
  const th = themes[index];
  const active = th.id === activeId;
  return (
    <div style={style} className="px-1 py-0.5">
      <button
        type="button"
        onClick={() => onSelect(th)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
          active
            ? "border-ring bg-accent"
            : "border-border/60 hover:bg-accent/50"
        )}
      >
        <span
          className="h-5 w-5 rounded-md border border-border/50 shrink-0"
          style={{ backgroundColor: th.seed?.hex || "#808080" }}
        />
        <span className="flex-1 truncate text-sm">{th.name}</span>
        {th.draft ? (
          <span className="text-[10px] uppercase tracking-wide text-blue-500 dark:text-blue-300">
            Draft
          </span>
        ) : PRESET_THEMES[th.id] ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Preset
          </span>
        ) : null}
        {active ? <Check className="h-4 w-4 text-foreground/70" /> : null}
      </button>
    </div>
  );
}

// Row component for the react-window color items list.
// Each row is either a category header or an item — never both.
function ColorItemRow({ index, style, colorItems, selectedColor, onSelect }) {
  const item = colorItems[index];
  if (item.type === "header") {
    return (
      <div style={style} className="flex items-end px-3 pb-1 bg-muted/20">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.category}</span>
      </div>
    );
  }
  return (
    <div style={style}>
      <button
        type="button"
        onClick={() => onSelect(index)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 h-full text-left transition-colors",
          item.selectedIndex === selectedColor ? "bg-accent" : "hover:bg-accent/50"
        )}
      >
        <span
          className="h-4 w-4 rounded-full shrink-0 border border-black/10"
          style={{ backgroundColor: item.value?.hex || "#808080" }}
        />
        <span className="text-xs truncate">{item.label}</span>
      </button>
    </div>
  );
}

export default function ThemeCustomizer() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const state = useStore($customTheme);
  const draftTheme = useStore($draftTheme);
  const [accentPage, setAccentPage] = React.useState(THEMABLE_PAGES[0]?.slug || "index");
  const [editedName, setEditedName] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewThemeId, setPreviewThemeId] = React.useState(state.activeThemeId);
  const [pendingEdits, setPendingEdits] = React.useState(null);
  const [previewMode, setPreviewMode] = React.useState(state.themes[state.activeThemeId]?.baseMode || "light");
  const prevActiveIdRef = React.useRef(null);

  // Sync preview when the global active theme changes (e.g. from header theme-selector)
  React.useEffect(() => {
    setPreviewThemeId(state.activeThemeId);
    setPendingEdits(null);
    setEditedName("");
  }, [state.activeThemeId]);

  const themes = state.themes || {};
  const activeId = draftTheme?.id || previewThemeId;
  const baseTheme = draftTheme && draftTheme.id === activeId ? draftTheme : (themes[activeId] || PRESET_THEMES.default);
  const theme = pendingEdits ? { ...baseTheme, ...pendingEdits } : baseTheme;
  const isPreset = Boolean(PRESET_THEMES[activeId]);
  const isDraft = Boolean(draftTheme && draftTheme.id === activeId);
  const canEdit = !isPreset;
  const isDirty = Boolean(pendingEdits || isDraft);

  const seedHex = theme.seed?.hex || "#808080";

  // Sorted theme list for the react-window list (draft first, then saved themes)
  const themeList = React.useMemo(() => {
    return [
      ...(draftTheme ? [draftTheme] : []),
      ...Object.values(themes).filter((th) => !draftTheme || th.id !== draftTheme.id),
    ];
  }, [themes, draftTheme]);

  // Build flattened color items list for the left panel (headers + items as separate rows)
  const colorItems = React.useMemo(() => {
    const groups = [];
    const br = resolveBrand(theme);
    // Seed
    groups.push({ category: t("ThemeCustomizer:seedColor"), items: [
      { id: "seed", label: t("ThemeCustomizer:seedColor"), value: theme.seed },
    ]});
    // Tokens
    groups.push({ category: t("ThemeCustomizer:tokens"), items: EDITABLE_TOKENS.map((token) => ({
      id: `token_${token}`, label: TOKEN_LABELS[token] || token, value: theme.tokenOverrides[token] || theme.seed,
    }))});
    // Brand
    groups.push({ category: t("ThemeCustomizer:brand"), items: [
      { id: "brand_primary", label: t("ThemeCustomizer:primary"), value: { hex: br.primary } },
      { id: "brand_secondary", label: t("ThemeCustomizer:secondary"), value: { hex: br.secondary } },
    ]});
    // Section accents
    const sectionItems = [];
    NAV_SECTIONS.forEach((section) => {
      const pair = resolveSectionAccent(theme, section);
      sectionItems.push({ id: `section_${section}_primary`, label: `${section} ${t("ThemeCustomizer:primary")}`, value: { hex: pair.primary } });
      sectionItems.push({ id: `section_${section}_secondary`, label: `${section} ${t("ThemeCustomizer:secondary")}`, value: { hex: pair.secondary } });
    });
    groups.push({ category: t("ThemeCustomizer:sectionAccents"), items: sectionItems });
    // Status
    groups.push({ category: t("ThemeCustomizer:status"), items: STATUS_ROLES.map((role) => ({
      id: `status_${role}`, label: t(`ThemeCustomizer:status_${role}`), value: { hex: resolveStatus(theme, role) },
    }))});
    // Global accent
    const ga = theme.globalAccent || resolvePageAccent(theme, accentPage);
    groups.push({ category: t("ThemeCustomizer:globalAccent"), items: ["primary", "secondary", "tertiary"].map((role) => ({
      id: `global_${role}`, label: `${t("ThemeCustomizer:globalAccent")} ${t(`ThemeCustomizer:${role}`)}`, value: { hex: ga[role] },
    }))});
    // Page accents
    const pa = resolvePageAccent(theme, accentPage);
    groups.push({ category: t("ThemeCustomizer:pageAccents"), items: ["primary", "secondary", "tertiary"].map((role) => ({
      id: `page_${role}`, label: `${t("ThemeCustomizer:pageAccents")} ${t(`ThemeCustomizer:${role}`)}`, value: { hex: pa[role] },
    }))});

    // Flatten: each category gets a header row then item rows
    const flat = [];
    let itemIndex = 0;
    for (const group of groups) {
      flat.push({ type: "header", category: group.category });
      for (const item of group.items) {
        flat.push({ ...item, type: "item", category: group.category, selectedIndex: itemIndex });
        itemIndex++;
      }
    }
    return flat;
  }, [theme, accentPage, t]);

  const [selectedColor, setSelectedColor] = React.useState(0);
  // selectedColor is the logical item index; find the flat index for display
  const selectedFlatIndex = React.useMemo(() => {
    return colorItems.findIndex((ci) => ci.type === "item" && ci.selectedIndex === selectedColor);
  }, [colorItems, selectedColor]);
  const selectedItem = colorItems.find((ci) => ci.type === "item" && ci.selectedIndex === selectedColor);

  const handleColorChange = React.useCallback((ref) => {
    if (!canEdit || !selectedItem) return;
    const id = selectedItem.id;
    setPendingEdits((prev) => {
      const base = prev || {};
      if (id === "seed") {
        return { ...base, seed: ref };
      } else if (id.startsWith("token_")) {
        const tokenOverrides = { ...(base.tokenOverrides || theme.tokenOverrides || {}), [id.slice(6)]: ref };
        return { ...base, tokenOverrides };
      } else if (id === "brand_primary" || id === "brand_secondary") {
        const br = base.brand || resolveBrand(theme);
        const key = id === "brand_primary" ? "primary" : "secondary";
        return { ...base, brand: { ...br, [key]: ref.hex } };
      } else if (id.startsWith("section_")) {
        const parts = id.split("_");
        const section = parts[1];
        const key = parts[2];
        const sectionAccents = { ...(base.sectionAccents || theme.sectionAccents || {}) };
        const pair = sectionAccents[section] || resolveSectionAccent(theme, section);
        sectionAccents[section] = { ...pair, [key]: ref.hex };
        return { ...base, sectionAccents };
      } else if (id.startsWith("status_")) {
        const statusAccents = { ...(base.statusAccents || theme.statusAccents || {}), [id.slice(7)]: ref.hex };
        return { ...base, statusAccents };
      } else if (id.startsWith("global_")) {
        const role = id.slice(7);
        const current = base.globalAccent || theme.globalAccent || resolvePageAccent(theme, accentPage);
        return { ...base, globalAccent: { ...current, [role]: ref.hex } };
      } else if (id.startsWith("page_")) {
        const role = id.slice(5);
        const pageAccents = { ...(base.pageAccents || theme.pageAccents || {}) };
        const current = pageAccents[accentPage] || resolvePageAccent(theme, accentPage);
        pageAccents[accentPage] = { ...current, [role]: ref.hex };
        return { ...base, pageAccents };
      }
      return prev;
    });
  }, [canEdit, selectedItem, theme, accentPage]);

  // Sync editedName when the active theme changes (not on every store update)
  React.useEffect(() => {
    if (prevActiveIdRef.current !== activeId) {
      prevActiveIdRef.current = activeId;
      setEditedName(theme.name);
      setNameError("");
    }
  }, [activeId, theme.name]);

  const handleSaveDraft = () => {
    if (!draftTheme) return;
    const name = editedName.trim();
    if (!isValidThemeName(name)) {
      if (!name) setNameError(t("ThemeCustomizer:nameRequired") || "Name is required");
      else if (name.length > 24) setNameError(t("ThemeCustomizer:nameTooLong") || "Max 24 characters");
      else setNameError(t("ThemeCustomizer:nameInvalidChars") || "Only letters, numbers and spaces");
      return;
    }
    // Flush pending edits into the draft before saving
    if (pendingEdits) {
      const updated = { ...draftTheme, ...pendingEdits, name: editedName.trim() };
      $draftTheme.set(updated);
      setPendingEdits(null);
    }
    const result = saveDraftTheme(pendingEdits ? { ...draftTheme, ...pendingEdits } : draftTheme, editedName);
    setActiveTheme(result.id);
    prevActiveIdRef.current = result.id;
  };

  const handleSaveEdits = () => {
    if (!pendingEdits) return;
    const name = (pendingEdits.name || theme.name || "").trim();
    if (!isValidThemeName(name)) {
      if (!name) setNameError(t("ThemeCustomizer:nameRequired") || "Name is required");
      else if (name.length > 24) setNameError(t("ThemeCustomizer:nameTooLong") || "Max 24 characters");
      else setNameError(t("ThemeCustomizer:nameInvalidChars") || "Only letters, numbers and spaces");
      return;
    }
    updateTheme(activeId, { ...pendingEdits, name });
    setPendingEdits(null);
    setEditedName("");
  };

  const handleDiscardEdits = () => {
    setPendingEdits(null);
    setEditedName("");
    setNameError("");
  };

  const handleDiscardDraft = () => {
    discardDraftTheme();
    setPendingEdits(null);
    setActiveTheme("default");
    prevActiveIdRef.current = "default";
  };

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground space-y-3">
      {/* Row 1: Themes */}
      <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
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
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Theme list */}
            <div className="lg:w-1/3 shrink-0 flex flex-col">
              <div className="flex-1" style={{ maxHeight: "256px" }}>
                {themeList.length > 0 ? (
                  <List
                    rowComponent={ThemeRow}
                    rowCount={themeList.length}
                    rowHeight={44}
                    rowProps={{ themes: themeList, activeId, draftTheme, onSelect: (th) => {
                      if (draftTheme && th.id !== draftTheme.id) {
                        discardDraftTheme();
                      }
                      setPendingEdits(null);
                      setEditedName("");
                      setNameError("");
                      setPreviewThemeId(th.id);
                    } }}
                  />
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">No themes</div>
                )}
              </div>
            </div>

            {/* Buttons + preview */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const id = createDraftTheme(t("ThemeCustomizer:newTheme"));
                  prevActiveIdRef.current = id;
                }}>
                  <Plus className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:create")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const id = duplicateDraftTheme(activeId);
                  if (id) {
                    prevActiveIdRef.current = id;
                  }
                }}>
                  <Copy className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:duplicate")}
                </Button>
                <Select
                  value={previewMode}
                  onValueChange={(v) => setPreviewMode(v)}
                >
                  <SelectTrigger className="h-8" title={t("ThemeCustomizer:previewModeHelp")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("ThemeCustomizer:previewLight")}</SelectItem>
                    <SelectItem value="dark">{t("ThemeCustomizer:previewDark")}</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 dark:text-rose-300"
                      disabled={isPreset || isDraft}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/20">
                          <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                        </span>
                        {t("ThemeCustomizer:deleteDialogTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("ThemeCustomizer:deleteDialogDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("ThemeCustomizer:deleteDialogCancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteTheme(activeId);
                          setDeleteDialogOpen(false);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        {t("ThemeCustomizer:deleteDialogConfirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <PreviewPanel
                theme={theme}
                accent={resolvePageAccent(theme, accentPage)}
                mode={previewMode}
                status={{
                  success: resolveStatus(theme, "success"),
                  danger: resolveStatus(theme, "danger"),
                  warning: resolveStatus(theme, "warning"),
                  info: resolveStatus(theme, "info"),
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Theme customizer */}
      <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
                </span>
                {t("ThemeCustomizer:customizerTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {t("ThemeCustomizer:customizerDesc")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDraft ? (
                <div className="flex flex-col gap-1">
                  <Input
                    value={editedName}
                    onChange={(e) => {
                      setEditedName(e.target.value);
                      setNameError("");
                    }}
                    maxLength={24}
                    pattern="[a-zA-Z0-9 ]*"
                    className={cn("h-9 w-56 font-medium", nameError && "border-rose-500")}
                    placeholder={t("ThemeCustomizer:themeName") || "Theme name"}
                  />
                  {nameError ? (
                    <span className="text-[11px] text-rose-500">{nameError}</span>
                  ) : null}
                </div>
              ) : (
                <Input
                  value={isDirty ? (editedName || theme.name) : theme.name}
                  disabled={isPreset}
                  onChange={(e) => {
                    setEditedName(e.target.value);
                    setNameError("");
                    setPendingEdits((prev) => ({ ...(prev || {}), name: e.target.value }));
                  }}
                  className="h-9 w-56 font-medium"
                />
              )}
              {isDraft ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={!editedName.trim()}
                  >
                    <Save className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:save") || "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardDraft}
                  >
                    <X className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:discard") || "Discard"}
                  </Button>
                </div>
              ) : pendingEdits ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdits}
                  >
                    <Save className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:save") || "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardEdits}
                  >
                    <X className="h-4 w-4 mr-1" /> {t("ThemeCustomizer:discard") || "Discard"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          {isPreset ? (
            <CardDescription className="text-amber-600 dark:text-amber-300">
              {t("ThemeCustomizer:presetReadonly")}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
            {/* Left: color items list */}
            <div className="w-1/3 shrink-0 flex flex-col border border-border/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border/60 bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">{t("ThemeCustomizer:themeElements")}</span>
              </div>
              <div className="flex-1 overflow-auto">
                {colorItems.length > 0 ? (
                  <List
                    rowComponent={ColorItemRow}
                    rowCount={colorItems.length}
                    rowHeight={36}
                    rowProps={{ colorItems, selectedColor, onSelect: (flatIdx) => {
                      const item = colorItems[flatIdx];
                      if (item?.type === "item") setSelectedColor(item.selectedIndex);
                    } }}
                  />
                ) : (
                  <div className="p-3 text-xs text-muted-foreground">No color items</div>
                )}
              </div>
            </div>

            {/* Right: single color picker */}
            <div className="flex-1 flex flex-col">
              {selectedItem ? (
                <>
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2 rounded-t-lg">
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: selectedItem.value?.hex || "#808080" }} />
                    <span className="text-sm font-medium">{selectedItem.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{selectedItem.category}</span>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <ColorField
                      label={selectedItem.label}
                      value={selectedItem.value}
                      onChange={handleColorChange}
                      disabled={!canEdit}
                    />
                    {selectedItem.id === "seed" && (
                      <div className="flex items-center gap-2 text-sm mt-3">
                        <span className="text-muted-foreground">{t("ThemeCustomizer:contrast")}:</span>
                        <ContrastBadge bgHex={seedHex} fgHex={readableForeground(seedHex)} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a color to edit
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
