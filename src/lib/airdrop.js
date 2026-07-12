import { humanReadableFloat } from "@/lib/common.js";
import { getFullAccountDetails } from "@/nanoeffects/FullAccountDetails.ts";

const ACCOUNT_ID_REGEX = /^1\.2\.\d+$/;

/**
 * Fetch on-chain details for a list of account ids (the "candidate pool")
 * used by the algorithm-based airdrop calculator. Mirrors the reference app's
 * "leaderboard" enrichment, but sourced from user-provided accounts instead of
 * TUSC ticket objects.
 *
 * @param {string[]} accountIDs
 * @param {string} chain "bitshares" | "bitshares_testnet"
 * @param {string} [specificNode]
 * @returns {Promise<Array<{id:string,name:string,ltm:boolean,votes:string[],balances:Array<{asset_id:string,amount:string}>,raw:object}>>}
 */
async function enrichPool(accountIDs, chain, specificNode) {
  const enriched = [];
  const batches = sliceIntoChunks(accountIDs, 20);
  for (const batch of batches) {
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const resp = await getFullAccountDetails(chain, id, specificNode);
          const pair = resp && resp[0];
          let account;
          let extra = {};
          if (Array.isArray(pair)) {
            account = pair[0];
            extra = pair[1] || {};
          } else if (pair && pair.account) {
            account = pair.account;
            extra = pair;
          } else {
            account = pair;
          }
          if (!account || !account.id) return null;

          const balances = (extra.balances || account.balances || []).map(
            (b) => ({
              asset_id: b.asset_type,
              amount: b.balance,
            }),
          );

          const membershipExpiry = account.membership_expiration_date;
          const ltm =
            !!membershipExpiry &&
            new Date(`${membershipExpiry}Z`).getTime() > Date.now();

          return {
            id: account.id,
            name: account.name,
            ltm,
            votes: (account.options && account.options.votes) || [],
            balances,
            raw: account,
          };
        } catch (error) {
          console.log({ enrichPoolError: id, error });
          return null;
        }
      }),
    );
    enriched.push(...results.filter(Boolean));
  }
  return enriched;
}

/**
 * Turn enriched accounts into a weighted "leaderboard" where each account owns
 * a contiguous [from, to] range proportional to its weight. The signature-derived
 * lottery algorithms draw a number in this range to select a winner.
 *
 * @param {Array} accounts result of enrichPool
 * @param {string|null} weightAssetId if set, weight = balance of this asset
 * @returns {Array<{id:string,name:string,amount:number,range:{from:number,to:number},votes:string[],balances:Array,ltm:boolean}>}
 */
function buildLeaderboard(accounts, weightAssetId = null) {
  const leaderboard = [];
  let from = 0;
  for (const acc of accounts) {
    let weight = 1;
    if (weightAssetId) {
      const bal = acc.balances.find((b) => b.asset_id === weightAssetId);
      weight = bal ? Number(bal.amount) : 0;
      if (!Number.isFinite(weight) || weight < 0) weight = 0;
    }
    const w = Math.max(weight, 0);
    leaderboard.push({
      id: acc.id,
      name: acc.name,
      amount: w,
      range: { from: parseInt(from, 10), to: parseInt(from + w, 10) },
      votes: acc.votes,
      balances: acc.balances,
      ltm: acc.ltm,
    });
    from += w;
  }
  return leaderboard;
}

/**
 * Build a leaderboard from pre-computed entries (used by the non-manual pool
 * sources: tickets, call orders, asset holders). Each entry supplies its own
 * weight directly.
 *
 * @param {Array<{id:string,name?:string,weight:number,ltm?:boolean,votes?:string[],balances?:Array}>} entries
 * @returns {Array}
 */
function buildLeaderboardFromEntries(entries) {
  const leaderboard = [];
  let from = 0;
  for (const e of entries) {
    const w = Math.max(Number(e.weight) || 0, 0);
    leaderboard.push({
      id: e.id,
      name: e.name || e.id,
      amount: w,
      range: { from: parseInt(from, 10), to: parseInt(from + w, 10) },
      votes: e.votes || [],
      balances: e.balances || [],
      ltm: !!e.ltm,
    });
    from += w;
  }
  return leaderboard;
}

/**
 * Effective (weighted) ticket amount, mirroring the reference app. Locks are
 * multiplied so longer locks count for more of the leaderboard range.
 */
function effectiveTicketAmount(ticket) {
  const type = ticket.target_type || ticket.current_type;
  let amt = parseInt(ticket.amount && ticket.amount.amount ? ticket.amount.amount : 0, 10);
  if (type === "lock_180_days") amt *= 2;
  else if (type === "lock_360_days") amt *= 4;
  else if (type === "lock_720_days") amt *= 8;
  else if (type === "lock_forever") amt *= 8;
  else amt = 0;
  return amt;
}

/**
 * Build a leaderboard weighted by Bitshares ticket locks.
 * @param {Array} tickets objects from list_tickets (1.18.x)
 */
