// Symmetric encrypt/decrypt via AES-256-CBC (PKCS7).
// Parity re-implementation of bitsharesjs `lib/ecc/src/aes.js`.
//
// The original used `crypto-js/aes` (+ `enc-hex`/`enc-base64`). crypto-js AES
// defaults to CBC mode, PKCS7 padding, no salt, with the key/IV supplied
// directly (here key=32 bytes -> AES-256, iv=16 bytes). Node's `crypto`
// `aes-256-cbc` with its default PKCS7 padding produces byte-identical
// ciphertext/plaintext for the same key, IV, and input, so the
// `encrypt_with_checksum` / `decrypt_with_checksum` contract (and the
// checksum verification it relies on) is preserved exactly.
import assert from "assert";
import { createCipheriv, createDecipheriv } from "node:crypto";
import { Buffer } from "buffer";
import { sha256, sha512 } from "./hash.js";

const AES_BLOCK_SIZE = 16; // bytes; CBC, 128-bit block

/** Provides symmetric encrypt and decrypt via AES. */
class Aes {
  /** @private */
  constructor(iv, key) {
    this.iv = iv;
    this.key = key;
  }

  /** This is an excellent way to ensure that all references to Aes can not operate anymore (example: a wallet becomes locked).  An application should ensure there is only one Aes object instance for a given secret `seed`. */
  clear() {
    return (this.iv = this.key = undefined);
  }

  /** @arg {string} seed - secret seed may be used to encrypt or decrypt. */
  static fromSeed(seed) {
    if (seed === undefined) {
      throw new Error("seed is required");
    }
    var _hash = sha512(seed);
    _hash = _hash.toString("hex");
    return Aes.fromSha512(_hash);
  }

  /** @arg {string} hash - A 128 byte hex string, typically one would call {@link fromSeed} instead. */
  static fromSha512(hash) {
    assert.equal(
      hash.length,
      128,
      `A Sha512 in HEX should be 128 characters long, instead got ${
        hash.length
      }`
    );
    var iv = Buffer.from(hash.substring(64, 96), "hex");
    var key = Buffer.from(hash.substring(0, 64), "hex");
    return new Aes(iv, key);
  }

  static fromBuffer(buf) {
    assert(Buffer.isBuffer(buf), "Expecting Buffer");
    assert.equal(
      buf.length,
      64,
      `A Sha512 Buffer should be 64 characters long, instead got ${
        buf.length
      }`
    );
    return Aes.fromSha512(buf.toString("hex"));
  }

  /**
      @throws {Error} - "Invalid Key, ..."
      @arg {PrivateKey} private_key - required and used for decryption
      @arg {PublicKey} public_key - required and used to calcualte the shared secret
      @arg {string} [nonce = ""] optional but should always be provided and be unique when re-using the same private/public keys more than once.  This nonce is not a secret.
      @arg {string|Buffer} message - Encrypted message containing a checksum
      @return {Buffer}
  */
  static decrypt_with_checksum(
    private_key,
    public_key,
    nonce,
    message,
    legacy = false
  ) {
    // Warning: Do not put `nonce = ""` in the arguments, in es6 this will not convert "null" into an emtpy string
    if (nonce == null)
      // null or undefined
      nonce = "";

    if (!Buffer.isBuffer(message)) {
      message = Buffer.from(message, "hex");
    }

    var S = private_key.get_shared_secret(public_key, legacy);

    var aes = Aes.fromSeed(
      Buffer.concat([
        // A null or empty string nonce will not effect the hash
        Buffer.from("" + nonce),
        Buffer.from(S.toString("hex")),
      ])
    );

    var planebuffer = aes.decrypt(message);
    if (!(planebuffer.length >= 4)) {
      throw new Error("Invalid key, could not decrypt message(1)");
    }

    var checksum = planebuffer.slice(0, 4);
    var plaintext = planebuffer.slice(4);

    var new_checksum = sha256(plaintext);
    new_checksum = new_checksum.slice(0, 4);
    new_checksum = new_checksum.toString("hex");

    if (!(checksum.toString("hex") === new_checksum)) {
      throw new Error("Invalid key, could not decrypt message(2)");
    }

    return plaintext;
  }

  /** Identical to {@link decrypt_with_checksum} but used to encrypt.  Should not throw an error.
      @return {Buffer} message - Encrypted message which includes a checksum
  */
  static encrypt_with_checksum(private_key, public_key, nonce, message) {
    // Warning: Do not put `nonce = ""` in the arguments, in es6 this will not convert "null" into an emtpy string

    if (nonce == null)
      // null or undefined
      nonce = "";

    if (!Buffer.isBuffer(message)) {
      message = Buffer.from(message, "binary");
    }

    var S = private_key.get_shared_secret(public_key);

    var aes = Aes.fromSeed(
      Buffer.concat([
        // A null or empty string nonce will not effect the hash
        Buffer.from("" + nonce),
        Buffer.from(S.toString("hex")),
      ])
    );
    var checksum = sha256(message).slice(0, 4);
    var payload = Buffer.concat([checksum, message]);
    return aes.encrypt(payload);
  }

  /** @private */
  _decrypt_word_array(cipher) {
    var decipher = createDecipheriv("aes-256-cbc", this.key, this.iv);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(cipher), decipher.final()]);
  }

  /** @private */
  _encrypt_word_array(plaintext) {
    var cipher = createCipheriv("aes-256-cbc", this.key, this.iv);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(plaintext), cipher.final()]);
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {Buffer|string} ciphertext
      @return {Buffer} binary
  */
  decrypt(ciphertext) {
    if (typeof ciphertext === "string") {
      ciphertext = Buffer.from(ciphertext, "binary");
    }
    if (!Buffer.isBuffer(ciphertext)) {
      throw new Error("buffer required");
    }
    assert(ciphertext, "Missing cipher text");
    return this._decrypt_word_array(ciphertext);
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {Buffer|string} plaintext
      @return {Buffer} binary
  */
  encrypt(plaintext) {
    if (typeof plaintext === "string") {
      plaintext = Buffer.from(plaintext, "binary");
    }
    if (!Buffer.isBuffer(plaintext)) {
      throw new Error("buffer required");
    }
    return this._encrypt_word_array(plaintext);
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {Buffer|string} plaintext
      @return {string} hex
  */
  encryptToHex(plaintext) {
    if (typeof plaintext === "string") {
      plaintext = Buffer.from(plaintext, "binary");
    }
    if (!Buffer.isBuffer(plaintext)) {
      throw new Error("buffer required");
    }
    return this._encrypt_word_array(plaintext).toString("hex");
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {string} cipher - hex
      @return {string} hex
  */
  decryptHex(cipher) {
    assert(cipher, "Missing cipher text");
    return this._decrypt_word_array(Buffer.from(cipher, "hex")).toString("hex");
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {string} cipher - hex
      @return {Buffer} encoded as specified by the parameter
  */
  decryptHexToBuffer(cipher) {
    assert(cipher, "Missing cipher text");
    return this._decrypt_word_array(Buffer.from(cipher, "hex"));
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {string} cipher - hex
      @arg {string} [encoding = 'binary'] - a valid Buffer encoding
      @return {String} encoded as specified by the parameter
  */
  decryptHexToText(cipher, encoding = "binary") {
    return this.decryptHexToBuffer(cipher).toString(encoding);
  }

  /** This method does not use a checksum, the returned data must be validated some other way.
      @arg {string} plainhex - hex format
      @return {String} hex
  */
  encryptHex(plainhex) {
    return this._encrypt_word_array(Buffer.from(plainhex, "hex")).toString(
      "hex"
    );
  }
}

export default Aes;
