#!/usr/bin/env node

/**
 * Locale Comparison Script
 *
 * Compares all non-English locale JSON files against the English reference.
 * Reports missing keys, extra keys, and missing files.
 *
 * Usage:
 *   node scripts/check-locales.js
 *   node scripts/check-locales.js --locale=da        # check only Danish
 *   node scripts/check-locales.js --file=CreatePrediction  # check only one file
 *   node scripts/check-locales.js --strict            # exit with error if issues found
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.resolve(__dirname, "../src/data/locales");
const REFERENCE_LOCALE = "en";
const ALL_LOCALES = [
  "en", "da", "de", "es", "et", "fr", "it", "ja", "ko", "pt", "th",
];

// Parse CLI args
const args = process.argv.slice(2);
const filterLocale = args
  .find((a) => a.startsWith("--locale="))
  ?.split("=")[1];
const filterFile = args
  .find((a) => a.startsWith("--file="))
  ?.split("=")[1];
const strict = args.includes("--strict");

const locales = filterLocale
  ? [REFERENCE_LOCALE, filterLocale]
  : ALL_LOCALES;

/**
 * Flatten a nested object into dot-notation keys.
 * e.g. { a: { b: 1 } } => { "a.b": 1 }
 */
function flattenKeys(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Get all JSON file basenames from a locale directory.
 */
function getLocaleFiles(locale) {
  const dir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Deep compare two values for equality (handles nested objects and arrays).
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
}

// ── Main ──────────────────────────────────────────────────────────────────────

let totalIssues = 0;
let totalFilesChecked = 0;
const results = {};

// Collect all file basenames across all locales
const allFileBasenames = new Set();
for (const locale of locales) {
  for (const f of getLocaleFiles(locale)) {
    if (!filterFile || f === filterFile) {
      allFileBasenames.add(f);
    }
  }
}

// Also check English files to find files missing in other locales
const enFiles = getLocaleFiles(REFERENCE_LOCALE);
for (const f of enFiles) {
  if (!filterFile || f === filterFile) {
    allFileBasenames.add(f);
  }
}

for (const fileBasename of allFileBasenames) {
  const refFile = path.join(LOCALES_DIR, REFERENCE_LOCALE, `${fileBasename}.json`);
  if (!fs.existsSync(refFile)) {
    // No English reference — skip
    continue;
  }

  let refData;
  try {
    refData = JSON.parse(fs.readFileSync(refFile, "utf8"));
  } catch (e) {
    console.error(`  ✗ ${REFERENCE_LOCALE}/${fileBasename}.json — invalid JSON: ${e.message}`);
    totalIssues++;
    continue;
  }
  const refFlat = flattenKeys(refData);

  for (const locale of locales) {
    if (locale === REFERENCE_LOCALE) continue;
    const localeFile = path.join(LOCALES_DIR, locale, `${fileBasename}.json`);

    if (!fs.existsSync(localeFile)) {
      console.error(
        `  ✗ MISSING FILE: ${locale}/${fileBasename}.json (has ${Object.keys(refFlat).length} keys in ${REFERENCE_LOCALE})`
      );
      totalIssues++;
      continue;
    }

    let localeData;
    try {
      localeData = JSON.parse(fs.readFileSync(localeFile, "utf8"));
    } catch (e) {
      console.error(`  ✗ ${locale}/${fileBasename}.json — invalid JSON: ${e.message}`);
      totalIssues++;
      continue;
    }
    const localeFlat = flattenKeys(localeData);
    totalFilesChecked++;

    const missingKeys = Object.keys(refFlat).filter((k) => !(k in localeFlat));
    const extraKeys = Object.keys(localeFlat).filter((k) => !(k in refFlat));

    // Check for untranslated values (still in English)
    const untranslatedKeys = [];
    for (const key of Object.keys(localeFlat)) {
      if (key in refFlat) {
        const refVal = refFlat[key];
        const locVal = localeFlat[key];
        // Skip arrays, objects, numbers, booleans, URLs, and interpolation templates
        if (
          typeof refVal !== "string" ||
          typeof locVal !== "string" ||
          refVal === locVal ||
          refVal.startsWith("http") ||
          refVal.includes("{{") ||
          refVal.length < 3
        ) {
          continue;
        }
        // Check if the value is identical to English (potential untranslated)
        // Only flag if it's a substantial English string (>10 chars) and not a proper noun/URL
        if (
          refVal === locVal &&
          refVal.length > 10 &&
          !/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(refVal) && // not Title Case names
          !refVal.includes(".")
        ) {
          untranslatedKeys.push(key);
        }
      }
    }

    if (missingKeys.length === 0 && extraKeys.length === 0 && untranslatedKeys.length === 0) {
      // No issues
      continue;
    }

    const fileKey = `${locale}/${fileBasename}.json`;
    results[fileKey] = { missingKeys, extraKeys, untranslatedKeys };
    totalIssues += missingKeys.length + extraKeys.length + untranslatedKeys.length;
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  Locale Comparison Report");
console.log("  Reference: " + REFERENCE_LOCALE);
console.log("═══════════════════════════════════════════════════════════════\n");

if (Object.keys(results).length === 0) {
  console.log("  ✓ All locale files are in sync with the English reference.\n");
} else {
  // Sort by filename
  const sorted = Object.entries(results).sort(([a], [b]) => a.localeCompare(b));

  for (const [fileKey, { missingKeys, extraKeys, untranslatedKeys }] of sorted) {
    console.log(`  ${fileKey}`);
    if (missingKeys.length > 0) {
      console.log(`    Missing keys (${missingKeys.length}):`);
      for (const k of missingKeys) {
        console.log(`      - ${k}`);
      }
    }
    /*
    if (extraKeys.length > 0) {
      console.log(`    Extra keys (${extraKeys.length}):`);
      for (const k of extraKeys) {
        console.log(`      + ${k}`);
      }
    }
    */
    if (untranslatedKeys.length > 0) {
      console.log(`    Possibly untranslated (${untranslatedKeys.length}):`);
      for (const k of untranslatedKeys) {
        console.log(`      ~ ${k}`);
      }
    }
    console.log("");
  }
}

console.log("═══════════════════════════════════════════════════════════════");
console.log(
  `  Summary: ${totalFilesChecked} files checked, ${totalIssues} issue(s) found`
);
console.log("═══════════════════════════════════════════════════════════════\n");

if (strict && totalIssues > 0) {
  process.exit(1);
}
