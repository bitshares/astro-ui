"use client";
import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  $customTheme,
  $draftTheme,
  $currentPage,
  getThemeForPage,
  compileThemeCss,
  resolvePageAccent,
  resolveStatusAll,
} from "@/stores/customTheme.ts";
import { buildAccentCss } from "@/lib/accentVars.js";
import { buildThemeVars } from "@/lib/tailwindPalette.js";
import { THEMABLE_PAGES } from "@/lib/pages.js";

const STYLE_ID = "custom-theme-vars";

// Applies the resolved (per-page or global) theme + accent roles to the injected
// <style>. The blocking <head> script already applied the *global* shadcn tokens
// before paint; this component handles live edits, dropdown switches, per-page
// overrides and the per-page accent variables used by page components.
function applyCss(css) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
  }
  el.textContent = css || "";
  // Append last so this element is always the final node in <head>, guaranteeing
  // it wins the cascade over the compiled Layout.css :root --accent-* defaults
  // (which would otherwise turn per-page accents purple on a full reload).
  document.head.appendChild(el);
}

export default function CustomThemeStyle() {
  const state = useStore($customTheme);
  const draftTheme = useStore($draftTheme);
  const page = useStore($currentPage);

  useEffect(() => {
    // On the theme customizer page, use the draft for live preview when active
    const isCustomizer = page === "theme_customizer";
    const theme = isCustomizer && draftTheme ? draftTheme : getThemeForPage(page);
    const tokenCss = compileThemeCss(theme);
    // Get background hex values for accent foreground contrast calculation
    let bgLightHex = "#f8fafc";
    let bgDarkHex = "#0f172a";
    try {
      const tv = buildThemeVars(theme);
      if (tv.bgLightHex) bgLightHex = tv.bgLightHex;
      if (tv.bgDarkHex) bgDarkHex = tv.bgDarkHex;
    } catch {}
    let accentCss = "";
    try {
      accentCss = buildAccentCss(resolvePageAccent(theme, page), resolveStatusAll(theme), null, null, bgLightHex, bgDarkHex);
    } catch (e) {
      console.warn("Failed to build accent css", e);
    }
    applyCss(`${tokenCss}\n${accentCss}`);
  }, [state, draftTheme, page]);

  return null;
}
