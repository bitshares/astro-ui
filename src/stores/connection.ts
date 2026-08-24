import { atom } from "nanostores";
import Apis from "@/bts/ws/ApiInstances";

export type ConnectionStatus = "open" | "closed" | "error" | "reconnect" | "unknown";

export const $connectionStatus = atom<ConnectionStatus>("unknown");

let initialized = false;

export function initConnectionStatus() {
  if (initialized) return;
  initialized = true;
  try {
    Apis.setRpcConnectionStatusCallback((status: ConnectionStatus) => {
      $connectionStatus.set(status);
    });
    // also listen to online/offline
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => $connectionStatus.set("open"));
      window.addEventListener("offline", () => $connectionStatus.set("closed"));
    }
  } catch (e) {
    console.log("initConnectionStatus error", e);
  }
}
