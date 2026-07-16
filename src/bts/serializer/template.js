/**
 * Console print any transaction object with zero default values.
 *
 * Ported from bitsharesjs `lib/serializer/src/template.js`.
 * Modernized: ES module, native methods, no external dependencies.
 */

export default function template(op) {
  const object = op.toObject(void 0, { use_default: true, annotate: true });

  // visual (with descriptions)
  console.error(JSON.stringify(object, null, 4));

  // usable in a copy-paste
  const copy = op.toObject(void 0, { use_default: true, annotate: false });

  // copy-paste one-liner
  console.error(JSON.stringify(copy));
}