function buildTicketLeaderboard(tickets) {
  const byAccount = {};
  for (const tk of tickets) {
    if (!tk || !tk.account) continue;
    const amt = effectiveTicketAmount(tk);
    if (!amt) continue;
    byAccount[tk.account] = (byAccount[tk.account] || 0) + amt;
  }
  const entries = Object.entries(byAccount).map(([id, weight]) => ({
    id,
    weight,
  }));
  return buildLeaderboardFromEntries(entries);
}

/**
 * Build a leaderboard weighted by call-order (debt) collateral. Each call order
 * is a 1.8.x object with a `borrower` account and `collateral` amount.
 * @param {Array} callOrders call order objects
 */
function buildCallOrderLeaderboard(callOrders) {
  const byAccount = {};
  for (const co of callOrders) {
    if (!co || !co.borrower) continue;
    const amt = Number(co.collateral && co.collateral.amount ? co.collateral.amount : 0);
    if (!amt) continue;
    byAccount[co.borrower] = (byAccount[co.borrower] || 0) + amt;
  }
  const entries = Object.entries(byAccount).map(([id, weight]) => ({
    id,
    weight,
  }));
  return buildLeaderboardFromEntries(entries);
}

/**
 * Parse a recipient list from pasted text or an uploaded file.
 *
 * Accepted formats (one recipient per line, comma/tab/space or JSON):
 *  - JSON array: [{"account":"1.2.1","amount":10}, ...] or [["1.2.1",10], ...]
 *  - CSV / text:  "1.2.1,10" | "1.2.1 10" | "1.2.1"
 *
 * No network calls are made; recipients are expected to be account ids (1.2.x).
 *
 * @param {string} input raw text
 * @returns {{recipients: Array<{account:string, amount?:number}>, errors: string[], warnings: string[]}}
 */
function parseRecipients(input) {
  const recipients = [];
  const errors = [];
  const warnings = [];

  if (!input || !input.trim()) {
    return { recipients, errors: ["Empty recipient list"], warnings };
  }

  const trimmed = input.trim();
  const looksLikeJson = trimmed.startsWith("[") || trimmed.startsWith("{");

  let rawRows = [];
  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      rawRows = arr.map((row) => {
        if (Array.isArray(row)) return { account: String(row[0]), amount: row[1] !== undefined ? Number(row[1]) : undefined };
        if (typeof row === "string") return { account: row };
        return { account: row.account !== undefined ? String(row.account) : undefined, amount: row.amount !== undefined ? Number(row.amount) : undefined };
      });
    } catch (e) {
      errors.push("Unable to parse JSON recipient list");
      return { recipients, errors, warnings };
    }
  } else {
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const clean = line.trim();
      if (!clean || clean.startsWith("#")) continue;
      // split on comma, tab or whitespace
      const parts = clean.split(/[\s,;\t]+/).filter((p) => p.length);
      if (!parts.length) continue;
      const account = parts[0];
      const amount = parts[1] !== undefined && parts[1] !== "" ? Number(parts[1]) : undefined;
      rawRows.push({ account, amount });
    }
  }

  const seen = new Map();
  for (const row of rawRows) {
    const account = (row.account || "").trim();
    if (!account) continue;
    if (!ACCOUNT_ID_REGEX.test(account)) {
      errors.push(`Invalid account id: ${account}`);
      continue;
    }
    let amount;
    if (row.amount !== undefined && row.amount !== "" && !Number.isNaN(row.amount)) {
      amount = Number(row.amount);
      if (amount <= 0) {
        errors.push(`Amount must be greater than 0 for ${account}`);
        continue;
      }
    }

    if (seen.has(account)) {
      warnings.push(`Duplicate account ignored: ${account}`);
      continue;
    }
    seen.set(account, true);
    recipients.push({ account, amount });
  }

  if (!recipients.length) {
    errors.push("No valid recipients found");
  }

  return { recipients, errors, warnings };
}

/**
 * Split an array into chunks of the given size.
 * @param {Array} arr
 * @param {number} size
 * @returns {Array<Array>}
 */
