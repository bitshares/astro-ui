import assert from "assert";

import enforceType from "./enforce_types.js";

function ECSignature(r, s) {
  enforceType("bigint", r);
  enforceType("bigint", s);

  this.r = r;
  this.s = s;
}

// Import operations
ECSignature.parseCompact = function (buffer) {
  assert.equal(buffer.length, 65, "Invalid signature length");
  var i = buffer.readUInt8(0) - 27;

  // At most 3 bits
  assert.equal(i, i & 7, "Invalid signature parameter");
  var compressed = !!(i & 4);

  // Recovery param only
  i = i & 3;

  var r = readUInt256BE(buffer, 1);
  var s = readUInt256BE(buffer, 33);

  return {
    compressed: compressed,
    i: i,
    signature: new ECSignature(r, s),
  };
};

ECSignature.fromDER = function (buffer) {
  assert.equal(buffer.readUInt8(0), 0x30, "Not a DER sequence");
  assert.equal(buffer.readUInt8(1), buffer.length - 2, "Invalid sequence length");
  assert.equal(buffer.readUInt8(2), 0x02, "Expected a DER integer");

  var rLen = buffer.readUInt8(3);
  assert(rLen > 0, "R length is zero");

  var offset = 4 + rLen;
  assert.equal(buffer.readUInt8(offset), 0x02, "Expected a DER integer (2)");

  var sLen = buffer.readUInt8(offset + 1);
  assert(sLen > 0, "S length is zero");

  var rB = buffer.slice(4, offset);
  var sB = buffer.slice(offset + 2);
  offset += 2 + sLen;

  if (rLen > 1 && rB.readUInt8(0) === 0x00) {
    assert(rB.readUInt8(1) & 0x80, "R value excessively padded");
  }

  if (sLen > 1 && sB.readUInt8(0) === 0x00) {
    assert(sB.readUInt8(1) & 0x80, "S value excessively padded");
  }

  assert.equal(offset, buffer.length, "Invalid DER encoding");
  var r = readUInt256BE(rB, rB.length - 32);
  var s = readUInt256BE(sB, sB.length - 32);

  assert(r >= 0n, "R value is negative");
  assert(s >= 0n, "S value is negative");

  return new ECSignature(r, s);
};

// FIXME: 0x00, 0x04, 0x80 are SIGHASH_* boundary constants, importing Transaction causes a circular dependency
ECSignature.parseScriptSignature = function (buffer) {
  var hashType = buffer.readUInt8(buffer.length - 1);
  var hashTypeMod = hashType & ~0x80;

  assert(hashTypeMod > 0x00 && hashTypeMod < 0x04, "Invalid hashType");

  return {
    signature: ECSignature.fromDER(buffer.slice(0, -1)),
    hashType: hashType,
  };
};

// Export operations
ECSignature.prototype.toCompact = function (i, compressed) {
  if (compressed) i += 4;
  i += 27;

  var buffer = Buffer.alloc(65);
  buffer.writeUInt8(i, 0);

  writeUInt256BE(buffer, this.r, 1);
  writeUInt256BE(buffer, this.s, 33);

  return buffer;
};

ECSignature.prototype.toDER = function () {
  var rBa = toDERInteger(this.r);
  var sBa = toDERInteger(this.s);

  var sequence = [];

  // INTEGER
  sequence.push(0x02, rBa.length);
  sequence = sequence.concat(Array.from(rBa));

  // INTEGER
  sequence.push(0x02, sBa.length);
  sequence = sequence.concat(Array.from(sBa));

  // SEQUENCE
  sequence.unshift(0x30, sequence.length);

  return Buffer.from(sequence);
};

ECSignature.prototype.toScriptSignature = function (hashType) {
  var hashTypeBuffer = Buffer.alloc(1);
  hashTypeBuffer.writeUInt8(hashType, 0);

  return Buffer.concat([this.toDER(), hashTypeBuffer]);
};

// --- helpers (256-bit big-endian buffer <-> bigint) ---
function readUInt256BE(buffer, start) {
  // read 32 bytes big-endian starting at `start`
  var end = start + 32;
  if (end > buffer.length) end = buffer.length;
  var slice = buffer.slice(start, end);
  if (slice.length < 32) {
    // left-pad with zeros
    slice = Buffer.concat([Buffer.alloc(32 - slice.length), slice]);
  }
  return BigInt("0x" + slice.toString("hex"));
}

function writeUInt256BE(buffer, value, offset) {
  const hex = value.toString(16).padStart(64, "0");
  Buffer.from(hex, "hex").copy(buffer, offset);
}

function toDERInteger(value) {
  var hex = value.toString(16).replace(/^/, "");
  if (hex.length % 2) hex = "0" + hex;
  var bytes = Buffer.from(hex, "hex");
  // ensure minimum length 1
  if (bytes.length === 0) bytes = Buffer.from([0x00]);
  // strip leading zero bytes unless needed for sign
  var i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0x00) i++;
  if (bytes[i] & 0x80) {
    // prepend zero for positive sign
    return Buffer.concat([Buffer.from([0x00]), bytes.slice(i)]);
  }
  return bytes.slice(i);
}

export default ECSignature;
