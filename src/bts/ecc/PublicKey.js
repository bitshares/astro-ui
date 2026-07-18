import * as secp256k1Module from "@noble/curves/secp256k1.js";
const { secp256k1 } = secp256k1Module;

import pkg from "bs58";
const { encode, decode } = pkg;

import assert from "assert";
import deepEqual from "deep-equal";

import { sha256, sha512, ripemd160 } from "./hash.js";
import ChainConfig from "../ws/ChainConfig";
import ByteBuffer from "../serializer/ByteBuffer.js";
import { CURVE_N } from "./ecdsa.js";

import { Buffer } from "buffer";

const NULL_KEY_HEX = "000000000000000000000000000000000000000000000000000000000000000000";

class PublicKey {
  /** @param {Point} public key */
  constructor(Q) {
    this.Q = Q;
  }

  static fromBinary(bin) {
    return PublicKey.fromBuffer(Buffer.from(bin, "binary"));
  }

  static fromBuffer(buffer) {
    if (buffer.toString("hex") === NULL_KEY_HEX) return new PublicKey(null);
    // @noble/curves@2.x Point.fromHex expects a hex *string* (the old
    // ecurve Point.decodeFrom accepted a Buffer directly), so we convert.
    return new PublicKey(secp256k1.Point.fromHex(buffer.toString("hex")));
  }

  toBuffer(compressed = true) {
    if (this.Q === null)
      return Buffer.from(NULL_KEY_HEX, "hex");
    return Buffer.from(this.Q.toBytes(compressed));
  }

  static fromPoint(point) {
    return new PublicKey(point);
  }

  toUncompressed() {
    var buf = this.Q.toBytes(false);
    var point = secp256k1.Point.fromHex(Buffer.from(buf).toString("hex"));
    return PublicKey.fromPoint(point);
  }

  /** bts::blockchain::address (unique but not a full public key) */
  toBlockchainAddress() {
    var pub_buf = this.toBuffer();
    var pub_sha = sha512(pub_buf);
    return ripemd160(pub_sha);
  }

  /** Alias for {@link toPublicKeyString} */
  toString(address_prefix = ChainConfig.address_prefix) {
    return this.toPublicKeyString(address_prefix);
  }

  /**
   * Full public key
   * {return} string
   */
  toPublicKeyString(address_prefix = ChainConfig.address_prefix) {
    var pub_buf = this.toBuffer();
    var checksum = ripemd160(pub_buf);
    var addy = Buffer.concat([pub_buf, checksum.slice(0, 4)]);
    return address_prefix + encode(addy);
  }

  /**
   * @arg {string} public_key - like GPHXyz...
   * @arg {string} address_prefix - like GPH
   * @return PublicKey or `null` (if the public_key string is invalid)
   */
  static fromPublicKeyString(public_key, address_prefix = ChainConfig.address_prefix) {
    try {
      return PublicKey.fromStringOrThrow(public_key, address_prefix);
    } catch (e) {
      return null;
    }
  }

  /**
   * @arg {string} public_key - like GPHXyz...
   * @arg {string} address_prefix - like GPH
   * @throws {Error} if public key is invalid
   * @return PublicKey
   */
  static fromStringOrThrow(public_key, address_prefix = ChainConfig.address_prefix) {
    if (public_key.Q === null)
      public_key = address_prefix + "1111111111111111111111111111111114T1Anm"; // null key
    var prefix = public_key.slice(0, address_prefix.length);
    assert.equal(
      address_prefix,
      prefix,
      `Expecting key to begin with ${address_prefix}, instead got ${prefix}`
    );
    public_key = public_key.slice(address_prefix.length);

    public_key = Buffer.from(decode(public_key), "binary");
    var checksum = public_key.slice(-4);
    public_key = public_key.slice(0, -4);
    var new_checksum = ripemd160(public_key);
    new_checksum = new_checksum.slice(0, 4);
    var isEqual = deepEqual(checksum, new_checksum); //, 'Invalid checksum'
    if (!isEqual) {
      throw new Error("Checksum did not match");
    }
    return PublicKey.fromBuffer(public_key);
  }

  toAddressString(address_prefix = ChainConfig.address_prefix) {
    var pub_buf = this.toBuffer();
    var pub_sha = sha512(pub_buf);
    var addy = ripemd160(pub_sha);
    var checksum = ripemd160(addy);
    addy = Buffer.concat([addy, checksum.slice(0, 4)]);
    return address_prefix + encode(addy);
  }

  toPtsAddy() {
    var pub_buf = this.toBuffer();
    var pub_sha = sha256(pub_buf);
    var addy = ripemd160(pub_sha);
    addy = Buffer.concat([Buffer.from([0x38]), addy]); //version 56(decimal)

    var checksum = sha256(addy);
    checksum = sha256(checksum);

    addy = Buffer.concat([addy, checksum.slice(0, 4)]);
    return encode(addy);
  }

  child(offset) {
    assert(Buffer.isBuffer(offset), "Buffer required: offset");
    assert.equal(offset.length, 32, "offset length");

    offset = Buffer.concat([this.toBuffer(), offset]);
    offset = sha256(offset);

    let c = BigInt("0x" + offset.toString("hex"));
    if (c >= CURVE_N) throw new Error("Child offset went out of bounds, try again");

    let cG = secp256k1.Point.BASE.multiply(c);
    let Qprime = this.Q.add(cG);

    if (Qprime.equals(secp256k1.Point.ZERO))
      throw new Error("Child offset derived to an invalid key, try again");

    return PublicKey.fromPoint(Qprime);
  }

  /* <HEX> */

  toByteBuffer() {
    var b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    this.appendByteBuffer(b);
    return b.copy(0, b.offset);
  }

  static fromHex(hex) {
    return PublicKey.fromBuffer(Buffer.from(hex, "hex"));
  }

  toHex() {
    return this.toBuffer().toString("hex");
  }

  static fromPublicKeyStringHex(hex) {
    return PublicKey.fromPublicKeyString(Buffer.from(hex, "hex"));
  }

  /* </HEX> */
}

export default PublicKey;
