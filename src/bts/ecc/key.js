import PrivateKey from "./PrivateKey.js";
import Aes from "./Aes.js";
import { sha256, sha512 } from "./hash.js";
import { randomBytes } from "node:crypto";
import { Buffer } from "buffer";

// Adapted from bitsharesjs KeyUtils (lib/ecc/src/KeyUtils.js).
// Re-expressed without `secure-random` / `bitsharesjs-ws` / browser `window`
// entropy. Secure randomness uses Node's crypto.randomBytes (Electron main process).
const HASH_POWER_MILLS = 250;

var key = {
  /** Uses ~.25 second of hashing power to create a key/password checksum. */
  aes_checksum(password) {
    if (!(typeof password === "string")) {
      throw new Error("password string required");
    }
    var salt = randomBytes(4).toString("hex");
    var iterations = 0;
    var secret = salt + password;
    // hash for ~.1 second
    var start_t = Date.now();
    while (Date.now() - start_t < HASH_POWER_MILLS) {
      secret = sha256(secret);
      iterations += 1;
    }

    var checksum = sha256(secret);
    var checksum_string = [
      iterations,
      salt.toString("hex"),
      checksum.slice(0, 4).toString("hex"),
    ].join(",");

    return {
      aes_private: Aes.fromSeed(secret),
      checksum: checksum_string,
    };
  },

  /** Re-derive the secret from a password + checksum (throws "wrong password"). */
  aes_private(password, key_checksum) {
    var [iterations, salt, checksum] = key_checksum.split(",");
    var secret = salt + password;
    for (
      var i = 0;
      0 < iterations ? i < iterations : i > iterations;
      0 < iterations ? i++ : i++
    ) {
      secret = sha256(secret);
    }
    var new_checksum = sha256(secret);
    if (!(new_checksum.slice(0, 4).toString("hex") === checksum)) {
      throw new Error("wrong password");
    }
    return Aes.fromSeed(secret);
  },

  /**
   * A weak random number generator can run out of entropy. This should ensure
   * even the worst random number implementation will be reasonably safe.
   * @param1 string entropy of at least 32 bytes
   */
  random32ByteBuffer(entropy = this.browserEntropy()) {
    if (!(typeof entropy === "string")) {
      throw new Error("string required for entropy");
    }

    if (entropy.length < 32) {
      throw new Error("expecting at least 32 bytes of entropy");
    }

    var start_t = Date.now();

    while (Date.now() - start_t < HASH_POWER_MILLS)
      entropy = sha256(entropy);

    var hash_array = [];
    hash_array.push(entropy);

    // Hashing for ~1 second may help if the computer is not low on entropy
    // (this method may be called back-to-back).
    hash_array.push(randomBytes(32).toString("hex"));

    return sha256(Buffer.concat(hash_array.map((h) => Buffer.from(h, "hex"))));
  },

  get_random_key(entropy) {
    return PrivateKey.fromBuffer(this.random32ByteBuffer(entropy));
  },

  get_brainPrivateKey(brainKey, sequence = 0) {
    if (sequence < 0) {
      throw new Error("invalid sequence");
    }
    if (brainKey.trim() === "") {
      throw new Error("empty brain key");
    }
    brainKey = key.normalize_brainKey(brainKey);
    return PrivateKey.fromBuffer(sha256(sha512(brainKey + " " + sequence)));
  },

  // Turn invisible space like characters into a single space
  normalize_brainKey(brainKey) {
    if (!(typeof brainKey === "string")) {
      throw new Error("string required for brainKey");
    }

    brainKey = brainKey.trim();
    if (brainKey === "") {
      throw new Error("empty brain key");
    }
    return brainKey.split(/[\t\n\v\f\r ]+/).join(" ");
  },

  // Browser entropy (unused in Electron main process; kept for API parity).
  browserEntropy() {
    return new Date().toString() + " " + Math.random().toString();
  },
};

export { key };
export default key;
