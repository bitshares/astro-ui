"use client";
import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  $customTheme,
  $currentPage,
  getThemeForPage,
  compileThemeCss,
  resolvePageAccent,
  resolveStatusAll,
} from "@/stores/customTheme.ts";
import { buildAccentCss } from "@/lib/accentVars.js";

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
    document.head.appendChild(el);
  }
  el.textContent = css || "";
}

export default function CustomThemeStyle() {
  const state = useStore($customTheme);
  const page = useStore($currentPage);

  useEffect(() => {
    const theme = getThemeForPage(page);
    const tokenCss = compileThemeCss(theme);
    let accentCss = "";
    try {
      accentCss = buildAccentCss(resolvePageAccent(theme, page), resolveStatusAll(theme));
    } catch (e) {
      console.warn("Failed to build accent css", e);
    }
    applyCss(`${tokenCss}\n${accentCss}`);
  }, [state, page]);

  return null;
}
