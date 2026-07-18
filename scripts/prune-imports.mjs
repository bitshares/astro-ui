import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..", "src", "content", "docs", "docs");

// components that are NEVER used as JSX tags in body (only appear in code fences as text) -> keep safe list to always allow
const ALL = [
  "LinkCard", "Card", "CardGrid", "Aside", "Steps", "Badge", "Tabs", "TabItem",
  "Code", "FileTree", "Icon", "LinkButton", "Hero", "Badge",
];

function usedNames(text) {
  const lines = text.split("\n");
  let inFence = false;
  const used = new Set();
  for (const line of lines) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (const name of ALL) {
      // match <Name or </Name possibly with self-close
      if (new RegExp("<\\/?" + name + "\\b").test(line)) used.add(name);
    }
  }
  return used;
}

function processFile(path) {
  let text = readFileSync(path, "utf8");
  const re = /import \{([^}]+)\} from '@astrojs\/starlight\/components';/;
  const m = re.exec(text);
  if (!m) return;
  const declared = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  const used = usedNames(text);
  // keep only declared names that are actually used
  const kept = declared.filter((n) => used.has(n));
  // avoid removing the whole import if empty -> drop the line
  let newImport;
  if (kept.length === 0) newImport = "";
  else newImport = `import { ${kept.join(", ")} } from '@astrojs/starlight/components';`;
  text = text.replace(re, newImport);
  writeFileSync(path, text);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".mdx")) processFile(full);
  }
}
walk(DOCS);
console.log("Pruned imports.");
