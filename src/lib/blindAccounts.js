// Blind (stealth) account management for the Bitshares web wallet.
//
// A "blind account" in Graphene is not a registered on-chain account; it is
// simply a labeled secp256k1 keypair. The public key (BTS...) is what the
// blockchain sees as a `blind_output.owner`, while the private key (WIF) lets
// the wallet claim the associated blinded balances.
//
// Derivation mirrors the core wallet exactly:
//   private_key = regenerate(sha256(sha512(brain_key + " " + sequence)))
// which the repo's `key.get_brainPrivateKey` already implements faithfully
// (see src/bts/ecc/key.js and the bitshares-fc elliptic source).
//
// IMPORTANT: bts/ecc depends on Node's Buffer, which does not exist in the
// browser bundle. All key/crypto operations therefore run in the Electron
// main process (see src/background.js) and are reached over IPC via
// `window.electron.blind*`. The functions below are thin async wrappers.
// Only `strength` and `prefixForChain` are pure and run client-side.

function prefixForChain(chain) {
  if (chain === "bitshares_testnet") return "TEST";
  return "BTS";
}

function _electron() {
  if (typeof window === "undefined" || !window.electron) {
    throw new Error(
      "Blind account crypto requires the desktop app (Electron IPC)."
    );
  }
  return window.electron;
}

/**
 * Suggest a fresh 16-word brain key using the canonical Graphene dictionary.
 * @returns {Promise<string>} normalized, space-joined brain key.
 */
async function suggestBrainKey() {
  return _electron().blindSuggestBrainKey();
}

/**
 * Derive a blind account from a brain key (deterministic, identical to the
 * core CLI `create_blind_account`).
 * @param {string} label - wallet-only label (e.g. "alice").
 * @param {string} chain - "bitshares" | "bitshares_testnet".
 * @param {string} brainKey - the 16-word brain key.
 * @param {number} [sequence=0] - key index.
 * @returns {Promise<{label,chain,publicKey,wif,brainKey}>}
 */
async function accountFromBrainKey(label, chain, brainKey, sequence = 0) {
  return _electron().blindAccountFromBrainKey({
    label,
    chain,
    brainKey,
    sequence,
  });
}

/**
 * Reconstruct a blind account from a WIF private key (e.g. imported/backed up).
 * @returns {Promise<{label,chain,publicKey,wif,brainKey}>}
 */
async function accountFromWif(label, chain, wif) {
  return _electron().blindAccountFromWif({ label, chain, wif });
}

/**
 * Encrypt an arbitrary string (e.g. a WIF or a brain key) with a passphrase
 * using AES-256-CBC. Returns a hex ciphertext string.
 * @returns {Promise<string>}
 */
async function encrypt(plaintext, password) {
  return _electron().blindEncrypt({ plaintext, password });
}

/**
 * Decrypt a string previously produced by {@link encrypt}. No format
 * assumption is made about the plaintext.
 * @returns {Promise<string>}
 */
async function decrypt(encrypted, password) {
  return _electron().blindDecrypt({ encrypted, password });
}

/**
 * Encrypt a WIF key with a passphrase using AES-256-CBC.
 * @returns {Promise<string>} hex ciphertext.
 */
async function encryptWif(wif, password) {
  return encrypt(wif, password);
}

/**
 * Decrypt a WIF key previously produced by {@link encryptWif}.
 * Throws if the passphrase is wrong (decryption yields an invalid WIF).
 * @returns {Promise<string>}
 */
async function decryptWif(encryptedWif, password) {
  return _electron().blindDecrypt({
    encrypted: encryptedWif,
    password,
    validateWif: true,
  });
}

/**
 * Estimate passphrase strength as an entropy-based score (bits) plus a 0-4
 * bucket. Transparent and dependency-free: length, character-class variety,
 * and a penalty for whole-word / repeated patterns. Pure — runs client-side.
 * @returns {{ bits:number, score:number, label:string }}
 */
function strength(password) {
  if (!password || password.length === 0) {
    return { bits: 0, score: 0, label: "none" };
  }
  const len = password.length;
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  // Effective alphabet size per class mix (conservative estimates).
  const pool = [0, 0, 26, 36, 62, 95][classes] || 95;
  let bits = len * (Math.log2(pool) || 0);

  // Penalty: long runs of identical characters reduce real entropy.
  const repeats = (password.match(/(.)\1{2,}/g) || []).length;
  bits -= repeats * 4;
  // Penalty: sequential runs (e.g. "1234", "abcd").
  const seq = (password.match(/(?:abcd|bcde|cdef|1234|2345|3456|4567|5678|6789)/gi) || [])
    .length;
  bits -= seq * 4;
  bits = Math.max(0, Math.round(bits));

  let score = 0;
  let label = "veryWeak";
  if (bits >= 80) {
    score = 4;
    label = "veryStrong";
  } else if (bits >= 60) {
    score = 3;
    label = "strong";
  } else if (bits >= 40) {
    score = 2;
    label = "moderate";
  } else if (bits >= 20) {
    score = 1;
    label = "weak";
  }
  return { bits, score, label };
}

export {
  suggestBrainKey,
  accountFromBrainKey,
  accountFromWif,
  encrypt,
  decrypt,
  encryptWif,
  decryptWif,
  strength,
  prefixForChain,
};
