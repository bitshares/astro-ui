// Semantic ACCENT layer — the deep, fully-themeable color system for page
// components (icons, cards, highlights, gradients, glows, focus rings).
//
// Colors are delivered through CSS custom properties so any opacity / shadow /
// gradient can reference them uniformly:
//   --accent-1 / --accent-1-fg   page PRIMARY   (+ legible text variant)
//   --accent-2 / --accent-2-fg   page SECONDARY
//   --accent-3 / --accent-3-fg   page TERTIARY
//   --accent-success/-danger/-warning/-info (+ -fg)  semantic status roles
//
// The theme system stores palette color NAMES; CustomThemeStyle converts the
// active page's roles to HSL and injects these vars (light + dark). Components
// use the AV class strings below (or inline `[hsl(var(--accent-1)/X)]`), which
// are LITERAL so Tailwind's JIT emits them.

import { paletteHex, hexToHslString } from "@/lib/tailwindPalette.js";

// The set of role -> CSS var base names.
export const ACCENT_ROLE_VARS = {
  primary: "--accent-1",
  secondary: "--accent-2",
  tertiary: "--accent-3",
  success: "--accent-success",
  danger: "--accent-danger",
  warning: "--accent-warning",
  info: "--accent-info",
};

// ---------------------------------------------------------------------------
// CSS variable value builder.
// accent  = { primary, secondary, tertiary }  (palette color names)
// status  = { success, danger, warning, info } (palette color names)
// Returns { light: {var:value,...}, dark: {...} }.
// ---------------------------------------------------------------------------
function roleVars(baseVar, color, dark) {
  return {
    [baseVar]: hexToHslString(paletteHex(color, 500)),
    [`${baseVar}-fg`]: hexToHslString(paletteHex(color, dark ? 300 : 700)),
    [`${baseVar}-foreground`]: hexToHslString(paletteHex(color, dark ? 950 : 50)),
  };
}

export function buildAccentVars(accent, status) {
  const a = accent || {};
  const s = status || {};
  const primary = a.primary || "indigo";
  const secondary = a.secondary || "violet";
  const tertiary = a.tertiary || secondary;

  const build = (dark) => ({
    ...roleVars("--accent-1", primary, dark),
    ...roleVars("--accent-2", secondary, dark),
    ...roleVars("--accent-3", tertiary, dark),
    ...roleVars("--accent-success", s.success || "emerald", dark),
    ...roleVars("--accent-danger", s.danger || "red", dark),
    ...roleVars("--accent-warning", s.warning || "amber", dark),
    ...roleVars("--accent-info", s.info || "sky", dark),
  });

  return { light: build(false), dark: build(true) };
}

function varsToCss(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

// Full <style> text for a page's accent roles (both :root and .dark).
export function buildAccentCss(accent, status) {
  const { light, dark } = buildAccentVars(accent, status);
  return `:root { ${varsToCss(light)} }\n.dark { ${varsToCss(dark)} }`;
}
