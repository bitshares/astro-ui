import { persistentMap } from "@nanostores/persistent";
import { atom } from "nanostores";
import { buildThemeCss } from "@/lib/tailwindPalette.js";

// localStorage key holding the compiled CSS of the active theme. Read by the
// blocking inline <head> script so themes apply before first paint (no FOUC),
// exactly like the light/dark class toggle. NOTE: this must NOT start with the
// persistentMap prefix ("customTheme:"), otherwise the map would ingest it as a
// phantom store key.
export const ACTIVE_CSS_KEY = "btsThemeActiveCss";

// The authoritative current page slug, published by PageHeader (not guessed
// from the URL). Used to resolve per-page theme overrides.
export const $currentPage = atom<string>("index");
export function setCurrentPage(slug: string) {
  if (slug) $currentPage.set(slug);
}

// Canonical nav section ids (shared by PageHeader & AppSidebar). AppSidebar
// maps its local keys onto these.
export const NAV_SECTIONS = [
  "exchanging",
  "transfer",
  "debt",
  "assetCreation",
  "account",
  "blockchain",
  "governance",
  "invoicing",
  "settings",
] as const;

export type NavSection = (typeof NAV_SECTIONS)[number];

export type PaletteRef = { color: string; shade: number };

// A two-color accent used by gradients (bars, hero, section backgrounds).
export type AccentPair = { primary: string; secondary: string };

// A three-color accent used by page components (primary/secondary/tertiary).
export type AccentTriple = { primary: string; secondary: string; tertiary: string };

// Status roles used by data components (buy/sell, success/danger, etc.).
export const STATUS_ROLES = ["success", "danger", "warning", "info"] as const;
export type StatusRole = (typeof STATUS_ROLES)[number];

export type CustomTheme = {
  id: string;
  name: string;
  baseMode: "light" | "dark";
  seed: PaletteRef;
  tokenOverrides: Record<string, PaletteRef>;
  // Brand pair drives the hero panel + page-header backdrop.
  brand?: AccentPair;
  // Sparse per-section overrides; when unset a section (and its item cards) use
  // their built-in defaults, so an untouched theme looks identical to before.
  sectionAccents?: Partial<Record<NavSection, AccentPair>>;
  // Status role -> palette color name.
  statusAccents?: Partial<Record<StatusRole, string>>;
  // Per-page accent-role overrides (page components: primary/secondary/tertiary).
  pageAccents?: Record<string, AccentTriple>;
  // Optional single accent applied to all pages that lack a per-page override.
  globalAccent?: AccentTriple;
};

// Brand pair (hero + header backdrop) — matches the original indigo→fuchsia.
export const DEFAULT_BRAND: AccentPair = { primary: "indigo", secondary: "fuchsia" };

// Analogous colour neighbours used to derive a pleasant secondary/tertiary from
// a single seed/brand colour (so "one colour fits all" produces multi-tone
// gradients rather than a flat monochrome).
const SECONDARY_OF: Record<string, string> = {
  slate: "gray", gray: "zinc", zinc: "slate", red: "orange", orange: "amber",
  amber: "orange", yellow: "amber", lime: "green", green: "emerald",
  emerald: "teal", teal: "cyan", cyan: "sky", sky: "blue", blue: "indigo",
  indigo: "violet", violet: "fuchsia", purple: "violet", fuchsia: "pink",
  pink: "rose", rose: "red",
};
const TERTIARY_OF: Record<string, string> = {
  slate: "zinc", gray: "slate", zinc: "gray", red: "amber", orange: "yellow",
  amber: "yellow", yellow: "lime", lime: "emerald", green: "teal",
  emerald: "cyan", teal: "sky", cyan: "blue", sky: "indigo", blue: "violet",
  indigo: "fuchsia", violet: "purple", purple: "fuchsia", fuchsia: "rose",
  pink: "red", rose: "orange",
};

function analogousPair(color: string): AccentPair {
  return { primary: color, secondary: SECONDARY_OF[color] || color };
}
function analogousTriple(color: string): AccentTriple {
  return {
    primary: color,
    secondary: SECONDARY_OF[color] || color,
    tertiary: TERTIARY_OF[color] || SECONDARY_OF[color] || color,
  };
}

