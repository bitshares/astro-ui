// Minimal ByteBuffer-compatible wrapper backed by node's Buffer.
// Replicates the subset of @exodus/bytebuffer used by src/bts so the
// serialization layer stays byte-for-byte wire compatible.
//
// Differences from the original:
//   - 64-bit ints are represented with native BigInt instead of Long.
//   - Grows on demand; never throws on capacity (auto-resize like bytebuffer).

const DEFAULT_CAPACITY = 1024;
const LITTLE_ENDIAN = true;

function ensureCapacity(buf, needed) {
  if (buf.length >= needed) return buf;
  let cap = buf.length || DEFAULT_CAPACITY;
  while (cap < needed) cap *= 2;
  const next = Buffer.alloc(cap);
  buf.copy(next);
  return next;
}

class ByteBuffer {
  constructor(capacity = DEFAULT_CAPACITY, _endian = LITTLE_ENDIAN) {
    this.buffer = Buffer.alloc(capacity);
    this.offset = 0;
    this.limit = capacity;
  }

  static get DEFAULT_CAPACITY() {
    return DEFAULT_CAPACITY;
  }

  static get LITTLE_ENDIAN() {
    return LITTLE_ENDIAN;
  }

  static fromHex(hex, _endian = LITTLE_ENDIAN) {
    const data = Buffer.from(hex, "hex");
    const b = new ByteBuffer(data.length || DEFAULT_CAPACITY);
    data.copy(b.buffer);
    b.offset = 0;
    b.limit = data.length;
    return b;
  }

  static fromBinary(str, _endian = LITTLE_ENDIAN) {
    const data = Buffer.from(str, "binary");
    const b = new ByteBuffer(data.length || DEFAULT_CAPACITY);
    data.copy(b.buffer);
    b.offset = 0;
    b.limit = data.length;
    return b;
  }

  static fromBuffer(buf) {
    const b = new ByteBuffer(buf.length || DEFAULT_CAPACITY);
    Buffer.from(buf).copy(b.buffer);
    b.offset = 0;
    b.limit = buf.length;
    return b;
  }

  // --- unsigned integer read/write ---
  readUint8() {
    const v = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }
  writeUint8(v) {
    this.buffer = ensureCapacity(this.buffer, this.offset + 1);
    this.buffer.writeUInt8(v & 0xff, this.offset);
    this.offset += 1;
    return this;
  }

  readUint16() {
    const v = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }
  writeUint16(v) {
    this.buffer = ensureCapacity(this.buffer, this.offset + 2);
    this.buffer.writeUInt16LE(v & 0xffff, this.offset);
    this.offset += 2;
    return this;
  }

