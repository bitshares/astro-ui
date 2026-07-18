import { persistentAtom } from "@nanostores/persistent";

export type Theme = "light" | "dark" | "system";

function isTheme(v: string): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

const THEME_KEY = "bts-ui-theme";

function migrateLegacyTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const legacy = localStorage.getItem("theme");
  if (legacy && isTheme(legacy)) return legacy;
  return "system";
}

export const $theme = persistentAtom<Theme>(THEME_KEY, "system", {
  encode: JSON.stringify,
  decode: (str) => {
    try {
      return JSON.parse(str) as Theme;
    } catch {
      return isTheme(str) ? str : "system";
    }
  },
});

if (typeof localStorage !== "undefined" && !localStorage.getItem(THEME_KEY)) {
  const migrated = migrateLegacyTheme();
  if (migrated !== "system") $theme.set(migrated);
}

export function setTheme(theme: Theme) {
  $theme.set(theme);
}
