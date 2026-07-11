// Tailwind palette utilities for the Theme Customization page.
//
// Two goals:
//  1. Provide a static lookup of literal Tailwind class strings per palette
//     color so the JIT scanner never purges dynamically-selected accents.
//  2. Provide hex -> HSL conversion of Tailwind's default palette so the
//     chosen palette colors can be fed into the existing shadcn CSS variables
//     without editing any shadcn component.

import { tinycolor } from "@ctrl/tinycolor";

// Default Tailwind v3/v4 palette (hex). Subset of shades most useful for theming.
export const TAILWIND_HEX = {
  slate: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a", 950: "#020617" },
  gray: { 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827", 950: "#030712" },
  zinc: { 50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8", 400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46", 800: "#27272a", 900: "#18181b", 950: "#09090b" },
  neutral: { 50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4", 400: "#a3a3a3", 500: "#737373", 600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717", 950: "#0a0a0a" },
  stone: { 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917", 950: "#0c0a09" },
  red: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d", 950: "#450a0a" },
  orange: { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12", 950: "#431407" },
  amber: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f", 950: "#451a03" },
  yellow: { 50: "#fefce8", 100: "#fef9c3", 200: "#fef08a", 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207", 800: "#854d0e", 900: "#713f12", 950: "#422006" },
  lime: { 50: "#f7fee7", 100: "#ecfccb", 200: "#d9f99d", 300: "#bef264", 400: "#a3e635", 500: "#84cc16", 600: "#65a30d", 700: "#4d7c0f", 800: "#3f6212", 900: "#365314", 950: "#1a2e05" },
  green: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#052e16" },
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22" },
  teal: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a", 950: "#042f2e" },
  cyan: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63", 950: "#083344" },
  sky: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e", 950: "#082f49" },
  blue: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a", 950: "#172554" },
  indigo: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b" },
  violet: { 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065" },
  purple: { 50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce", 800: "#6b21a8", 900: "#581c87", 950: "#3b0764" },
  fuchsia: { 50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf", 800: "#86198f", 900: "#701a75", 950: "#4a044e" },
  pink: { 50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d", 800: "#9d174d", 900: "#831843", 950: "#500724" },
  rose: { 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337", 950: "#4c0519" },
};

// --- Color math -------------------------------------------------------------

export function hexToRgb(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Returns { h, s, l } (h in degrees, s/l in percent) from a hex color.
export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let { r, g, b } = rgb;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Returns an HSL triplet string in the "H S% L%" form used by shadcn vars.
export function hexToHslString(hex) {
  const v = hexToHsl(hex);
  return v ? `${v.h} ${v.s}% ${v.l}%` : null;
}

// HSV ↔ hex conversions (used by Fluent ColorPicker).
// Fluent HSV: h 0-360, s/v 0-100. tinycolor toHsv: s/v 0-1.
export function hsvToHex(h, s, v) {
  return tinycolor({ h, s, v }).toHexString();
}
export function hexToHsv(hex) {
  const c = tinycolor(hex).toHsv();
  return { h: c.h, s: Math.round(c.s * 100), v: Math.round(c.v * 100) };
}

// Relative luminance for WCAG contrast.
function relLuminance({ r, g, b }) {
  const chan = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Given a background hex, returns a readable foreground hex (near-white/near-black)
// using WCAG contrast ratio (≥4.5:1 for AA compliance).
export function readableForeground(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const darkContrast = contrastRatio(hex, "#0a0a0a");
  const lightContrast = contrastRatio(hex, "#fafafa");
  // Pick whichever foreground has higher contrast; fall back to dark for equal.
  return darkContrast >= lightContrast ? "#0a0a0a" : "#fafafa";
}

// Accepts EITHER a PaletteRef { hex } or legacy (color, shade) lookup.
export function paletteHex(colorOrRef, shade) {
  if (colorOrRef && typeof colorOrRef === "object" && colorOrRef.hex) return colorOrRef.hex;
  const color = typeof colorOrRef === "string" ? colorOrRef : "slate";
  const s = shade || 500;
  const c = TAILWIND_HEX[color];
  if (!c) return "#808080";
  return c[s] || c[500];
}

// Accepts EITHER a PaletteRef { hex } or legacy (color, shade) lookup.
export function paletteHslString(colorOrRef, shade) {
  const hex = paletteHex(colorOrRef, shade);
  return hex ? hexToHslString(hex) : null;
}

// --- Theme derivation -------------------------------------------------------

// shadcn tokens the customizer exposes for advanced editing. Foregrounds are
// auto-derived from their background for accessibility, so are not listed here.
export const EDITABLE_TOKENS = [
  "primary",
  "background",
  "card",
  "secondary",
  "muted",
  "accent",
  "border",
  "ring",
  "sidebar",
  "sidebarAccent",
];

// Maps a light-mode shade to its dark-mode counterpart (kept for backward compat).
const SHADE_FLIP = {
  50: 950, 100: 900, 200: 800, 300: 700, 400: 600,
  500: 500, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50,
};
function flipShade(shade) {
  return SHADE_FLIP[shade] ?? shade;
}

// Neutral hue derived from a seed so surfaces feel cohesive with the accent.
function neutralFor(color) {
  // Warmer accents pair with stone/neutral, cool accents with slate/zinc.
  const warm = ["red", "orange", "amber", "yellow", "lime", "rose", "pink"];
  return warm.includes(color) ? "stone" : "slate";
}

// Neutral hue derived from a hex seed via hue analysis.
function neutralForHex(hex) {
  const hsl = hexToHsl(hex);
  if (!hsl) return "slate";
  const h = hsl.h;
  return (h <= 70 || h >= 340) ? "stone" : "slate";
}

// Darkens a hex color by reducing lightness. Returns a new hex string.
function darkenHex(hex, amount) {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const newL = Math.max(0, hsl.l - amount);
  return tinycolor({ h: hsl.h, s: hsl.s, l: newL }).toHexString();
}

// Lightens a hex color by increasing lightness. Returns a new hex string.
function lightenHex(hex, amount) {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const newL = Math.min(100, hsl.l + amount);
  return tinycolor({ h: hsl.h, s: hsl.s, l: newL }).toHexString();
}

// Derives a full set of shadcn CSS-var values (both light and dark) from a
// theme definition. `overrides` maps token name -> { hex } or legacy { color, shade }.
export function buildThemeVars(theme) {
  const seed = theme.seed || { hex: "#7c3aed" };
  const overrides = theme.tokenOverrides || {};
  const n = neutralForHex(seed.hex || "#7c3aed");

    // Resolve seed to a hex string for downstream use.
    const seedHex = seed.hex || "#7c3aed";
    const seedHsl = hexToHsl(seedHex) || { h: 220, s: 60, l: 50 };

    // Light-mode surfaces get a subtle, theme-specific tint of the seed hue
    // (instead of pure white) so every theme reads differently in light mode,
    // mirroring how dark mode shifts per theme.
    const tintS = Math.min(24, Math.round((seedHsl.s || 0) * 0.35)) || 12;
    const surface = (l) => tinycolor({ h: seedHsl.h, s: tintS, l }).toHexString();

    // Dark-mode surfaces: low lightness with a subtle seed-hue tint.
    // Unlike light-mode surfaces (which start near-white and subtract),
    // dark surfaces need to be natively dark for proper contrast.
    const darkSurface = (l) => tinycolor({ h: seedHsl.h, s: tintS, l }).toHexString();

    // Raw background hexes (mode-independent) for the accent-var builder. Declared
    // in this outer scope so the returned object can expose them (previously they
    // lived inside `build` and triggered a ReferenceError on access).
    const bgLightHex = surface(96);
    const bgDarkHex = darkSurface(14);

    const build = (mode) => {
    const dark = mode === "dark";

    // Read a token value: override (PaletteRef or legacy) or fallback hex.
    const pick = (token, fallbackHex, darkFallbackHex) => {
      const ov = overrides[token];
      if (ov) {
        // PaletteRef with .hex takes priority
        if (ov.hex) return ov.hex;
        // Legacy { color, shade } — should not be reached; safe fallback
        return ov.hex || "#808080";
      }
      // No override: use the explicit fallback hex (no shade flipping).
      // Dark mode gets a reasonable variant derived from the light hex.
      if (dark) return darkFallbackHex;
      return fallbackHex;
    };

    const cardHex = surface(98);
    const cardDarkHex = darkSurface(10);
    const secondaryHex = surface(93);
    const secondaryDarkHex = darkSurface(8);
    const mutedHex = surface(93);
    const mutedDarkHex = darkSurface(8);
    const primaryHex = seedHex;
    const primaryDarkHex = lightenHex(primaryHex, 8);
    const accentHex = lightenHex(seedHex, 30);
    const accentDarkHex = lightenHex(accentHex, 5);
    const borderHex = surface(85);
    const borderDarkHex = darkSurface(20);
    const ringHex = primaryHex;
    const ringDarkHex = primaryDarkHex;
    const sidebarHex = surface(96);
    const sidebarDarkHex = darkSurface(14);
    const sidebarAccentHex = lightenHex(seedHex, 30);
    const sidebarAccentDarkHex = lightenHex(sidebarAccentHex, 5);

    const bg = pick("background", bgLightHex, bgDarkHex);
    const card = pick("card", cardHex, cardDarkHex);
    const secondary = pick("secondary", secondaryHex, secondaryDarkHex);
    const muted = pick("muted", mutedHex, mutedDarkHex);
    const accent = pick("accent", accentHex, accentDarkHex);
    const primary = pick("primary", primaryHex, primaryDarkHex);
    const border = pick("border", borderHex, borderDarkHex);
    const ring = pick("ring", ringHex, ringDarkHex);
    const sidebar = pick("sidebar", sidebarHex, sidebarDarkHex);
    const sidebarAccent = pick("sidebarAccent", sidebarAccentHex, sidebarAccentDarkHex);
    // Destructive follows the themeable "danger" status role (single source).
    const destructiveHex = theme.statusAccents?.danger || "#ef4444";
    const destructiveDarkHex = theme.statusAccents?.danger || "#ef4444";
    const destructive = dark ? destructiveDarkHex : destructiveHex;

    const toHsl = (hex) => hexToHslString(hex);
    const fg = (hex) => hexToHslString(readableForeground(hex));

    const mutedFgHex = paletteHex(n, dark ? 400 : 700);

    const vars = {
      "--background": toHsl(bg),
      "--foreground": fg(bg),
      "--card": toHsl(card),
      "--card-foreground": fg(card),
      "--popover": toHsl(card),
      "--popover-foreground": fg(card),
      "--primary": toHsl(primary),
      "--primary-foreground": fg(primary),
      "--secondary": toHsl(secondary),
      "--secondary-foreground": fg(secondary),
      "--muted": toHsl(muted),
      "--muted-foreground": hexToHslString(mutedFgHex),
      "--accent": toHsl(accent),
      "--accent-foreground": fg(accent),
      "--destructive": toHsl(destructive),
      "--destructive-foreground": fg(destructive),
      "--border": toHsl(border),
      "--input": toHsl(border),
      "--ring": toHsl(ring),
      "--sidebar-background": toHsl(sidebar),
      "--sidebar-foreground": fg(sidebar),
      "--sidebar-primary": toHsl(primary),
      "--sidebar-primary-foreground": fg(primary),
      "--sidebar-accent": toHsl(sidebarAccent),
      "--sidebar-accent-foreground": fg(sidebarAccent),
      "--sidebar-border": toHsl(border),
      "--sidebar-ring": toHsl(ring),
    };

    // Chart palette: cohesive hues rotated around the seed color.
    const seedHsl = hexToHsl(seedHex) || { h: 220 };
    const offsets = [0, 40, -40, 80, -80];
    const cs = dark ? 70 : 65;
    const cl = dark ? 58 : 48;
    offsets.forEach((o, i) => {
      vars[`--chart-${i + 1}`] = `${((seedHsl.h + o) % 360 + 360) % 360} ${cs}% ${cl}%`;
    });

    return vars;
  };

  // Also return the raw background hex values for use by accent var builders
  // (so -foreground can contrast with the actual page background).
  const lightVars = build("light");
  const darkVars = build("dark");
  return { light: lightVars, dark: darkVars, bgLightHex, bgDarkHex };
}

function varsToCss(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

// prefers-contrast boosts, themed from the neutral hue, so the accessibility
// behavior of globals.css isn't lost when a custom theme overrides the vars.
function contrastCss(theme) {
  const n = neutralForHex(theme.seed?.hex || "#7c3aed");
  const light = `--muted-foreground: ${paletteHslString(n, 700)}; --border: ${paletteHslString(n, 400)};`;
  const dark = `--muted-foreground: ${paletteHslString(n, 300)}; --border: ${paletteHslString(n, 500)};`;
  return `@media (prefers-contrast: more) { :root { ${light} } .dark { ${dark} } }`;
}

// Builds the full <style> text for a theme (both :root and .dark blocks).
export function buildThemeCss(theme) {
  const { light, dark } = buildThemeVars(theme);
  return `:root { ${varsToCss(light)} }\n.dark { ${varsToCss(dark)} }\n${contrastCss(theme)}`;
}
