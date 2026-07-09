// Tailwind palette utilities for the Theme Customization page.
//
// Two goals:
//  1. Provide a static lookup of literal Tailwind class strings per palette
//     color so the JIT scanner never purges dynamically-selected accents.
//  2. Provide hex -> HSL conversion of Tailwind's default palette so the
//     chosen palette colors can be fed into the existing shadcn CSS variables
//     without editing any shadcn component.

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

// Colors offered as nav accents in the customizer. Order matters for the UI.
export const ACCENT_COLORS = [
  "slate", "gray", "zinc", "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
  "purple", "fuchsia", "pink", "rose",
];

export const ACCENT_SHADES = [400, 500, 600, 700];

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

// Given a background hex, returns a readable foreground hex (near-white/near-black).
export function readableForeground(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  return relLuminance(rgb) > 0.4 ? "#0a0a0a" : "#fafafa";
}

export function paletteHex(color, shade) {
  const c = TAILWIND_HEX[color];
  if (!c) return null;
  return c[shade] || c[500];
}

export function paletteHslString(color, shade) {
  const hex = paletteHex(color, shade);
  return hex ? hexToHslString(hex) : null;
}

// --- Theme derivation -------------------------------------------------------

// shadcn tokens the customizer exposes for advanced editing. Foregrounds are
// auto-derived from their background for accessibility, so are not listed here.
// Users edit the LIGHT value; the dark value is auto-derived (see SHADE_FLIP).
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

// Maps a light-mode shade to its dark-mode counterpart, so a user only edits
// the light palette and the dark mode is auto-derived with sane contrast.
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

// Derives a full set of shadcn CSS-var values (both light and dark) from a
// theme definition. `overrides` maps token name -> { color, shade }.
export function buildThemeVars(theme) {
  const seed = theme.seed || { color: "violet", shade: 600 };
  const overrides = theme.tokenOverrides || {};
  const n = neutralFor(seed.color);

  const build = (mode) => {
    const dark = mode === "dark";
    // Overrides are authored in the light palette; the dark shade is flipped.
    const pick = (token, color, lightShade, darkShade) => {
      const ov = overrides[token];
      if (ov) return paletteHex(ov.color, dark ? flipShade(ov.shade) : ov.shade);
      return paletteHex(color, dark ? darkShade : lightShade);
    };

    const bg = pick("background", n, 50, 900);
    const card = pick("card", n, 50, 800);
    const secondary = pick("secondary", n, 100, 800);
    const muted = pick("muted", n, 100, 800);
    const accent = pick("accent", seed.color, 100, 800);
    const primary = pick("primary", seed.color, seed.shade, 400);
    const border = pick("border", n, 200, 700);
    const ring = pick("ring", seed.color, seed.shade, 400);
    const sidebar = pick("sidebar", n, 50, 900);
    const sidebarAccent = pick("sidebarAccent", seed.color, 100, 800);
    // Destructive follows the themeable "danger" status role (single source).
    const dangerColor = theme.statusAccents?.danger || "red";
    const destructive = paletteHex(dangerColor, dark ? 500 : 600);

    const toHsl = (hex) => hexToHslString(hex);
    const fg = (hex) => hexToHslString(readableForeground(hex));

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
      "--muted-foreground": hexToHslString(paletteHex(n, dark ? 400 : 500)),
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
    const seedHsl = hexToHsl(paletteHex(seed.color, seed.shade)) || { h: 220 };
    const offsets = [0, 40, -40, 80, -80];
    const cs = dark ? 70 : 65;
    const cl = dark ? 58 : 48;
    offsets.forEach((o, i) => {
      vars[`--chart-${i + 1}`] = `${((seedHsl.h + o) % 360 + 360) % 360} ${cs}% ${cl}%`;
    });

    return vars;
  };

  return { light: build("light"), dark: build("dark") };
}

function varsToCss(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

// prefers-contrast boosts, themed from the neutral hue, so the accessibility
// behavior of globals.css isn't lost when a custom theme overrides the vars.
function contrastCss(theme) {
  const n = neutralFor((theme.seed || { color: "violet" }).color);
  const light = `--muted-foreground: ${paletteHslString(n, 600)}; --border: ${paletteHslString(n, 400)};`;
  const dark = `--muted-foreground: ${paletteHslString(n, 300)}; --border: ${paletteHslString(n, 500)};`;
  return `@media (prefers-contrast: more) { :root { ${light} } .dark { ${dark} } }`;
}

// Builds the full <style> text for a theme (both :root and .dark blocks).
export function buildThemeCss(theme) {
  const { light, dark } = buildThemeVars(theme);
  return `:root { ${varsToCss(light)} }\n.dark { ${varsToCss(dark)} }\n${contrastCss(theme)}`;
}
