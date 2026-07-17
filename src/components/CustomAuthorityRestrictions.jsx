import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Plus,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// BSIP-40 restriction metadata
// ---------------------------------------------------------------------------
//
// A restriction is a tuple:
//   { member_index, restriction_type, argument: [type_tag, value], extensions: [] }
//
// - member_index  : index of a field on the target operation
// - restriction_type : the comparison/logic function (enum below)
// - argument      : a static_variant [type_tag, value]; type_tag indexes into
//                   the argument variant list defined by the chain serializer.
//
// The heavy serialization is performed by the external Beet wallet; this module
// only has to emit the correct JSON shape.

// restriction_type (function) enum
export const RESTRICTION_TYPES = [
  { value: 0, key: "eq", takesArg: true, argCardinality: "single" },
  { value: 1, key: "ne", takesArg: true, argCardinality: "single" },
  { value: 2, key: "lt", takesArg: true, argCardinality: "single" },
  { value: 3, key: "le", takesArg: true, argCardinality: "single" },
  { value: 4, key: "gt", takesArg: true, argCardinality: "single" },
  { value: 5, key: "ge", takesArg: true, argCardinality: "single" },
  { value: 6, key: "in", takesArg: true, argCardinality: "set" },
  { value: 7, key: "not_in", takesArg: true, argCardinality: "set" },
  { value: 8, key: "has_all", takesArg: true, argCardinality: "set" },
  { value: 9, key: "has_none", takesArg: true, argCardinality: "set" },
  { value: 10, key: "attr", takesArg: false, nested: "list" },
  { value: 11, key: "logical_or", takesArg: false, nested: "branches" },
  { value: 12, key: "variant_assert", takesArg: false, nested: "variant" },
];

export const RESTRICTION_TYPE_BY_VALUE = Object.fromEntries(
  RESTRICTION_TYPES.map((r) => [r.value, r])
);

// argument static_variant tag for void_result (index 0). Used to pin a member
// to "none" (eq + void) so an authorized party cannot set it.
const VOID_ARG_TAG = 0;

// argument static_variant type tags (from src/bts/serializer/operations.js).
// Only the commonly useful primitive/container tags are surfaced in the UI.
// "single" tags are for eq/ne/lt/le/gt/ge; the matching "+20" tag is the set
// form used by in/not_in/has_all/has_none.
export const ARG_TYPES = [
  { single: 1, set: 20, key: "bool", input: "bool" },
  { single: 2, set: 21, key: "int64", input: "number" },
  { single: 3, set: 22, key: "string", input: "text" },
  { single: 4, set: 23, key: "time", input: "datetime" },
  { single: 5, set: 24, key: "public_key", input: "text" },
  { single: 7, set: 26, key: "account_id", input: "text" },
  { single: 8, set: 27, key: "asset_id", input: "text" },
  { single: 0, set: 0, key: "void", input: "void" },
];

export const ARG_TYPE_BY_SINGLE = Object.fromEntries(
  ARG_TYPES.map((a) => [a.single, a])
);