  readUint32() {
    const v = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  writeUint32(v) {
    this.buffer = ensureCapacity(this.buffer, this.offset + 4);
    this.buffer.writeUInt32LE(v >>> 0, this.offset);
    this.offset += 4;
    return this;
  }

  readInt32() {
    const v = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  writeInt32(v) {
    this.buffer = ensureCapacity(this.buffer, this.offset + 4);
    this.buffer.writeInt32LE(v | 0, this.offset);
    this.offset += 4;
    return this;
  }

  // --- 64-bit integers represented as BigInt ---
  readUint64() {
    const lo = this.buffer.readUInt32LE(this.offset);
    const hi = this.buffer.readUInt32LE(this.offset + 4);
    this.offset += 8;
    return (BigInt(hi) << 32n) | BigInt(lo);
  }
  writeUint64(v) {
    v = BigInt(v);
    v = v & 0xffffffffffffffffn;
    const lo = Number(v & 0xffffffffn);
    const hi = Number((v >> 32n) & 0xffffffffn);
    this.buffer = ensureCapacity(this.buffer, this.offset + 8);
    this.buffer.writeUInt32LE(lo, this.offset);
    this.buffer.writeUInt32LE(hi, this.offset + 4);
    this.offset += 8;
    return this;
  }

  readInt64() {
    const lo = this.buffer.readUInt32LE(this.offset);
    const hi = this.buffer.readInt32LE(this.offset + 4);
    this.offset += 8;
    return (BigInt(hi) << 32n) | BigInt(lo);
  }
  writeInt64(v) {
    v = BigInt(v);
    v = v & 0xffffffffffffffffn;
    const lo = Number(v & 0xffffffffn);
    const hiRaw = (v >> 32n) & 0xffffffffn;
    const hi = hiRaw > 0x7fffffffn ? Number(hiRaw - 0x100000000n) : Number(hiRaw);
    this.buffer = ensureCapacity(this.buffer, this.offset + 8);
    this.buffer.writeUInt32LE(lo, this.offset);
    this.buffer.writeInt32LE(hi, this.offset + 4);
    this.offset += 8;
    return this;
  }

  // --- varint32: unsigned-LEB128 over the 32-bit two's complement value ---
  readVarint32() {
    let result = 0;
    let shift = 0;
    let b;
    do {
      b = this.buffer[this.offset++];
      result |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    // interpret as signed 32-bit
    result >>>= 0;
    if (result > 0x7fffffff) result -= 0x100000000;
    return result;
  }
  writeVarint32(value) {
    value |= 0;
    value >>>= 0; // unsigned 32-bit
    do {
      let b = value & 0x7f;
      value >>>= 7;
      if (value !== 0) b |= 0x80;
      this.buffer = ensureCapacity(this.buffer, this.offset + 1);
      this.buffer[this.offset++] = b;
    } while (value !== 0);
    return this;
  }

  // --- varint64: unsigned-LEB128 over the 64-bit unsigned magnitude ---
  readVarint64() {
    let part0 = 0;
    let part1 = 0;
    let part2 = 0;
    let b;
    b = this.buffer[this.offset++]; part0 = b & 0x7f;
    if (b & 0x80) {
      b = this.buffer[this.offset++]; part0 |= (b & 0x7f) << 7;
      if (b & 0x80) {
        b = this.buffer[this.offset++]; part0 |= (b & 0x7f) << 14;
        if (b & 0x80) {
          b = this.buffer[this.offset++]; part0 |= (b & 0x7f) << 21;
          if (b & 0x80) {
            b = this.buffer[this.offset++]; part1 = b & 0x7f;
            if (b & 0x80) {
              b = this.buffer[this.offset++]; part1 |= (b & 0x7f) << 7;
              if (b & 0x80) {
                b = this.buffer[this.offset++]; part1 |= (b & 0x7f) << 14;
                if (b & 0x80) {
                  b = this.buffer[this.offset++]; part1 |= (b & 0x7f) << 21;
                  if (b & 0x80) {
                    b = this.buffer[this.offset++]; part2 = b & 0x7f;
                    if (b & 0x80) {
                      b = this.buffer[this.offset++]; part2 |= (b & 0x7f) << 7;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    // reconstruct the signed 64-bit value (matches Long.fromBits with unsigned=false)
    let value = BigInt(part0) | (BigInt(part1) << 28n) | (BigInt(part2) << 56n);
    // sign extend if the top bit is set (since read produces a signed Long)
    if (part2 & 0x80) value -= 1n << 64n;
    return value;
  }
  writeVarint64(value) {
    value = BigInt(value);
    if (value < 0n) value += 1n << 64n; // wrap to unsigned 64-bit magnitude
    value &= 0xffffffffffffffffn;
    do {
      let chunk = Number(value & 0x7fn);
      value >>= 7n;
      if (value !== 0n) chunk |= 0x80;
      this.buffer = ensureCapacity(this.buffer, this.offset + 1);
      this.buffer[this.offset++] = chunk;
    } while (value !== 0n);
    return this;
  }

  // --- buffer operations ---
  copy(begin, end) {
    begin = begin === undefined ? 0 : begin;
    end = end === undefined ? this.offset : end;
    const slice = Buffer.from(this.buffer.subarray(begin, end));
    const b = new ByteBuffer(slice.length || DEFAULT_CAPACITY);
    slice.copy(b.buffer);
    b.offset = slice.length;
    b.limit = slice.length;
    return b;
  }

  skip(n) {
    this.offset += n;
    return this;
  }

  append(buffer, encoding) {
    let src;
    if (Buffer.isBuffer(buffer)) {
      src = buffer;
    } else if (typeof buffer === "string" && encoding === "binary") {
      src = Buffer.from(buffer, "latin1");
    } else {
      src = Buffer.from(buffer, encoding);
    }
    this.buffer = ensureCapacity(this.buffer, this.offset + src.length);
    src.copy(this.buffer, this.offset);
    this.offset += src.length;
    return this;
  }

  flip() {
    this.limit = this.offset;
    this.offset = 0;
    return this;
  }

  toBinary() {
    return this.buffer.subarray(0, this.offset).toString("binary");
  }

  toHex() {
    return this.buffer.subarray(0, this.offset).toString("hex");
  }

  toString(encoding) {
    return this.buffer.subarray(0, this.offset).toString(encoding);
  }

  printDebug() {
    // no-op compatibility shim
  }
}

export default ByteBuffer;
export { DEFAULT_CAPACITY, LITTLE_ENDIAN };
