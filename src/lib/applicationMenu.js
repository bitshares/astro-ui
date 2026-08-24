import { app, Menu } from "electron";

/**
 * For configuring the electron window menu.
 * Labels may be overridden with localized strings sent from the renderer
 * (keys match the `menu_*` entries in each locale's PageTitles.json).
 */
export function initApplicationMenu(mainWindow, labels = {}) {
  const template = [
    {
      label: labels.menu_view || "View",
      submenu: [
        {
          label: labels.menu_send_to_tray || "Send to tray",
          click() {
            mainWindow.minimize();
          },
        },
        { label: labels.menu_reload || "Reload", role: "reload" },
        { label: labels.menu_dev_tools || "Dev tools", role: "toggleDevTools" },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
