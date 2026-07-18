import ByteBuffer from "./ByteBuffer.js";
import { Buffer } from "buffer";

/**
 * Wrap a serializer `type` with hex/binary/buffer (de)serialization helpers.
 *
 * Ported from bitsharesjs `lib/serializer/src/convert.js`.
 * Modernized: uses the local `ByteBuffer` (drop-in for the `bytebuffer`
 * package) and native `Buffer` instead of `safe-buffer`. No new deps.
 */

export default function convert(type) {
  return {
    fromHex(hex) {
      const b = ByteBuffer.fromHex(hex, ByteBuffer.LITTLE_ENDIAN);
      return type.fromByteBuffer(b);
    },

    toHex(object) {
      const b = toByteBuffer(type, object);
      return b.toHex();
    },

    fromBuffer(buffer) {
      const b = ByteBuffer.fromBinary(
        Buffer.from(buffer).toString("binary"),
        ByteBuffer.LITTLE_ENDIAN
      );
      return type.fromByteBuffer(b);
    },

    toBuffer(object) {
      return Buffer.from(toByteBuffer(type, object).toBinary(), "binary");
    },

    fromBinary(string) {
      const b = ByteBuffer.fromBinary(string, ByteBuffer.LITTLE_ENDIAN);
      return type.fromByteBuffer(b);
    },

    toBinary(object) {
      return toByteBuffer(type, object).toBinary();
    },
  };
}

const toByteBuffer = function (type, object) {
  const b = new ByteBuffer(
    ByteBuffer.DEFAULT_CAPACITY,
    ByteBuffer.LITTLE_ENDIAN
  );
  type.appendByteBuffer(b, object);
  return b.copy(0, b.offset);
};
