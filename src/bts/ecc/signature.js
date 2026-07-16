import * as secp256k1Module from "@noble/curves/secp256k1.js";
const { secp256k1 } = secp256k1Module;
import assert from "assert";

import { sign, recoverPubKey, verify, calcPubKeyRecoveryParam } from "./ecdsa.js";
import { sha256 } from "./hash.js";
import PublicKey from "./PublicKey.js";

import { Buffer } from "buffer";

import ByteBuffer from "../serializer/ByteBuffer.js";

class Signature {
  constructor(r1, s1, i1) {
    this.r = r1;
    this.s = s1;
    this.i = i1;
    assert.equal(this.r != null, true, "Missing parameter");
    assert.equal(this.s != null, true, "Missing parameter");
    assert.equal(this.i != null, true, "Missing parameter");
  }

  static fromBuffer(buf) {
    var i, r, s;
    assert.equal(buf.length, 65, "Invalid signature length");
    i = buf.readUInt8(0);
    assert.equal(i - 27, (i - 27) & 7, "Invalid signature parameter");
    r = readUInt256BE(buf, 1);
    s = readUInt256BE(buf, 33);
    return new Signature(r, s, i);
  }

  toBuffer() {
    var buf;
    buf = Buffer.alloc(65);
    buf.writeUInt8(this.i, 0);
    writeUInt256BE(buf, this.r, 1);
    writeUInt256BE(buf, this.s, 33);
    return buf;
  }

  recoverPublicKeyFromBuffer(buffer) {
    return this.recoverPublicKey(sha256(buffer));
  }

  /**
   * @return {PublicKey}
   */
  recoverPublicKey(sha256_buffer) {
    let Q, e, i;
    e = BigInt("0x" + Buffer.from(sha256_buffer).toString("hex"));
    i = this.i;
    i -= 27;
    i = i & 3;
    Q = recoverPubKey(secp256k1, e, this, i);
    return PublicKey.fromPoint(Q);
  }

  /**
   * @param {Buffer} buf
   * @param {PrivateKey} private_key
   * @return {Signature}
   */
  static signBuffer(buf, private_key) {
    var _hash = sha256(buf);
    return Signature.signBufferSha256(_hash, private_key);
  }

  /** Sign a buffer of exactly 32 bytes in size (sha256(text))
   * @param {Buffer} buf_sha256 - 32 bytes binary
   * @param {PrivateKey} private_key
   * @return {Signature}
   */
  static signBufferSha256(buf_sha256, private_key) {
    if (buf_sha256.length !== 32 || !Buffer.isBuffer(buf_sha256))
      throw new Error("buf_sha256: 32 byte buffer requred");
    var der, e, ecsignature, i, nonce;
    i = null;
    nonce = 0;
    e = BigInt("0x" + buf_sha256.toString("hex"));
    while (true) {
      ecsignature = sign(secp256k1, buf_sha256, private_key.d, nonce++);
      der = ecsignature.toDER();
      // noble produces canonical low-S 32-byte r/s; length constraint satisfied
      i = calcPubKeyRecoveryParam(secp256k1, e, ecsignature, private_key.toPublicKey().Q);
      i += 4; // compressed
      i += 27; // compact  //  24 or 27 :( forcing odd-y 2nd key candidate
      break;
    }
    return new Signature(ecsignature.r, ecsignature.s, i);
  }

  static sign(string, private_key) {
    return Signature.signBuffer(Buffer.from(string), private_key);
  }

  verifyBuffer(buf, public_key) {
    var _hash = sha256(buf);
    return this.verifyHash(_hash, public_key);
  }

  verifyHash(hash, public_key) {
    assert.equal(hash.length, 32, "A SHA 256 should be 32 bytes long, instead got " + hash.length);
    return verify(
      secp256k1,
      hash,
      {
        r: this.r,
        s: this.s,
      },
      public_key.Q
    );
  }

  /* <HEX> */

  toByteBuffer() {
    var b;
    b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    this.appendByteBuffer(b);
    return b.copy(0, b.offset);
  }

  static fromHex(hex) {
    return Signature.fromBuffer(Buffer.from(hex, "hex"));
  }

  toHex() {
    return this.toBuffer().toString("hex");
  }

  static signHex(hex, private_key) {
    var buf;
    buf = Buffer.from(hex, "hex");
    return Signature.signBuffer(buf, private_key);
  }

  verifyHex(hex, public_key) {
    var buf;
    buf = Buffer.from(hex, "hex");
    return this.verifyBuffer(buf, public_key);
  }
}

// --- 256-bit big-endian buffer <-> bigint helpers (shared shape with ecsignature) ---
function readUInt256BE(buffer, start) {
  var end = start + 32;
  if (end > buffer.length) end = buffer.length;
  var slice = buffer.slice(start, end);
  if (slice.length < 32) {
    slice = Buffer.concat([Buffer.alloc(32 - slice.length), slice]);
  }
  return BigInt("0x" + slice.toString("hex"));
}
function writeUInt256BE(buffer, value, offset) {
  const hex = value.toString(16).padStart(64, "0");
  Buffer.from(hex, "hex").copy(buffer, offset);
}

export default Signature;
