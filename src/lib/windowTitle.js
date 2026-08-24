import { i18n, locale } from "./i18n.js";

function isElectron() {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
}

export function getPagePath() {
  if (typeof window === "undefined") return "/";
  let path = window.location.pathname || "/";
  // Normalize trailing slash before and after stripping .html so
  // "/index.html/" and "/dex.html/" are handled robustly
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  if (path.endsWith(".html")) {
    path = path.slice(0, -".html".length);
  }
  // Normalize index variants (file://index.html -> "/" on launch, but
  // ClientRouter history can push "/index" on back-navigation)
  if (path === "/index" || path === "/index/") return "/";
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  if (path === "/index") return "/";
  return path;
}

export function resolvePageTitle(path) {
  const key = `PageTitles:pages.${path}`;
  if (i18n.exists(key, { lng: locale.get() })) {
    const translated = i18n.t(key, { lng: locale.get() });
    if (translated) return translated;
  }
  if (i18n.exists(key, { lng: "en" })) {
    const english = i18n.t(key, { lng: "en" });
    if (english) return english;
  }
  return typeof document !== "undefined" ? document.title : "";
}

// Push all localized main-process strings: window title, tray tooltip,
// notification title and application menu labels.
export function applyWindowUI() {
  if (typeof window === "undefined") return;

  const title = resolvePageTitle(getPagePath());

  if (title) {
    document.title = title;
    if (isElectron()) {
      window.electron.setWindowTitle(title);
    }
  }

  if (!isElectron()) return;

  const tKey = (key) => {
    const translated = i18n.t(`PageTitles:${key}`, { lng: locale.get() });
    return translated && !translated.startsWith("PageTitles:")
      ? translated
      : null;
  };

  const trayTooltip = tKey("tray");
  if (trayTooltip) {
    window.electron.setTrayTooltip(trayTooltip);
  }

  const notificationTitle = tKey("notification_error");
  if (notificationTitle) {
    window.electron.setNotificationTitle(notificationTitle);
  }

  const menuLabels = {};
  ["menu_view", "menu_send_to_tray", "menu_reload", "menu_dev_tools"].forEach(
    (k) => {
      const v = tKey(k);
      if (v) menuLabels[k] = v;
    }
  );
  if (Object.keys(menuLabels).length) {
    window.electron.setMenuLabels(menuLabels);
  }
}

if (typeof document !== "undefined") {
  // Re-apply after Astro view transitions (client side navigation)
  document.addEventListener("astro:after-swap", applyWindowUI);
}