function sliceIntoChunks(arr, size) {
  const chunks = [];
  const safeSize = Math.max(1, Math.floor(size));
  for (let i = 0; i < arr.length; i += safeSize) {
    chunks.push(arr.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Estimate the serialized byte size of a single transfer operation vs the
 * fixed transaction header. Uses an offline TransactionBuilder probe (no
 * network) so we can compute how many recipients fit per transaction.
 * @returns {Promise<{perOp: number, header: number}>}
 */
let _byteModelCache = null;
async function estimateTransferByteModel() {
  if (_byteModelCache) return _byteModelCache;
  const { TransactionBuilder } = await import("bitsharesjs");
  const mk = () => ({
    fee: { amount: 0, asset_id: "1.3.0" },
    from: "1.2.100",
    to: "1.2.200",
    amount: { amount: 100000, asset_id: "1.3.0" },
    extensions: {},
  });

  const build = async (count) => {
    const tr = new TransactionBuilder();
    for (let i = 0; i < count; i++) tr.add_type_operation("transfer", mk());
    tr.expiration = 1;
    tr.ref_block_num = 1;
    tr.ref_block_prefix = 1;
    await tr.finalize();
    return tr.tr_buffer.byteLength;
  };

  const b1 = await build(1);
  const b2 = await build(2);
  const perOp = b2 - b1;
  const header = b1 - perOp;
  _byteModelCache = { perOp, header };
  return _byteModelCache;
}

/**
 * Compute the serialized byte size for a batch of `count` recipients.
 * @param {number} count
 * @returns {Promise<number>}
 */
async function estimateBatchBytes(count) {
  const model = await estimateTransferByteModel();
  return model.header + model.perOp * count;
}

/**
 * Given the chain's maximum transaction size, compute how many recipients fit.
 * @param {number} maxBytes
 * @param {{perOp:number, header:number}} model
 * @param {number} [safety=0.95] fraction of maxBytes to actually use
 * @returns {number}
 */
function maxRecipientsPerTx(maxBytes, model, safety = 0.95) {
  if (!maxBytes || !model || model.perOp <= 0) return 1;
  const usable = Math.floor(maxBytes * safety) - model.header;
  if (usable <= 0) return 1;
  return Math.max(1, Math.floor(usable / model.perOp));
}

/**
 * Read the transfer base fee + price per kbyte from the offline fee schedule.
 * @param {Array<{id:number, data:{fee?:number, price_per_kbyte?:number}}>} globalParams
 * @returns {{fee:number, pricePerKbyte:number}}
 */
function getTransferFeeSat(globalParams) {
  const found = (globalParams || []).find((x) => x.id === 0);
  if (!found || !found.data) return { fee: 0, pricePerKbyte: 0 };
  return {
    fee: found.data.fee || 0,
    pricePerKbyte: found.data.price_per_kbyte || 0,
  };
}

/**
 * Estimate the network fee (in core asset satoshis) for a batch.
 * @param {number} batchSize
 * @param {number} transferFeeSat
 * @param {number} pricePerKbyteSat
 * @param {number} bytes
 * @returns {number}
 */
function estimateBatchFeeSat(batchSize, transferFeeSat, pricePerKbyteSat, bytes) {
  const perOpFee = batchSize * transferFeeSat;
  const kbyteFee = pricePerKbyteSat * Math.ceil(bytes / 1000);
  return perOpFee + kbyteFee;
}

/**
 * Allocate amounts to recipients based on the chosen distribution mode.
 *  - "fixed": every recipient gets `fixedAmount`
 *  - "equal": `totalAmount` split equally (remainder to the first recipient)
 *  - "custom": use the per-recipient amount parsed from the input
 * @param {Array<{account:string, amount?:number}>} recipients
 * @param {"fixed"|"equal"|"custom"} mode
 * @param {{fixedAmount?:number, totalAmount?:number, precision:number}} opts
 * @returns {Array<{account:string, humanAmount:number, satoshis:number}>}
 */
function computeAmounts(recipients, mode, opts) {
  const precision = opts.precision || 0;
  const factor = 10 ** precision;
  const round = (v) => Math.round(v * factor) / factor;

  if (mode === "fixed") {
    const amt = Number(opts.fixedAmount) || 0;
    return recipients.map((r) => ({
      account: r.account,
      humanAmount: amt,
      satoshis: Math.round(amt * factor),
    }));
  }

  if (mode === "equal") {
    const total = Number(opts.totalAmount) || 0;
    const n = recipients.length;
    if (n === 0) return [];
    const each = Math.floor((total / n) * factor) / factor;
    const remainder = round(total - each * n);
    return recipients.map((r, i) => {
      const amt = i === 0 ? round(each + remainder) : each;
      return {
        account: r.account,
        humanAmount: amt,
        satoshis: Math.round(amt * factor),
      };
    });
  }

  // custom
  return recipients.map((r) => {
    const amt = Number(r.amount) || 0;
    return {
      account: r.account,
      humanAmount: amt,
      satoshis: Math.round(amt * factor),
    };
  });
}

/**
 * Build an array of transfer operation objects for a batch.
 * @param {string} senderId
 * @param {string} assetId
 * @param {Array<{account:string, satoshis:number}>} batch
 * @returns {Array<object>}
 */
function buildTransferOps(senderId, assetId, batch) {
  return batch.map((r) => ({
    fee: { amount: 0, asset_id: "1.3.0" },
    from: senderId,
    to: r.account,
    amount: { amount: String(r.satoshis), asset_id: assetId },
    extensions: {},
  }));
}

export {
  ACCOUNT_ID_REGEX,
  parseRecipients,
  sliceIntoChunks,
  enrichPool,
  buildLeaderboard,
  buildLeaderboardFromEntries,
  effectiveTicketAmount,
  buildTicketLeaderboard,
  buildCallOrderLeaderboard,
  estimateTransferByteModel,
  estimateBatchBytes,
  maxRecipientsPerTx,
  getTransferFeeSat,
  estimateBatchFeeSat,
  computeAmounts,
  buildTransferOps,
  humanReadableFloat,
};
