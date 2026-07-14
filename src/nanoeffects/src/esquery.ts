/**
 * Shared helper for querying the public BitShares Elasticsearch endpoint.
 *
 * Based on the explorer's `getAssetHolders` pattern (fetch POST to
 * `es.bitshares.dev`).  We deliberately do **not** inherit the explorer's
 * zod/validation stack — just parse the raw JSON and let each consumer
 * shape it.
 *
 * @module esquery
 */

/**
 * Base URL for the public BitShares Elasticsearch proxy.
 *
 * All queries are sent as `POST /${index}/_search` against this origin.
 * @type {string}
 */
const ES_BASE = "https://es.bitshares.dev";

/**
 * Execute a raw Elasticsearch query against the public BitShares ES proxy.
 *
 * @param {string} index  Index name to query (e.g. `"bitshares-*"` or
 *   `"objects-balance"`).
 * @param {object} body   Elasticsearch query DSL body (will be serialised
 *   as JSON).
 * @returns {Promise<any>}  Parsed JSON response from Elasticsearch.
 * @throws {Error} If the HTTP response is not OK (non-2xx status).
 */
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
