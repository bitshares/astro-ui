// Inline style accent system — replaces accentClasses.js for hex-first themes.
// All functions accept hex color strings and return CSS property objects
// suitable for use with React's `style` prop.

import { hexToRgb, hexToHsl, hexToHslString } from "@/lib/tailwindPalette.js";

function hexToRGBA(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(128,128,128,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// Hue-preserving, readable text color for an accent that sits on a low-alpha
// accent tint (light in light mode, dark in dark mode). A fixed readable
// lightness per mode keeps contrast high while preserving the accent identity
// (unlike readableForeground, which collapses to pure black/white and loses
// the hue — invisible on a same-hue tinted chip).
function readableAccent(hex, isDark) {
  const hsl = hexToHsl(hex);
  if (!hsl) return isDark ? "0 0% 96%" : "0 0% 12%";
  const s = Math.min(100, Math.max(48, hsl.s));
  const l = isDark ? 70 : 34;
  return `${hsl.h} ${s}% ${l}%`;
}

// --- Navigation (single color) ---------------------------------------------
export function getNavAccentStyles(hex, isDark = false) {
  const fg = `hsl(${readableAccent(hex, isDark)})`;
  return {
    color: { color: fg },
    bg: { background: hexToRGBA(hex, 0.15) },
    border: { borderColor: hexToRGBA(hex, 0.3) },
    chip: { background: hexToRGBA(hex, 0.3), color: fg, border: `1px solid ${hexToRGBA(hex, 0.5)}` },
    chipBg: { background: hexToRGBA(hex, 0.15) },
    dot: { background: hex },
    bar: { background: `linear-gradient(to right, ${hex}, ${hex})` },
  };
}

// --- Home item cards (primary + secondary) ---------------------------------
export function itemAccentStyles(primary, secondary, isDark = false) {
  const fg = `hsl(${readableAccent(primary, isDark)})`;
  return {
    bar: { background: `linear-gradient(to right, ${primary}, ${secondary || primary})` },
    chip: { background: hexToRGBA(primary, 0.3), color: fg, border: `1px solid ${hexToRGBA(primary, 0.5)}` },
    glow: { background: hexToRGBA(primary, 0.3) },
    text: { color: fg },
  };
}

// --- Home sections (primary + secondary) -----------------------------------
export function sectionAccentStyles(primary, secondary, isDark = false) {
  const fg = `hsl(${readableAccent(primary, isDark)})`;
  return {
    border: { borderColor: hexToRGBA(primary, 0.2) },
    bg: { background: `linear-gradient(135deg, ${hexToRGBA(primary, 0.15)}, ${hexToRGBA(secondary || primary, 0.1)})` },
    iconBg: { background: hexToRGBA(primary, 0.15) },
    iconBorder: { border: `1px solid ${hexToRGBA(primary, 0.25)}` },
    iconText: { color: fg },
    blobA: { background: hexToRGBA(primary, 0.3) },
    blobB: { background: hexToRGBA(secondary || primary, 0.2) },
    dot: { background: primary },
    underline: { background: `linear-gradient(to right, transparent, ${hexToRGBA(primary, 0.6)}, transparent)` },
  };
}

// --- Brand: hero panel + page-header backdrop (primary + secondary) ---------
export function brandHeroStyles(primary, secondary) {
  return {
    panel: { background: `linear-gradient(135deg, ${hexToRGBA(primary, 0.06)}, rgba(255,255,255,0.04), ${hexToRGBA(secondary || primary, 0.03)})` },
    blobA: { background: hexToRGBA(primary, 0.2) },
    blobB: { background: hexToRGBA(secondary || primary, 0.15) },
  };
}

export function brandBackdropStyles(primary, secondary) {
  return { background: `linear-gradient(to right, ${hexToRGBA(primary, 0.05)}, ${hexToRGBA(secondary || primary, 0.03)})` };
}

// --- Status roles (single color): success / danger / warning / info --------
export function statusAccentStyles(hex, isDark = false) {
  const fg = `hsl(${readableAccent(hex, isDark)})`;
  return {
    text: { color: fg },
    chip: { background: hexToRGBA(hex, 0.3), color: fg, border: `1px solid ${hexToRGBA(hex, 0.5)}` },
    glow: { background: hexToRGBA(hex, 0.3) },
    dot: { background: hex },
    bg: { background: hexToRGBA(hex, 0.15) },
    border: { borderColor: hexToRGBA(hex, 0.2) },
  };
}
