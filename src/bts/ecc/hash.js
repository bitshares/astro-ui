import { sha1 as _sha1, ripemd160 as _ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 as _sha256, sha512 as _sha512 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";

const toBytes = (data) =>
  typeof data === "string" ? new TextEncoder().encode(data) : data;

/** @arg {string|Buffer|Uint8Array} data
    @arg {string} [encoding = null] - 'hex', 'binary' or 'base64'
    @return {Buffer|string} - Buffer when encoding is null, or string
*/
function sha1(data, encoding) {
  const out = Buffer.from(_sha1(toBytes(data)));
  return encoding ? out.toString(encoding) : out;
}

/** @arg {string|Buffer|Uint8Array} data
    @arg {string} [encoding = null] - 'hex', 'binary' or 'base64'
    @return {Buffer|string} - Buffer when encoding is null, or string
*/
function sha256(data, encoding) {
  const out = Buffer.from(_sha256(toBytes(data)));
  return encoding ? out.toString(encoding) : out;
}

/** @arg {string|Buffer|Uint8Array} data
    @arg {string} [encoding = null] - 'hex', 'binary' or 'base64'
    @return {Buffer|string} - Buffer when encoding is null, or string
*/
function sha512(data, encoding) {
  const out = Buffer.from(_sha512(toBytes(data)));
  return encoding ? out.toString(encoding) : out;
}

function HmacSHA256(buffer, secret) {
  return Buffer.from(hmac(_sha256, toBytes(secret), toBytes(buffer)));
}

function ripemd160(data) {
  return Buffer.from(_ripemd160(toBytes(data)));
}

export { sha1, sha256, sha512, HmacSHA256, ripemd160 };
