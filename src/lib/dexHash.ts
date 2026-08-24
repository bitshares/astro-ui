import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Create a truncated sha256 hash of order book JSON salted with timestamp.
 * Truncate to 12 hex chars (6 bytes) for compact display.
 */
export function hashOrderBook(book: any, salt: number | string): string {
  try {
    const payload = JSON.stringify(book) + "|" + String(salt);
    const bytes = new TextEncoder().encode(payload);
    const digest = sha256(bytes);
    const hex = Array.from(digest)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // truncate to 12 chars as requested to keep simple
    return hex.slice(0, 12);
  } catch {
    return "—";
  }
}

export function filterNodeDomain(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    // Use URL parser if possible
    const u = new URL(url);
    return u.hostname || url;
  } catch {
    // fallback simple strip
    return url
      .replace(/^wss?:\/\//, "")
      .replace(/^ws:\/\//, "")
      .replace(/\/ws\/?$/, "")
      .replace(/\/$/, "")
      .split("/")[0];
  }
}