// Per-operation field maps (member_index -> field metadata).
// argKey chooses the default argument type for that field.
// kind: "mandatory" | "optional" | "extensions"
//   optional members SHOULD be pinned to void (eq + void) if the authorizing
//   party does not want the authorized party to set them (BSIP-40 precaution).
//   extensions members cannot be forced to void as a whole; each sub-member
//   must be individually restricted, so we flag them for a warning.
export const OP_FIELDS = {
  // transfer_operation
  0: [
    { index: 1, key: "from", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "to", argKey: "account_id", kind: "mandatory" },
    { index: 3, key: "amount", argKey: "asset", isAsset: true, kind: "mandatory" },
    { index: 4, key: "memo", argKey: "void", kind: "optional" },
    { index: 5, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // limit_order_create_operation
  1: [
    { index: 1, key: "seller", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "amount_to_sell", argKey: "asset", isAsset: true, kind: "mandatory" },
    { index: 3, key: "min_to_receive", argKey: "asset", isAsset: true, kind: "mandatory" },
    { index: 6, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // limit_order_cancel_operation
  2: [
    { index: 1, key: "fee_paying_account", argKey: "account_id", kind: "mandatory" },
    { index: 3, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // call_order_update_operation
  3: [
    { index: 1, key: "funding_account", argKey: "account_id", kind: "mandatory" },
    { index: 4, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // account_create_operation
  5: [{ index: 1, key: "registrar", argKey: "account_id", kind: "mandatory" }],
  // account_update_operation (broad + flexible — see OP_META)
  6: [
    { index: 1, key: "account", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "owner", argKey: "void", kind: "optional" },
    { index: 3, key: "active", argKey: "void", kind: "optional" },
    { index: 4, key: "new_options", argKey: "void", kind: "optional" },
    { index: 5, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // asset_issue_operation
  14: [
    { index: 1, key: "issuer", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "asset_to_issue", argKey: "asset", isAsset: true, kind: "mandatory" },
    { index: 3, key: "issue_to_account", argKey: "account_id", kind: "mandatory" },
    { index: 5, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // asset_publish_feed_operation
  19: [
    { index: 1, key: "publisher", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "asset_id", argKey: "asset_id", kind: "mandatory" },
    { index: 4, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // witness_update_operation
  21: [
    { index: 2, key: "witness_account", argKey: "account_id", kind: "mandatory" },
    { index: 3, key: "new_url", argKey: "void", kind: "optional" },
    { index: 4, key: "new_signing_key", argKey: "public_key", kind: "optional" },
  ],
  // vesting_balance_create_operation
  32: [
    { index: 1, key: "creator", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "owner", argKey: "account_id", kind: "mandatory" },
  ],
  // override_transfer_operation
  38: [
    { index: 1, key: "issuer", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "from", argKey: "account_id", kind: "mandatory" },
    { index: 3, key: "to", argKey: "account_id", kind: "mandatory" },
    { index: 4, key: "amount", argKey: "asset", isAsset: true, kind: "mandatory" },
    { index: 5, key: "extensions", argKey: "void", kind: "extensions" },
  ],
  // htlc_create_operation
  49: [
    { index: 1, key: "from", argKey: "account_id", kind: "mandatory" },
    { index: 2, key: "to", argKey: "account_id", kind: "mandatory" },
    { index: 6, key: "extensions", argKey: "void", kind: "extensions" },
  ],
};

// Per-operation advisories. `broad` flags operations that are powerful/flexible
// enough that they should be tightly restricted (BSIP-40 precautions).
export const OP_META = {
  6: { broad: true }, // account_update_operation (e.g. voting key use)
  38: { broad: true }, // override_transfer_operation
};

// Named-key templates from BSIP-40's Motivation section. The spec suggests the
// UI offer purpose-built keys ("Create Trading Key", etc.). Each template is
// scoped to a single operation_type (the primary op for that key) and seeds
// sensible starter restrictions; the user fills in specifics (accounts/assets).
//
//   Trading Key       -> limit_order_create (markets restricted by the user)
//   Withdrawal Key    -> transfer (recipient pinned; user sets `to`)
//   Cold Storage Key  -> transfer (only move funds to the hot wallet; `to`)
//   Faucet Key        -> account_create (no restriction needed)
//   Witness Key       -> witness_update (signing key) + asset_publish_feed
//   Proposal Update   -> proposal_update (2FA use case)
export const TEMPLATES = [
  // Trading Key: limit orders. Leave markets open for the user to restrict via
  // amount_to_sell / min_to_receive asset_id restrictions.
  {
    key: "trading_key",
    opType: 1,
    build: () => [],
  },
  // Withdrawal Key: allow another account to transfer funds to itself.
  // Seed a `to eq <account>` the user completes.
  {
    key: "withdrawal_key",
    opType: 0,
    build: () => [
      makeRestriction({ member_index: 2, restriction_type: 0, argTag: 7, value: "" }),
      makeRestriction({ member_index: 4, restriction_type: 0, argTag: VOID_ARG_TAG, value: {} }),
    ],
  },
  // Cold Storage Key: only allow moving funds to the hot wallet. Pin `to` to a
  // single account (the hot wallet) and prohibit the memo.
  {
    key: "cold_storage_key",
    opType: 0,
    build: () => [
      makeRestriction({ member_index: 2, restriction_type: 0, argTag: 7, value: "" }),
      makeRestriction({ member_index: 4, restriction_type: 0, argTag: VOID_ARG_TAG, value: {} }),
    ],
  },
  // Faucet Key: only allow account creation. No argument restriction required.
  {
    key: "faucet_key",
    opType: 5,
    build: () => [],
  },
  // Witness Key (signing): update signing key only; prohibit changing the URL.
  {
    key: "witness_key",
    opType: 21,
    build: () => [
      makeRestriction({ member_index: 3, restriction_type: 0, argTag: VOID_ARG_TAG, value: {} }),
    ],
  },
  // Witness Key (feeds): publish price feed for a specific asset.
  {
    key: "witness_feed_key",
    opType: 19,
    build: () => [
      makeRestriction({ member_index: 2, restriction_type: 0, argTag: 8, value: "" }),
    ],
  },
  // Proposal Update Key: approve/reject proposals (e.g. 2FA). No argument
  // restriction by default.
  {
    key: "proposal_update_key",
    opType: 23,
    build: () => [],
  },
];

// ---------------------------------------------------------------------------
// Restriction factory helpers
// ---------------------------------------------------------------------------

export function makeRestriction({
  member_index = 0,
  restriction_type = 0,
  argTag = 7,
  value = "",
} = {}) {
  return {
    member_index: Number(member_index),
    restriction_type: Number(restriction_type),
    argument: [Number(argTag), value],
    extensions: [],
  };
}

function defaultArgTagFor(field, rtype) {
  const argMeta =
    ARG_TYPES.find((a) => a.key === (field?.argKey ?? "account_id")) ??
    ARG_TYPE_BY_SINGLE[7];
  const cardinality = RESTRICTION_TYPE_BY_VALUE[rtype]?.argCardinality;
  return cardinality === "set" ? argMeta.set : argMeta.single;
}

// Convert a UI restriction row into the on-chain argument shape.
function coerceValue(argTag, raw) {
  // void_result (tag 0) is an empty struct — it must serialize as {} so the
  // wallet encodes an absent/none value (used to pin optional members off).
  if (Number(argTag) === VOID_ARG_TAG) return {};
  const meta = ARG_TYPE_BY_SINGLE[argTag] ?? ARG_TYPE_BY_SINGLE[argTag - 20];
  const input = meta?.input;
  if (Array.isArray(raw)) {
    return raw.map((v) => coerceScalar(input, v));
  }
  return coerceScalar(input, raw);
}

function coerceScalar(input, raw) {
  if (input === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (input === "bool") return raw === true || raw === "true";
  if (input === "datetime") return raw;
  return raw;
}

// Normalize the whole restriction tree into broadcast-ready JSON.
export function normalizeRestrictions(rows) {
  return (rows || []).map((row) => normalizeRestriction(row));
}

function normalizeRestriction(row) {
  const rtype = Number(row.restriction_type);
  const meta = RESTRICTION_TYPE_BY_VALUE[rtype];

  if (meta?.nested === "list") {
    // attr: argument is [39, [member_index, [nested restrictions]]]
    return {
      member_index: Number(row.member_index),
      restriction_type: rtype,
      argument: [
        39,
        [Number(row.member_index), normalizeRestrictions(row.children)],
      ],
      extensions: [],
    };
  }

  if (meta?.nested === "branches") {
    // logical_or: argument is [40, [[branch restrictions], ...]]
    return {
      member_index: Number(row.member_index),
      restriction_type: rtype,
      argument: [
        40,
        (row.branches || []).map((branch) => normalizeRestrictions(branch)),
      ],
      extensions: [],
    };
  }

  if (meta?.nested === "variant") {
    // variant_assert: argument is [41, [variant_tag, [nested restrictions]]]
    return {
      member_index: Number(row.member_index),
      restriction_type: rtype,
      argument: [
        41,
        [Number(row.variant_tag) || 0, normalizeRestrictions(row.children)],
      ],
      extensions: [],
    };
  }

  const argTag = Number(row.argument?.[0] ?? 7);
  return {
    member_index: Number(row.member_index),
    restriction_type: rtype,
    argument: [argTag, coerceValue(argTag, row.argument?.[1])],
    extensions: [],
  };
}

// ---------------------------------------------------------------------------
// Advanced JSON validation
// ---------------------------------------------------------------------------
//
// Structural sanity checks for hand-authored restriction JSON. This is not a
// full chain-side validation — it catches the common mistakes (wrong shape,
// out-of-range enums, malformed argument variant) before broadcast.

const MAX_RESTRICTION_TYPE = 12;
// Highest argument static_variant tag defined by the chain serializer.
const MAX_ARG_TAG = 41;

// Returns { ok: true } or { ok: false, key, params } where key is an i18n key.
export function validateRestrictionsJSON(parsed) {
  if (!Array.isArray(parsed)) {
    return { ok: false, key: "vErrNotArray" };
  }
  for (let i = 0; i < parsed.length; i++) {
    const res = validateOneRestriction(parsed[i], `[${i}]`);
    if (!res.ok) return res;
  }
  return { ok: true };
}

function validateOneRestriction(r, path) {
  if (r === null || typeof r !== "object" || Array.isArray(r)) {
    return { ok: false, key: "vErrNotObject", params: { path } };
  }

  if (!Number.isInteger(r.member_index) || r.member_index < 0) {
    return { ok: false, key: "vErrMemberIndex", params: { path } };
  }

  if (
    !Number.isInteger(r.restriction_type) ||
    r.restriction_type < 0 ||
    r.restriction_type > MAX_RESTRICTION_TYPE
  ) {
    return { ok: false, key: "vErrRestrictionType", params: { path } };
  }

  if (!Array.isArray(r.argument) || r.argument.length !== 2) {
    return { ok: false, key: "vErrArgumentShape", params: { path } };
  }

  const [tag, value] = r.argument;
  if (!Number.isInteger(tag) || tag < 0 || tag > MAX_ARG_TAG) {
    return { ok: false, key: "vErrArgTag", params: { path } };
  }

  // extensions, when present, must be an array (set of future_extensions).
  if (r.extensions !== undefined && !Array.isArray(r.extensions)) {
    return { ok: false, key: "vErrExtensions", params: { path } };
  }

  // Nested arguments carry restriction lists — recurse to catch bad shapes.
  // tag 39 = vector<restriction>            (attribute_assert)
  // tag 40 = vector<vector<restriction>>    (logical_or)
  // tag 41 = pair<int64, vector<restriction>> (variant_assert)
  if (tag === 39) {
    // value = [member_index, [restrictions]]
    if (!Array.isArray(value) || value.length !== 2 || !Array.isArray(value[1])) {
      return { ok: false, key: "vErrAttrShape", params: { path } };
    }
    return validateNested(value[1], path);
  }
  if (tag === 40) {
    // value = [[restrictions], [restrictions], ...]
    if (!Array.isArray(value)) {
      return { ok: false, key: "vErrOrShape", params: { path } };
    }
    for (let b = 0; b < value.length; b++) {
      if (!Array.isArray(value[b])) {
        return { ok: false, key: "vErrOrShape", params: { path } };
      }
      const nested = validateNested(value[b], `${path}[or:${b}]`);
      if (!nested.ok) return nested;
    }
    return { ok: true };
  }
  if (tag === 41) {
    // value = [variant_tag, [restrictions]]
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !Number.isInteger(value[0]) ||
      !Array.isArray(value[1])
    ) {
      return { ok: false, key: "vErrVariantShape", params: { path } };
    }
    return validateNested(value[1], path);
  }

  return { ok: true };
}

function validateNested(list, path) {
  for (let i = 0; i < list.length; i++) {
    const res = validateOneRestriction(list[i], `${path}.${i}`);
    if (!res.ok) return res;
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Coverage analysis (BSIP-40 precautions)
// ---------------------------------------------------------------------------
//
// Any operation member without a restriction can be freely set by the
// authorized party. This computes, for the selected operation, which known
// members are covered by at least one top-level restriction, and whether
// optional members are correctly pinned to void (eq + void argument).

function isVoidPin(row) {
  return (
    Number(row.restriction_type) === 0 &&
    Number(row.argument?.[0]) === VOID_ARG_TAG
  );
}

export function analyzeCoverage(rows, opType) {
  const fields = OP_FIELDS[Number(opType)] ?? [];
  const covered = new Set(
    (rows || []).map((r) => Number(r.member_index))
  );

  const items = fields.map((f) => {
    const isCovered = covered.has(f.index);
    const row = (rows || []).find(
      (r) => Number(r.member_index) === f.index
    );
    return {
      ...f,
      covered: isCovered,
      // optional members are only "safe" when pinned to void
      voidPinned: Boolean(row && isVoidPin(row)),
    };
  });

  const uncoveredMandatory = items.filter(
    (i) => i.kind === "mandatory" && !i.covered
  );
  const unpinnedOptional = items.filter(
    (i) => i.kind === "optional" && !i.voidPinned
  );
  const extensionsFields = items.filter((i) => i.kind === "extensions");
  const uncoveredExtensions = extensionsFields.filter((i) => !i.covered);

  return {
    items,
    hasFields: fields.length > 0,
    uncoveredMandatory,
    unpinnedOptional,
    extensionsFields,
    uncoveredExtensions,
    broad: Boolean(OP_META[Number(opType)]?.broad),
  };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const BOX = "rounded-xl border border-border bg-accent/20 p-3 space-y-2";
const SUBTLE_LABEL =
  "text-[10px] uppercase tracking-wider text-muted-foreground/70";

function fieldOptions(opType) {
  return OP_FIELDS[opType] ?? [];
}

function RestrictionRow({ row, opType, depth, t, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const rtypeMeta = RESTRICTION_TYPE_BY_VALUE[Number(row.restriction_type)];
  const fields = fieldOptions(opType);
  const isNested = Boolean(rtypeMeta?.nested);

  const setMemberIndex = (mi) => {
    const field = fields.find((f) => String(f.index) === String(mi));
    const nextTag = defaultArgTagFor(field, Number(row.restriction_type));
    onChange({
      ...row,
      member_index: Number(mi),
      argument: [nextTag, Array.isArray(row.argument?.[1]) ? [] : ""],
    });
  };

  const setRType = (rt) => {
    const nextMeta = RESTRICTION_TYPE_BY_VALUE[Number(rt)];
    const next = { ...row, restriction_type: Number(rt) };
    if (nextMeta?.nested === "list" || nextMeta?.nested === "variant") {
      next.children = row.children ?? [];
    }
    if (nextMeta?.nested === "branches") {
      next.branches = row.branches ?? [[], []];
    }
    if (!nextMeta?.nested) {
      const field = fields.find(
        (f) => String(f.index) === String(row.member_index)
      );
      const tag = defaultArgTagFor(field, Number(rt));
      const isSet = nextMeta?.argCardinality === "set";
      next.argument = [tag, isSet ? [] : ""];
    }
    onChange(next);
  };

  const setArgTag = (tag) => {
    const isSet = RESTRICTION_TYPE_BY_VALUE[Number(row.restriction_type)]
      ?.argCardinality === "set";
    const nextValue =
      Number(tag) === VOID_ARG_TAG ? {} : isSet ? [] : "";
    onChange({ ...row, argument: [Number(tag), nextValue] });
  };

  const setValue = (val) => {
    onChange({ ...row, argument: [Number(row.argument?.[0] ?? 7), val] });
  };

  const argTag = Number(row.argument?.[0] ?? 7);
  const argMeta = ARG_TYPE_BY_SINGLE[argTag] ?? ARG_TYPE_BY_SINGLE[argTag - 20];
  const isSet = rtypeMeta?.argCardinality === "set";

  return (
    <div
      className="rounded-lg border border-border bg-card/60 p-2.5 space-y-2"
      style={{ marginLeft: depth ? 8 : 0 }}
    >
      <div className="flex items-center gap-2">
        {isNested ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}

        {/* Field (member_index) */}
        <div className="flex-1 min-w-0">
          <Select
            value={String(row.member_index)}
            onValueChange={setMemberIndex}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("CustomAuthorities:fieldPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {fields.length ? (
                fields.map((f) => (
                  <SelectItem key={f.index} value={String(f.index)}>
                    <span className="font-mono text-[10px] text-muted-foreground mr-2">
                      {f.index}
                    </span>
                    {t(`CustomAuthorities:field.${opType}.${f.key}`, {
                      defaultValue: f.key,
                    })}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="0">
                  <span className="font-mono text-[10px]">0</span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Function (restriction_type) */}
        <div className="w-[130px]">
          <Select
            value={String(row.restriction_type)}
            onValueChange={setRType}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESTRICTION_TYPES.map((rt) => (
                <SelectItem key={rt.value} value={String(rt.value)}>
                  {t(`CustomAuthorities:func.${rt.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Argument editor for comparison functions */}
      {!isNested ? (
        <div className="flex items-end gap-2 pl-1">
          <div className="w-[120px]">
            <Label className={SUBTLE_LABEL}>
              {t("CustomAuthorities:argTypeLabel")}
            </Label>
            <Select value={String(argTag)} onValueChange={setArgTag}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARG_TYPES.filter((a) =>
                  // "None (void)" only makes sense for equality checks on
                  // optional members (pin the member off). Hide it for set
                  // functions (in/not_in/has_*).
                  a.key === "void" ? !isSet : true
                ).map((a) => (
                  <SelectItem
                    key={a.key}
                    value={String(isSet ? a.set : a.single)}
                  >
                    {t(`CustomAuthorities:argType.${a.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {argMeta?.input === "void" ? (
            <div className="flex-1 text-[11px] text-muted-foreground pb-1.5">
              {t("CustomAuthorities:voidValueHint")}
            </div>
          ) : (
            <div className="flex-1">
              <Label className={SUBTLE_LABEL}>
                {t("CustomAuthorities:argValueLabel")}
              </Label>
              {isSet ? (
                <Textarea
                  className="font-mono text-xs min-h-[38px] h-9 py-1.5"
                  placeholder={t("CustomAuthorities:setValuePlaceholder")}
                  value={(row.argument?.[1] || []).join(", ")}
                  onChange={(e) =>
                    setValue(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              ) : (
                <Input
                  className="h-8 text-xs font-mono"
                  type={argMeta?.input === "number" ? "number" : "text"}
                  value={row.argument?.[1] ?? ""}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t(`CustomAuthorities:argType.${argMeta?.key}`)}
                />
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* variant_assert tag */}
      {rtypeMeta?.nested === "variant" ? (
        <div className="pl-1">
          <Label className={SUBTLE_LABEL}>
            {t("CustomAuthorities:variantTagLabel")}
          </Label>
          <Input
            className="h-8 text-xs w-24 font-mono"
            type="number"
            value={row.variant_tag ?? 0}
            onChange={(e) =>
              onChange({ ...row, variant_tag: Number(e.target.value) })
            }
          />
        </div>
      ) : null}

      {/* Nested children (attr / variant_assert) */}
      {open && (rtypeMeta?.nested === "list" || rtypeMeta?.nested === "variant") ? (
        <div className="pl-2 border-l border-[hsl(var(--accent-1)/0.25)] space-y-2">
          <RestrictionList
            rows={row.children ?? []}
            opType={opType}
            depth={depth + 1}
            t={t}
            onChange={(children) => onChange({ ...row, children })}
          />
        </div>
      ) : null}

      {/* Nested branches (logical_or) */}
      {open && rtypeMeta?.nested === "branches" ? (
        <div className="space-y-2">
          {(row.branches ?? []).map((branch, bIdx) => (
            <div
              key={bIdx}
              className="pl-2 border-l border-[hsl(var(--accent-3)/0.35)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("CustomAuthorities:branchLabel", { n: bIdx + 1 })}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
                  onClick={() =>
                    onChange({
                      ...row,
                      branches: row.branches.filter((_, i) => i !== bIdx),
                    })
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <RestrictionList
                rows={branch}
                opType={opType}
                depth={depth + 1}
                t={t}
                onChange={(next) => {
                  const branches = [...row.branches];
                  branches[bIdx] = next;
                  onChange({ ...row, branches });
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-[hsl(var(--accent-3)/0.35)]"
            onClick={() =>
              onChange({ ...row, branches: [...(row.branches ?? []), []] })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t("CustomAuthorities:addBranch")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RestrictionList({ rows, opType, depth, t, onChange }) {
  const addRow = () => {
    const fields = fieldOptions(opType);
    const field = fields[0];
    onChange([
      ...rows,
      makeRestriction({
        member_index: field?.index ?? 0,
        restriction_type: 0,
        argTag: field ? defaultArgTagFor(field, 0) : 7,
        value: "",
      }),
    ]);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <RestrictionRow
          key={idx}
          row={row}
          opType={opType}
          depth={depth}
          t={t}
          onChange={(next) => {
            const copy = [...rows];
            copy[idx] = next;
            onChange(copy);
          }}
          onRemove={() => onChange(rows.filter((_, i) => i !== idx))}
        />
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("CustomAuthorities:addRestriction")}
      </Button>
    </div>
  );
}

function CoveragePanel({ rows, opType, t, onPinVoid }) {
  const analysis = useMemo(
    () => analyzeCoverage(rows, opType),
    [rows, opType]
  );

  if (!analysis.hasFields) return null;

  const warnCount =
    analysis.uncoveredMandatory.length +
    analysis.unpinnedOptional.length +
    analysis.uncoveredExtensions.length +
    (analysis.broad ? 1 : 0);

  const allSafe = warnCount === 0;

  return (
    <div
      className={
        allSafe
          ? "rounded-lg border border-[hsl(var(--accent-success)/0.35)] bg-[hsl(var(--accent-success)/0.08)] p-2.5 space-y-2"
          : "rounded-lg border border-[hsl(var(--accent-warning)/0.4)] bg-[hsl(var(--accent-warning)/0.08)] p-2.5 space-y-2"
      }
    >
      <div className="flex items-center gap-2">
        {allSafe ? (
          <ShieldAlert className="h-4 w-4 text-[hsl(var(--accent-success-fg))]" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-[hsl(var(--accent-warning-fg))]" />
        )}
        <span className="text-xs font-semibold text-foreground">
          {t("CustomAuthorities:coverageTitle")}
        </span>
      </div>

      <div className="text-[11px] text-muted-foreground">
        {t("CustomAuthorities:coverageIntro")}
      </div>

      {/* Per-member coverage list */}
      <div className="space-y-1">
        {analysis.items.map((item) => {
          const safe =
            item.kind === "mandatory"
              ? item.covered
              : item.kind === "optional"
              ? item.voidPinned
              : item.covered;
          const label = t(`CustomAuthorities:field.${opType}.${item.key}`, {
            defaultValue: item.key,
          });
          return (
            <div
              key={item.index}
              className="flex items-center gap-2 text-[11px]"
            >
              {safe ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--accent-success-fg))] flex-shrink-0" />
              ) : item.kind === "extensions" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--accent-warning-fg))] flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-[hsl(var(--accent-warning-fg))] flex-shrink-0" />
              )}
              <span className="font-mono text-[10px] text-muted-foreground w-4">
                {item.index}
              </span>
              <span className="flex-1 truncate text-foreground/80">
                {label}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {t(`CustomAuthorities:kind.${item.kind}`)}
              </span>
              {!safe && item.kind === "optional" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => onPinVoid(item.index)}
                >
                  {t("CustomAuthorities:pinVoid")}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Advisories */}
      {!allSafe ? (
        <div className="space-y-1 pt-1 border-t border-border/60">
          {analysis.uncoveredMandatory.length ? (
            <div className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
              {t("CustomAuthorities:warnUncoveredMandatory", {
                fields: analysis.uncoveredMandatory
                  .map((f) =>
                    t(`CustomAuthorities:field.${opType}.${f.key}`, {
                      defaultValue: f.key,
                    })
                  )
                  .join(", "),
              })}
            </div>
          ) : null}
          {analysis.unpinnedOptional.length ? (
            <div className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
              {t("CustomAuthorities:warnUnpinnedOptional", {
                fields: analysis.unpinnedOptional
                  .map((f) =>
                    t(`CustomAuthorities:field.${opType}.${f.key}`, {
                      defaultValue: f.key,
                    })
                  )
                  .join(", "),
              })}
            </div>
          ) : null}
          {analysis.uncoveredExtensions.length ? (
            <div className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
              {t("CustomAuthorities:warnExtensions")}
            </div>
          ) : null}
          {analysis.broad ? (
            <div className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
              {t("CustomAuthorities:warnBroadOp")}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[11px] text-[hsl(var(--accent-success-fg))] pt-1 border-t border-border/60">
          {t("CustomAuthorities:coverageAllSafe")}
        </div>
      )}
    </div>
  );
}

export function RestrictionBuilder({
  restrictions,
  opType,
  t,
  onChange,
  label,
  hint,
}) {
  const templates = useMemo(
    () => TEMPLATES.filter((tpl) => tpl.opType === Number(opType)),
    [opType]
  );
  const [advanced, setAdvanced] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");

  const openAdvanced = () => {
    setJsonText(JSON.stringify(normalizeRestrictions(restrictions), null, 2));
    setJsonError("");
    setAdvanced(true);
  };

  const applyAdvanced = () => {
    if (!jsonText.trim()) {
      onChange([]);
      setJsonError("");
      setAdvanced(false);
      return;
    }

    // 1. Must be valid JSON.
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setJsonError(t("CustomAuthorities:invalidRestrictionsJson"));
      return;
    }

    // 2. Must be a well-formed array of restriction objects.
    const check = validateRestrictionsJSON(parsed);
    if (!check.ok) {
      setJsonError(t(`CustomAuthorities:${check.key}`, check.params));
      return;
    }

    setJsonError("");
    onChange(parsed);
    setAdvanced(false);
  };

  // Pin an optional member to void (eq + void argument) so an authorized party
  // cannot set it — the BSIP-40 way to prohibit an optional member.
  const pinVoid = (memberIndex) => {
    const withoutExisting = restrictions.filter(
      (r) => Number(r.member_index) !== Number(memberIndex)
    );
    onChange([
      ...withoutExisting,
      makeRestriction({
        member_index: memberIndex,
        restriction_type: 0,
        argTag: VOID_ARG_TAG,
        value: {},
      }),
    ]);
  };

  return (
    <div className={BOX}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{label}</Label>
        <div className="flex items-center gap-1.5">
          {templates.length ? (
            <Select
              value=""
              onValueChange={(k) => {
                const tpl = templates.find((x) => x.key === k);
                if (tpl) onChange(tpl.build());
              }}
            >
              <SelectTrigger className="h-7 w-[150px] text-xs gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent-1-fg))]" />
                <SelectValue
                  placeholder={t("CustomAuthorities:templatesPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.key} value={tpl.key}>
                    {t(`CustomAuthorities:template.${tpl.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => (advanced ? setAdvanced(false) : openAdvanced())}
          >
            {advanced
              ? t("CustomAuthorities:builderMode")
              : t("CustomAuthorities:advancedMode")}
          </Button>
        </div>
      </div>

      {hint ? (
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      ) : null}

      {advanced ? (
        <div className="space-y-2">
          <Textarea
            className="font-mono text-xs min-h-[140px]"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          {jsonError ? (
            <div className="text-[11px] text-[hsl(var(--accent-danger-fg))]">
              {jsonError}
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={applyAdvanced}
          >
            {t("CustomAuthorities:applyJson")}
          </Button>
        </div>
      ) : restrictions.length || fieldOptions(opType).length ? (
        <>
          <RestrictionList
            rows={restrictions}
            opType={Number(opType)}
            depth={0}
            t={t}
            onChange={onChange}
          />
          <CoveragePanel
            rows={restrictions}
            opType={opType}
            t={t}
            onPinVoid={pinVoid}
          />
        </>
      ) : (
        <div className="text-[11px] text-muted-foreground italic">
          {t("CustomAuthorities:noFieldsForOp")}
        </div>
      )}
    </div>
  );
}
