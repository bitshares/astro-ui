import * as secp256k1Module from "@noble/curves/secp256k1.js";
const { secp256k1 } = secp256k1Module;

import pkg from "bs58";
const { encode, decode } = pkg;

import assert from "assert";
import deepEqual from "deep-equal";
import { Buffer } from "buffer";

import { sha256, sha512 } from "./hash.js";
import PublicKey from "./PublicKey.js";
import { CURVE_N } from "./ecdsa.js";
import ByteBuffer from "../serializer/ByteBuffer.js";

// Adapted from bitsharesjs PrivateKey (lib/ecc/src/PrivateKey.js).
// Re-expressed without bigi/ecurve: scalar arithmetic uses native BigInt,
// curve ops use @noble/curves@2.x (Point.BASE, Point.add/multiply),
// and buffers use the Node/Electron `buffer` Buffer.
class PrivateKey {
  /** @private see static functions */
  constructor(d) {
    this.d = d;
  }

  static fromBuffer(buf) {
    if (!Buffer.isBuffer(buf)) {
      throw new Error("Expecting parameter to be a Buffer type");
    }
    if (32 !== buf.length) {
      console.log(
        `WARN: Expecting 32 bytes, instead got ${
          buf.length
        }, stack trace:`,
        new Error().stack
      );
    }
    if (buf.length === 0) {
      throw new Error("Empty buffer");
    }
    return new PrivateKey(BigInt("0x" + buf.toString("hex")));
  }

  /** @arg {string} seed - any length string.  This is private, the same seed produces the same private key every time.  */
  static fromSeed(seed) {
    // generate_private_key
    if (!(typeof seed === "string")) {
      throw new Error("seed must be of type string");
    }
    return PrivateKey.fromBuffer(sha256(seed));
  }

  /** @return {string} Wallet Import Format (still a secret, Not encrypted) */
  static fromWif(_private_wif) {
    var private_wif = Buffer.from(decode(_private_wif));
    var version = private_wif.readUInt8(0);
    assert.equal(
      0x80,
      version,
      `Expected version ${0x80}, instead got ${version}`
    );
    // checksum includes the version
    var private_key = private_wif.slice(0, -4);
    var checksum = private_wif.slice(-4);
    var new_checksum = sha256(private_key);
    new_checksum = sha256(new_checksum);
    new_checksum = new_checksum.slice(0, 4);
    var isEqual = deepEqual(checksum, new_checksum); //, 'Invalid checksum'
    if (!isEqual) {
      throw new Error("Checksum did not match");
    }
    private_key = private_key.slice(1);
    return PrivateKey.fromBuffer(private_key);
  }

  toWif() {
    var private_key = this.toBuffer();
    // checksum includes the version
    private_key = Buffer.concat([Buffer.from([0x80]), private_key]);
    var checksum = sha256(private_key);
    checksum = sha256(checksum);
    checksum = checksum.slice(0, 4);
    var private_wif = Buffer.concat([private_key, checksum]);
    return encode(private_wif);
  }

  /**
   * @return {Point}
   */
  toPublicKeyPoint() {
    return secp256k1.Point.BASE.multiply(this.d);
  }

  toPublicKey() {
    if (this.public_key) {
      return this.public_key;
    }
    return (this.public_key = PublicKey.fromPoint(this.toPublicKeyPoint()));
  }

  toBuffer() {
    return Buffer.from(this.d.toString(16).padStart(64, "0"), "hex");
  }

  /** ECDH */
  get_shared_secret(public_key, legacy = false) {
    public_key = toPublic(public_key);
    let KB = public_key.toUncompressed().toBuffer();
    let KBP = secp256k1.Point.fromHex(KB.toString("hex"));
    let r = this.toBuffer();
    let P = KBP.multiply(BigInt("0x" + r.toString("hex")));
    let S = Buffer.from(P.x.toString(16).padStart(64, "0"), "hex");
    /*
        the input to sha512 must be exactly 32-bytes, to match the c++ implementation
        of get_shared_secret.  Right now S will be shorter if the most significant
        byte(s) is zero.  Pad it back to the full 32-bytes
        */
    if (!legacy && S.length < 32) {
      let pad = Buffer.alloc(32 - S.length).fill(0);
      S = Buffer.concat([pad, S]);
    }

    // SHA512 used in ECDH
    return sha512(S);
  }

  /** @throws {Error} - overflow of the key could not be derived */
  child(offset) {
    offset = Buffer.concat([this.toPublicKey().toBuffer(), offset]);
    offset = sha256(offset);

    let c = BigInt("0x" + offset.toString("hex"));

    if (c >= CURVE_N)
      throw new Error("Child offset went out of bounds, try again");

    // ecurve reduces the scalar mod n internally on point multiplication, so the
    // derived scalar must be reduced mod n to match (noble's multiply rejects >= n).
    let derived = (this.d + c) % CURVE_N;

    if (derived === 0n)
      throw new Error("Child offset derived to an invalid key, try again");

    return new PrivateKey(derived);
  }

  /* <helper_functions> */

  toByteBuffer() {
    var b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    this.appendByteBuffer(b);
    return b.copy(0, b.offset);
  }

  static fromHex(hex) {
    return PrivateKey.fromBuffer(Buffer.from(hex, "hex"));
  }

  toHex() {
    return this.toBuffer().toString("hex");
  }

  /* </helper_functions> */
}

let toPublic = (data) =>
  data == null ? data : data.Q ? data : PublicKey.fromStringOrThrow(data);

export default PrivateKey;
