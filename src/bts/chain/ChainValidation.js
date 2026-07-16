/**
 * Account names may contain one or more names separated by a dot.
 * Each name needs to start with a letter and may contain
 * numbers, or well placed dashes.
 * @see is_valid_name graphene/libraries/chain/protocol/account.cpp
 *
 * Ported from bitsharesjs `lib/chain/src/ChainValidation.js`.
 * Modernized: ES module, native methods, no external dependencies.
 */

const id_regex = /\b\d+\.\d+\.(\d+)\b/;

const chainValidation = {
  is_account_name(value, allow_too_short = false) {
    if (chainValidation.is_empty(value)) {
      return false;
    }

    const length = value.length;

    if ((!allow_too_short && length < 3) || length > 63) {
      return false;
    }

    const ref = value.split(".");

    for (let i = 0; i < ref.length; i++) {
      const label = ref[i];

      if (
        !(
          /^[a-z][a-z0-9-]*$/.test(label) &&
          !/--/.test(label) &&
          /[a-z0-9]$/.test(label)
        )
      ) {
        return false;
      }
    }
    return true;
  },

  is_object_id(obj_id) {
    if ("string" != typeof obj_id) return false;

    const match = id_regex.exec(obj_id);
    return match !== null && obj_id.split(".").length === 3;
  },

  is_empty(value) {
    return value == null || value.length === 0;
  },

  is_account_name_error(value, allow_too_short = false) {
    let suffix = "Account name should ";
    if (chainValidation.is_empty(value)) {
      return suffix + "not be empty.";
    }
    const length = value.length;
    if (!allow_too_short && length < 3) {
      return suffix + "be longer.";
    }
    if (length > 63) {
      return suffix + "be shorter.";
    }
    if (/\./.test(value)) {
      suffix = "Each account segment should ";
    }
    const ref = value.split(".");
    for (let i = 0; i < ref.length; i++) {
      const label = ref[i];
      if (!/^[~a-z]/.test(label)) {
        return suffix + "start with a letter.";
      }
      if (!/^[~a-z0-9-]*$/.test(label)) {
        return suffix + "have only letters, digits, or dashes.";
      }
      if (/--/.test(label)) {
        return suffix + "have only one dash in a row.";
      }
      if (!/[a-z0-9]$/.test(label)) {
        return suffix + "end with a letter or digit.";
      }
      if (!(label.length >= 3)) {
        return suffix + "be longer";
      }
    }
    return null;
  },

  is_cheap_name(account_name) {
    return /[0-9-]/.test(account_name) || !/[aeiouy]/.test(account_name);
  },

  is_empty_user_input(value) {
    if (chainValidation.is_empty(value)) {
      return true;
    }
    if ((value + "").trim() === "") {
      return true;
    }
    return false;
  },

  required(value, field_name = "") {
    if (chainValidation.is_empty(value)) {
      throw new Error("value required for " + field_name + ": " + value);
    }
    return value;
  },

  /** @see is_valid_symbol graphene/libraries/chain/protocol/asset_ops.cpp */
  is_valid_symbol_error(value) {
    const suffix = "Asset name should ";
    if (chainValidation.is_empty(value)) {
      return suffix + "not be empty.";
    }
    if (value.split(".").length > 2) {
      return suffix + "have only one dot.";
    }
    if (value.length < 3) {
      return suffix + "be longer.";
    }
    if (value.length > 16) {
      return suffix + "be shorter.";
    }
    if (!/^[A-Z]/.test(value)) {
      return suffix + "start with a letter";
    }
    if (!/[A-Z0-9]$/.test(value)) {
      return suffix + "end with a letter or number";
    }
    if (/^[A-Z0-9\.]$/.test(value)) {
      return suffix + "contain only letters numbers and perhaps a dot.";
    }
    return null;
  },
};

export default chainValidation;
