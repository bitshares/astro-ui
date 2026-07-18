/**
 * Transaction helper utilities, ported from bitsharesjs
 * `lib/chain/src/TransactionHelper.js`.
 *
 * Modernized:
 *  - `secure-random` -> `node:crypto` randomBytes
 *  - `bytebuffer.Long` -> native BigInt (the local ByteBuffer already uses
 *    native BigInt for 64-bit values)
 *  - imports from local `src/bts` modules (no external deps)
 */

import { randomBytes } from "node:crypto";

import { Signature } from "../ecc";
import { ops } from "../serializer";
import { Apis } from "../ws";

var helper = {};

helper.unique_nonce_entropy = null;
helper.unique_nonce_uint64 = function () {
  var entropy = (helper.unique_nonce_entropy = (() => {
    if (helper.unique_nonce_entropy === null) {
      return randomBytes(1)[0];
    } else {
      return ++helper.unique_nonce_entropy % 256;
    }
  })());
  // Date.now() fits comfortably in 56 bits; shift left 8 and OR the entropy.
  var long = BigInt(Date.now());
  long = (long << 8n) | BigInt(entropy);
  return long.toString();
};

/* Todo, set fees */
helper.to_json = function (tr, broadcast = false) {
  return (function (tr, broadcast) {
    var tr_object = ops.signed_transaction.toObject(tr);
    if (broadcast) {
      var net = Apis.instance().network_api();
      console.log("... tr_object", JSON.stringify(tr_object));
      return net.exec("broadcast_transaction", [tr_object]);
    } else {
      return tr_object;
    }
  })(tr, broadcast);
};

helper.signed_tr_json = function (tr, private_keys) {
  var tr_buffer = ops.transaction.toBuffer(tr);
  tr = ops.transaction.toObject(tr);
  tr.signatures = (() => {
    var result = [];
    for (
      var i = 0;
      0 < private_keys.length
        ? i < private_keys.length
        : i > private_keys.length;
      0 < private_keys.length ? i++ : i++
    ) {
      var private_key = private_keys[i];
      result.push(Signature.signBuffer(tr_buffer, private_key).toHex());
    }
    return result;
  })();
  return tr;
};

helper.expire_in_min = function (min) {
  return Math.round(Date.now() / 1000) + min * 60;
};

helper.seconds_from_now = function (timeout_sec) {
  return Math.round(Date.now() / 1000) + timeout_sec;
};

/**
 * Print to the console a JSON representation of any object in
 * @graphene/serializer { types }
 */
helper.template = function (
  serializer_operation_type_name,
  debug = { use_default: true, annotate: true }
) {
  var so = ops[serializer_operation_type_name];
  if (!so) {
    throw new Error(
      `unknown serializer_operation_type ${serializer_operation_type_name}`
    );
  }
  return so.toObject(undefined, debug);
};

helper.new_operation = function (serializer_operation_type_name) {
  var so = ops[serializer_operation_type_name];
  if (!so) {
    throw new Error(
      `unknown serializer_operation_type ${serializer_operation_type_name}`
    );
  }
  var object = so.toObject(undefined, { use_default: true, annotate: true });
  return so.fromObject(object);
};

helper.instance = function (ObjectId) {
  return ObjectId.substring("0.0.".length);
};

export default helper;