// Per-section accent pairs mirror the original Home SECTION_STYLES gradients.
export const DEFAULT_SECTION_ACCENTS: Record<NavSection, AccentPair> = {
  exchanging: { primary: "cyan", secondary: "blue" },
  transfer: { primary: "sky", secondary: "blue" },
  debt: { primary: "emerald", secondary: "teal" },
  assetCreation: { primary: "violet", secondary: "fuchsia" },
  account: { primary: "emerald", secondary: "sky" },
  blockchain: { primary: "slate", secondary: "gray" },
  governance: { primary: "indigo", secondary: "violet" },
  invoicing: { primary: "amber", secondary: "orange" },
  settings: { primary: "violet", secondary: "rose" },
};

// Status defaults (conventional colors).
export const DEFAULT_STATUS: Record<StatusRole, string> = {
  success: "emerald",
  danger: "red",
  warning: "amber",
  info: "sky",
};

// Per-page default accent triples (primary/secondary/tertiary), captured from
// each page's original hardcoded palette so the default look is preserved once
// a page is migrated to the accent-var system. Entries are added as each page
// is migrated; unlisted pages fall back to the brand pair.
export const PAGE_ACCENTS: Record<string, AccentTriple> = {
  instant_trade: { primary: "amber", secondary: "blue", tertiary: "orange" },
  pool: { primary: "cyan", secondary: "blue", tertiary: "indigo" },
  stake: { primary: "purple", secondary: "violet", tertiary: "indigo" },
  invoice_inventory: { primary: "emerald", secondary: "rose", tertiary: "teal" },
  tfund_user: { primary: "violet", secondary: "blue", tertiary: "amber" },
  offereditor: { primary: "violet", secondary: "indigo", tertiary: "teal" },
  stored_invoices: { primary: "emerald", secondary: "teal", tertiary: "blue" },
  smartcoins: { primary: "indigo", secondary: "cyan", tertiary: "violet" },
  create_invoice: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  tfunds: { primary: "rose", secondary: "teal", tertiary: "blue" },
  proposals: { primary: "indigo", secondary: "cyan", tertiary: "amber" },
  pay_invoice: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  create_vesting: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  borrow: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  htlc: { primary: "rose", secondary: "emerald", tertiary: "teal" },
  create_pool: { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  withdraw_permissions: { primary: "amber", secondary: "orange", tertiary: "teal" },
  vote: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  witnesses: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  committee: { primary: "violet", secondary: "indigo", tertiary: "purple" },
  governance: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  create_ticket: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  deals: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  offers: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  smartcoin: { primary: "indigo", secondary: "violet", tertiary: "purple" },
  dex: { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  order: { primary: "amber", secondary: "sky", tertiary: "indigo" },
  offer: { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  settlement: { primary: "amber", secondary: "sky", tertiary: "indigo" },
  "portfolio-open-orders": { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  "portfolio-recent-activity": { primary: "blue", secondary: "cyan", tertiary: "indigo" },
  "portfolio-balances": { primary: "emerald", secondary: "teal", tertiary: "sky" },
  featured: { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  barter: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  vesting: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  AccountLists: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  ltm: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  create_worker: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  uia: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  create_account: { primary: "emerald", secondary: "teal", tertiary: "sky" },
  issuedAssets: { primary: "rose", secondary: "sky", tertiary: "amber" },
  "blocked-users": { primary: "rose", secondary: "sky", tertiary: "amber" },
  favourites: { primary: "amber", secondary: "sky", tertiary: "indigo" },
  ticket_leaderboard: { primary: "amber", secondary: "sky", tertiary: "indigo" },
  transfer: { primary: "violet", secondary: "indigo", tertiary: "fuchsia" },
  timed_transfer: { primary: "cyan", secondary: "sky", tertiary: "indigo" },
  create_smartcoin: { primary: "violet", secondary: "indigo", tertiary: "fuchsia" },
  custom_pool_tracker: { primary: "purple", secondary: "indigo", tertiary: "fuchsia" },
  custom_pool_overview: { primary: "purple", secondary: "indigo", tertiary: "fuchsia" },
  blocks: { primary: "purple", secondary: "indigo", tertiary: "fuchsia" },
  pools: { primary: "purple", secondary: "indigo", tertiary: "fuchsia" },
  configure_visuals: { primary: "violet", secondary: "indigo", tertiary: "fuchsia" },
};

// Fallback triple derived from the brand pair for pages not yet catalogued.
function brandTriple(theme: CustomTheme): AccentTriple {
  // An explicit brand keeps its exact pair (+ analogous tertiary); otherwise the
  // triple is derived from the seed so one colour drives all page accents.
  if (theme?.brand) {
    return {
      primary: theme.brand.primary,
      secondary: theme.brand.secondary,
      tertiary: TERTIARY_OF[theme.brand.primary] || theme.brand.secondary,
    };
  }
  const seedColor = theme?.seed?.color || DEFAULT_BRAND.primary;
  return analogousTriple(seedColor);
}

// Per-item accent pairs, migrated verbatim from the original Home ITEM_ACCENTS,
// so each card keeps its exact default color unless its section is customized.
export const DEFAULT_ITEM_ACCENTS: Record<string, AccentPair> = {
  dex: { primary: "indigo", secondary: "cyan" },
  instant_trade: { primary: "amber", secondary: "orange" },
  swap: { primary: "blue", secondary: "indigo" },
  stake: { primary: "cyan", secondary: "sky" },
  barter: { primary: "sky", secondary: "blue" },
  tfund_user: { primary: "emerald", secondary: "teal" },
  transfer: { primary: "sky", secondary: "blue" },
  timed_transfer: { primary: "cyan", secondary: "sky" },
  withdraw_permissions: { primary: "blue", secondary: "indigo" },
  htlc: { primary: "violet", secondary: "purple" },
  create_vesting: { primary: "fuchsia", secondary: "pink" },
  borrow: { primary: "emerald", secondary: "teal" },
  lend: { primary: "amber", secondary: "orange" },
  smartcoins: { primary: "indigo", secondary: "cyan" },
  tfunds: { primary: "rose", secondary: "red" },
  portfolio_balances: { primary: "emerald", secondary: "teal" },
  portfolio_open_orders: { primary: "cyan", secondary: "sky" },
  favourites: { primary: "amber", secondary: "yellow" },
  issued_assets: { primary: "violet", secondary: "purple" },
  offers: { primary: "sky", secondary: "blue" },
  deals: { primary: "blue", secondary: "indigo" },
  vesting: { primary: "fuchsia", secondary: "pink" },
  proposals: { primary: "rose", secondary: "red" },
  blocks: { primary: "slate", secondary: "gray" },
  custom_pool_tracker: { primary: "teal", secondary: "cyan" },
  pools: { primary: "cyan", secondary: "sky" },
  vote: { primary: "indigo", secondary: "violet" },
  witnesses: { primary: "amber", secondary: "orange" },
  committee: { primary: "emerald", secondary: "teal" },
  governance: { primary: "violet", secondary: "purple" },
  create_worker: { primary: "sky", secondary: "blue" },
  create_ticket: { primary: "fuchsia", secondary: "pink" },
  ticket_leaderboard: { primary: "rose", secondary: "red" },
  invoice_inventory: { primary: "amber", secondary: "orange" },
  create_invoice: { primary: "cyan", secondary: "sky" },
  pay_invoice: { primary: "emerald", secondary: "teal" },
  stored_invoices: { primary: "sky", secondary: "blue" },
  accountLists: { primary: "slate", secondary: "gray" },
  ltm: { primary: "amber", secondary: "yellow" },
  nodes: { primary: "teal", secondary: "cyan" },
  create_account: { primary: "emerald", secondary: "green" },
  blocked_users: { primary: "rose", secondary: "red" },
  configure_visuals: { primary: "violet", secondary: "fuchsia" },
  theme_customizer: { primary: "violet", secondary: "fuchsia" },
  about: { primary: "blue", secondary: "indigo" },
  create_uia: { primary: "violet", secondary: "fuchsia" },
  create_smartcoin: { primary: "violet", secondary: "purple" },
  create_liquidity_pool: { primary: "fuchsia", secondary: "pink" },
};

type MakeThemeOpts = {
  brand?: AccentPair;
  sectionAccents?: Partial<Record<NavSection, AccentPair>>;
  statusAccents?: Partial<Record<StatusRole, string>>;
};

function makeTheme(
  id: string,
  name: string,
  baseMode: "light" | "dark",
  seed: PaletteRef,
  opts: MakeThemeOpts = {}
): CustomTheme {
  return {
    id,
    name,
    baseMode,
    seed,
    tokenOverrides: {},
    brand: opts.brand,
    sectionAccents: opts.sectionAccents || {},
    statusAccents: opts.statusAccents || {},
  };
}

// Built-in presets users can start from.
export const PRESET_THEMES: Record<string, CustomTheme> = {
  default: makeTheme("default", "Default", "light", { color: "slate", shade: 700 }),
  ocean: makeTheme("ocean", "Ocean", "dark", { color: "cyan", shade: 600 }, {
    brand: { primary: "cyan", secondary: "blue" },
    sectionAccents: {
      exchanging: { primary: "cyan", secondary: "sky" },
      transfer: { primary: "sky", secondary: "blue" },
      blockchain: { primary: "blue", secondary: "indigo" },
    },
  }),
  sunset: makeTheme("sunset", "Sunset", "light", { color: "orange", shade: 600 }, {
    brand: { primary: "orange", secondary: "rose" },
    sectionAccents: {
      exchanging: { primary: "amber", secondary: "orange" },
      governance: { primary: "rose", secondary: "red" },
      invoicing: { primary: "orange", secondary: "amber" },
    },
  }),
  emerald: makeTheme("emerald", "Emerald", "light", { color: "emerald", shade: 600 }, {
    brand: { primary: "emerald", secondary: "teal" },
    sectionAccents: {
      debt: { primary: "emerald", secondary: "green" },
      account: { primary: "teal", secondary: "cyan" },
    },
  }),
  contrast: makeTheme("contrast", "High Contrast", "dark", { color: "yellow", shade: 500 }, {
    brand: { primary: "yellow", secondary: "amber" },
    sectionAccents: {
      exchanging: { primary: "yellow", secondary: "amber" },
      transfer: { primary: "yellow", secondary: "amber" },
      settings: { primary: "yellow", secondary: "amber" },
    },
  }),
};

// --- Accent resolvers (fall back to defaults so partial themes are safe) ----
export function resolveBrand(theme: CustomTheme): AccentPair {
  if (theme?.brand) return theme.brand;
  // Non-default themes derive their brand from the seed, so Simple mode's single
  // colour cascades into the hero, nav/home sections and page accents.
  if (theme && theme.id !== "default" && theme.seed?.color) {
    return analogousPair(theme.seed.color);
  }
  return DEFAULT_BRAND;
}

// A section uses its explicit override if set. Otherwise the pristine "default"
// theme keeps the original multi-color design, while every other theme falls
// back to its brand pair so selecting a theme visibly recolors the whole app.
export function resolveSectionAccent(theme: CustomTheme, section: string): AccentPair {
  const override = theme?.sectionAccents?.[section as NavSection];
  if (override) return override;
  if (theme && theme.id !== "default") return resolveBrand(theme);
  return DEFAULT_SECTION_ACCENTS[section as NavSection] || DEFAULT_BRAND;
}

// Item cards keep their bespoke default only on the pristine "default" theme (or
// when their section is untouched); any other theme applies its section/brand
// color so the card grid follows the selected theme.
export function resolveItemAccent(
  theme: CustomTheme,
  itemSlug: string,
  section: string
): AccentPair {
  const sectionOverride = theme?.sectionAccents?.[section as NavSection];
  if (sectionOverride) return sectionOverride;
  if (theme && theme.id !== "default") return resolveBrand(theme);
  return (
    DEFAULT_ITEM_ACCENTS[itemSlug] ||
    DEFAULT_SECTION_ACCENTS[section as NavSection] ||
    DEFAULT_BRAND
  );
}

export function resolveStatus(theme: CustomTheme, role: StatusRole): string {
  return theme?.statusAccents?.[role] || DEFAULT_STATUS[role];
}

export function resolveStatusAll(theme: CustomTheme): Record<StatusRole, string> {
  return {
    success: resolveStatus(theme, "success"),
    danger: resolveStatus(theme, "danger"),
    warning: resolveStatus(theme, "warning"),
    info: resolveStatus(theme, "info"),
  };
}

// Page component accent triple. Precedence: explicit per-page override →
// theme-wide global accent → catalogued page default → brand fallback.
// Precedence: explicit per-page override → theme-wide global accent → for the
// pristine "default" theme the faithful catalogued default → otherwise the
// theme's brand (so selecting/customizing a theme recolors page components) →
// catalogued default → brand fallback.
export function resolvePageAccent(theme: CustomTheme, page: string): AccentTriple {
  if (theme?.pageAccents?.[page]) return theme.pageAccents[page];
  if (theme?.globalAccent) return theme.globalAccent;
  if (theme && theme.id === "default") {
    return PAGE_ACCENTS[page] || brandTriple(theme);
  }
  return brandTriple(theme);
}

type ThemeStore = {
  themes: Record<string, CustomTheme>;
  activeThemeId: string;
  mode: "simple" | "advanced";
  pageThemeMap: Record<string, string>;
};

const DEFAULTS: ThemeStore = {
  themes: PRESET_THEMES,
  activeThemeId: "default",
  mode: "simple",
  pageThemeMap: {},
};

export const $customTheme = persistentMap<ThemeStore>(
  "customTheme:",
  DEFAULTS,
  {
    encode: (v) => JSON.stringify(v),
    // persistentMap decodes each top-level key's value individually.
    decode: (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    },
  }
);

function genId(): string {
  return "theme_" + Math.random().toString(36).slice(2, 9);
}

export function getThemes(): Record<string, CustomTheme> {
  return $customTheme.get().themes || {};
}

export function getActiveTheme(): CustomTheme {
  const state = $customTheme.get();
  return state.themes[state.activeThemeId] || PRESET_THEMES.default;
}

export function getThemeForPage(pageSlug: string): CustomTheme {
  const state = $customTheme.get();
  const mapped = state.pageThemeMap[pageSlug];
  if (mapped && state.themes[mapped]) return state.themes[mapped];
  return state.themes[state.activeThemeId] || PRESET_THEMES.default;
}

export function setActiveTheme(id: string) {
  if (!$customTheme.get().themes[id]) return;
  $customTheme.setKey("activeThemeId", id);
}

export function setMode(mode: "simple" | "advanced") {
  $customTheme.setKey("mode", mode);
}

export function setPageTheme(pageSlug: string, themeId: string | null) {
  const map = { ...$customTheme.get().pageThemeMap };
  if (!themeId) delete map[pageSlug];
  else map[pageSlug] = themeId;
  $customTheme.setKey("pageThemeMap", map);
}

export function updateTheme(id: string, patch: Partial<CustomTheme>) {
  const themes = { ...$customTheme.get().themes };
  if (!themes[id]) return;
  themes[id] = { ...themes[id], ...patch };
  $customTheme.setKey("themes", themes);
}

export function updateThemeSeed(id: string, seed: PaletteRef) {
  updateTheme(id, { seed });
}

export function updateThemeToken(id: string, token: string, ref: PaletteRef | null) {
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const overrides = { ...theme.tokenOverrides };
  if (!ref) delete overrides[token];
  else overrides[token] = ref;
  themes[id] = { ...theme, tokenOverrides: overrides };
  $customTheme.setKey("themes", themes);
}

export function updateBrand(id: string, brand: AccentPair) {
  updateTheme(id, { brand });
}

export function updateSectionAccent(
  id: string,
  section: string,
  pair: AccentPair | null
) {
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const sectionAccents = { ...(theme.sectionAccents || {}) };
  if (!pair) delete sectionAccents[section as NavSection];
  else sectionAccents[section as NavSection] = pair;
  themes[id] = { ...theme, sectionAccents };
  $customTheme.setKey("themes", themes);
}

export function updateStatusAccent(id: string, role: StatusRole, color: string) {
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  themes[id] = {
    ...theme,
    statusAccents: { ...(theme.statusAccents || {}), [role]: color },
  };
  $customTheme.setKey("themes", themes);
}

export function updatePageAccent(id: string, page: string, triple: AccentTriple | null) {
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  const pageAccents = { ...(theme.pageAccents || {}) };
  if (!triple) delete pageAccents[page];
  else pageAccents[page] = triple;
  themes[id] = { ...theme, pageAccents };
  $customTheme.setKey("themes", themes);
}

export function updateGlobalAccent(id: string, triple: AccentTriple | null) {
  const themes = { ...$customTheme.get().themes };
  const theme = themes[id];
  if (!theme) return;
  themes[id] = { ...theme, globalAccent: triple || undefined };
  $customTheme.setKey("themes", themes);
}

export function createTheme(name?: string): string {
  const id = genId();
  const themes = { ...$customTheme.get().themes };
  themes[id] = makeTheme(id, name || "New Theme", "light", {
    color: "violet",
    shade: 600,
  });
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("activeThemeId", id);
  return id;
}

export function duplicateTheme(id: string): string | null {
  const src = $customTheme.get().themes[id];
  if (!src) return null;
  const newId = genId();
  const themes = { ...$customTheme.get().themes };
  themes[newId] = { ...structuredClone(src), id: newId, name: `${src.name} copy` };
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("activeThemeId", newId);
  return newId;
}

export function deleteTheme(id: string) {
  if (PRESET_THEMES[id]) return; // never delete built-in presets
  const state = $customTheme.get();
  const themes = { ...state.themes };
  delete themes[id];
  const map = { ...state.pageThemeMap };
  for (const k of Object.keys(map)) if (map[k] === id) delete map[k];
  $customTheme.setKey("themes", themes);
  $customTheme.setKey("pageThemeMap", map);
  if (state.activeThemeId === id) $customTheme.setKey("activeThemeId", "default");
}

export function renameTheme(id: string, name: string) {
  updateTheme(id, { name });
}

export function exportTheme(id: string): string {
  const theme = $customTheme.get().themes[id];
  return theme ? JSON.stringify(theme, null, 2) : "";
}

export function importTheme(json: string): string | null {
  try {
    const parsed = JSON.parse(json) as CustomTheme;
    if (!parsed || !parsed.seed) return null;
    const id = genId();
    const themes = { ...$customTheme.get().themes };
    themes[id] = {
      ...parsed,
      id,
      name: parsed.name ? `${parsed.name} (imported)` : "Imported theme",
      tokenOverrides: parsed.tokenOverrides || {},
      brand: parsed.brand,
      sectionAccents: parsed.sectionAccents || {},
      statusAccents: parsed.statusAccents || {},
      pageAccents: parsed.pageAccents || {},
      globalAccent: parsed.globalAccent,
    };
    $customTheme.setKey("themes", themes);
    $customTheme.setKey("activeThemeId", id);
    return id;
  } catch {
    return null;
  }
}

export function resetThemes() {
  $customTheme.setKey("themes", PRESET_THEMES);
  $customTheme.setKey("activeThemeId", "default");
  $customTheme.setKey("mode", "simple");
  $customTheme.setKey("pageThemeMap", {});
}

// The untouched "default" preset should look identical to the shipped
// globals.css, so we treat it as a no-op (no CSS-var overrides). This keeps
// the default experience flash-free and byte-for-byte unchanged.
export function isPristineDefault(theme: CustomTheme): boolean {
  return (
    theme.id === "default" &&
    (!theme.tokenOverrides || Object.keys(theme.tokenOverrides).length === 0)
  );
}

// Compiled CSS for a theme; empty string means "use globals.css as-is".
export function compileThemeCss(theme: CustomTheme): string {
  if (isPristineDefault(theme)) return "";
  try {
    return buildThemeCss(theme);
  } catch {
    return "";
  }
}

// Persist the active (global) theme CSS so the blocking <head> script can
// apply it before first paint on the next load, just like the dark-mode class.
function persistActiveCss() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ACTIVE_CSS_KEY,
      JSON.stringify(compileThemeCss(getActiveTheme()))
    );
  } catch {
    /* ignore quota / serialization errors */
  }
}

if (typeof window !== "undefined") {
  persistActiveCss();
  $customTheme.listen(() => persistActiveCss());
}
