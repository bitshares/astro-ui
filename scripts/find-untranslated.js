#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.resolve(__dirname, "../src/data/locales");
const REFERENCE_LOCALE = "en";

// CLI args: --locale=xx --file=BaseName
const args = process.argv.slice(2);
const filterLocale = args.find((a) => a.startsWith("--locale="))?.split("=")[1];
const filterFile = args.find((a) => a.startsWith("--file="))?.split("=")[1];

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function getLocaleDirs() {
  if (!fs.existsSync(LOCALES_DIR)) return [];
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => n !== REFERENCE_LOCALE)
    .filter((n) => (filterLocale ? n === filterLocale : true));
}

function getFilesForLocale(locale) {
  const dir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).filter((b) => (filterFile ? b === filterFile : true));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`Failed to parse JSON: ${filePath} — ${e.message}`);
    return null;
  }
}

// Collect English reference files
const enDir = path.join(LOCALES_DIR, REFERENCE_LOCALE);
if (!fs.existsSync(enDir)) {
  console.error(`English locales directory not found: ${enDir}`);
  process.exit(2);
}

const enFiles = fs.readdirSync(enDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).filter((b) => (filterFile ? b === filterFile : true));
if (enFiles.length === 0) {
  console.error("No English locale files found.");
  process.exit(2);
}

const locales = getLocaleDirs();
if (locales.length === 0) {
  console.log("No non-English locales found to check.");
  process.exit(0);
}

let totalUntranslated = 0;

for (const locale of locales) {
  const untranslatedByFile = {};
  for (const fileBase of enFiles) {
    const refPath = path.join(LOCALES_DIR, REFERENCE_LOCALE, `${fileBase}.json`);
    const locPath = path.join(LOCALES_DIR, locale, `${fileBase}.json`);
    if (!fs.existsSync(locPath)) continue;

    const ref = readJson(refPath);
    const loc = readJson(locPath);
    if (!ref || !loc) continue;

    const refFlat = flatten(ref);
    const locFlat = flatten(loc);

    const untranslated = [];
    for (const k of Object.keys(refFlat)) {
      if (!(k in locFlat)) continue;
      const a = refFlat[k];
      const b = locFlat[k];
      if (typeof a === "string" && typeof b === "string" && a === b && a.trim().length > 0) {
        untranslated.push(k);
      }
    }

    if (untranslated.length > 0) {
      untranslatedByFile[`${locale}/${fileBase}.json`] = untranslated;
      totalUntranslated += untranslated.length;
    }
  }

  if (Object.keys(untranslatedByFile).length > 0) {
    console.log(`\nLocale: ${locale}`);
    for (const [fname, items] of Object.entries(untranslatedByFile)) {
      console.log(`  ${fname} — ${items.length} untranslated`);
      for (const it of items) {
        console.log(`    - ${it}`);
      }
    }
  }
}

console.log(`\nSummary: ${totalUntranslated} untranslated string(s) found across ${locales.length} locale(s).`);

process.exit(0);
