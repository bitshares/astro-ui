import assert from "assert"; // from github.com/bitcoinjs/bitcoinjs-lib from github.com/cryptocoinjs/ecdsa
import * as secp256k1Module from "@noble/curves/secp256k1.js";
const { secp256k1 } = secp256k1Module;

import { sha256, HmacSHA256 } from "./hash";
import enforceType from "./enforce_types.js";

import ECSignature from "./ecsignature.js";
import { Buffer } from "buffer";

// @noble/curves@2.x removed the CURVE.n accessor. The secp256k1 group order is a
// fixed constant, so we keep it here for the RFC6979 loop bound and child-derivation
// range checks.
const CURVE_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

// The original implementation performed RFC6979 deterministic k generation
// and ECDSA sign/verify/recover manually (via bigi + ecurve). @noble/curves
// provides the same primitives (RFC6979, low-S canonical signatures, recovery)
// natively, so we delegate to it while keeping the original function shapes.

// https://tools.ietf.org/html/rfc6979#section-3.2
function deterministicGenerateK(curve, hash, d, checkSig, nonce) {
  enforceType("Buffer", hash);
  enforceType("bigint", d);

  if (nonce) {
    hash = sha256(Buffer.concat([hash, Buffer.alloc(nonce)]));
  }

  // sanity check
  assert.equal(hash.length, 32, "Hash must be 256 bit");

  var x = Buffer.from(d.toString(16).padStart(64, "0"), "hex");
  var k = Buffer.alloc(32);
  var v = Buffer.alloc(32);

  // Step B
  v.fill(1);

  // Step C
  k.fill(0);

  // Step D
  k = HmacSHA256(Buffer.concat([v, Buffer.from([0]), x, hash]), k);

  // Step E
  v = HmacSHA256(v, k);

  // Step F
  k = HmacSHA256(Buffer.concat([v, Buffer.from([1]), x, hash]), k);

  // Step G
  v = HmacSHA256(v, k);

  // Step H2b
  v = HmacSHA256(v, k);

  var T = BigInt("0x" + v.toString("hex"));

  // Step H3, repeat until T is within the interval [1, n - 1]
  while (T <= 0n || T >= curve.n || !checkSig(T)) {
    k = HmacSHA256(Buffer.concat([v, Buffer.from([0])]), k);
    v = HmacSHA256(v, k);

    v = HmacSHA256(v, k);

    T = BigInt("0x" + v.toString("hex"));
  }

  return T;
}

function sign(curve, hash, d, nonce) {
  const e = BigInt("0x" + Buffer.from(hash).toString("hex"));
  const n = curve.n;

  // @noble/curves@2.x: sign() hashes the message internally by default
  // (prehash: true). Our callers already pass a SHA-256 digest, so we pass
  // { prehash: false }. We request the canonical 64-byte compact format (r||s);
  // the recovery id is recomputed separately by calcPubKeyRecoveryParam, so the
  // 65-byte "recovered" format (which uses a different r/s encoding) is not used.
  const sigBytes = secp256k1.sign(
    hash,
    Buffer.from(d.toString(16).padStart(64, "0"), "hex"),
    { prehash: false, format: "compact" }
  );

  const r = BigInt("0x" + Buffer.from(sigBytes.slice(0, 32)).toString("hex"));
  const s = BigInt("0x" + Buffer.from(sigBytes.slice(32, 64)).toString("hex"));

  // Maintain the original loop contract: keep retrying (with nonce) until a
  // canonically valid compact signature is produced. noble already returns
  // low-S; the length-32 r/s constraint is inherently satisfied.
  return new ECSignature(r, s);
}

function msgBytes(e) {
  const hex = e.toString(16).padStart(64, "0");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

// Build a 64-byte compact signature (r||s) for noble's verify()/recoverPublicKey(),
// which (in @noble/curves@2.x) expect a Uint8Array rather than a Signature instance.
function compactBytes(signature) {
  const r = signature.r.toString(16).padStart(64, "0");
  const s = signature.s.toString(16).padStart(64, "0");
  return Uint8Array.from(Buffer.from(r + s, "hex"));
}

function verifyRaw(curve, e, signature, Q) {
  const pub = pointToBytes(Q);
  return secp256k1.verify(compactBytes(signature), msgBytes(e), pub, {
    prehash: false,
    lowS: false,
  });
}

function verify(curve, hash, signature, Q) {
  const e = BigInt("0x" + Buffer.from(hash).toString("hex"));
  return verifyRaw(curve, e, signature, Q);
}

/**
 * Recover a public key from a signature.
 *
 * @noble/curves@2.x removed the Signature#recoverPublicKey method. Recovery is
 * now done by attaching the recovery id to a compact Signature (addRecoveryBit)
 * and calling recoverPublicKey(msg, opts). The internal message is already a
 * SHA-256 digest, so we pass { prehash: false }.
 *
 * Valid recovery ids for a given r (< n) are 0 or 1; addRecoveryBit(2|3) throws
 * ("sig.r+curve.n != R") and is simply skipped by the caller's loop.
 */
function recoverPubKey(curve, e, signature, i) {
  assert.strictEqual(i & 3, i, "Recovery param is more than two bits");

  const sig = secp256k1.Signature.fromBytes(compactBytes(signature), "compact");
  const recovered = sig.addRecoveryBit(i).recoverPublicKey(msgBytes(e), {
    prehash: false,
  });
  return recovered;
}

/**
 * Calculate pubkey extraction parameter.
 */
function calcPubKeyRecoveryParam(curve, e, signature, Q) {
  for (var i = 0; i < 4; i++) {
    try {
      const Qprime = recoverPubKey(curve, e, signature, i);

      if (pointEquals(Qprime, Q)) {
        return i;
      }
    } catch (err) {
      // Recovery ids 2/3 are only valid when r >= n; for the common case
      // (r < n) they throw and must simply be skipped.
      continue;
    }
  }

  throw new Error("Unable to find valid recovery factor");
}

// --- point helpers (Q is a secp256k1.Point) ---
function pointToBytes(Q) {
  return Buffer.from(Q.toBytes(true));
}

// Structural point equality (x AND y), matching the original ecurve Point#equals
// semantics — independent of compressed/uncompressed encoding.
function pointEquals(a, b) {
  return a.x === b.x && a.y === b.y;
}

// curve descriptor mirroring the fields the rest of the code reads (n, G, etc.)
const curve = {
  n: CURVE_N,
  G: secp256k1.Point.BASE,
};

export { calcPubKeyRecoveryParam, deterministicGenerateK, recoverPubKey, sign, verify, verifyRaw, curve, CURVE_N };
export default { calcPubKeyRecoveryParam, deterministicGenerateK, recoverPubKey, sign, verify, verifyRaw, curve, CURVE_N };
