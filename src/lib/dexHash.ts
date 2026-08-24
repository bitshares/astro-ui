/**
 * Node URL display helper for the subscription footer card.
 * Strips protocol (wss://) and path suffix (/ws) leaving just the domain.
 */
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
