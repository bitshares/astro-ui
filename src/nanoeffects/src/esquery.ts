// Shared helper for querying the public BitShares Elasticsearch endpoint.
// Based on the explorer `getAssetHolders` pattern (fetch POST to es.bitshares.dev).
// We deliberately do NOT inherit the explorer's zod/validation stack — just
// parse the raw JSON and let each consumer shape it.

const ES_BASE = "https://es.bitshares.dev";

async function esSearch(index: string, body: object): Promise<any> {
  const resp = await fetch(`${ES_BASE}/${index}/_search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Elasticsearch query failed (${resp.status})`);
  }
  return resp.json();
}

export { esSearch, ES_BASE };
