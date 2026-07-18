import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..", "src", "content", "docs", "docs");

// ---- placeholder normalization ----
const placeholderMap = [
  [/1\.2\.ABC/g, "1.2.x"],
  [/1\.2\.XYZ/g, "1.2.x"],
  [/1\.2\.issuer/g, "1.2.x"],
  [/1\.2\.99/g, "1.2.x"],
  [/1\.2\.12345/g, "1.2.x"],
  [/1\.2\.67890/g, "1.2.x"],
  [/1\.2\.123/g, "1.2.x"],
  [/1\.2\.456/g, "1.2.x"],
  [/1\.2\.32/g, "1.2.x"],
  [/1\.2\.40/g, "1.2.x"],
  [/1\.2\.16/g, "1.2.x"],
  [/1\.2\.X\b/g, "1.2.x"],
  [/1\.3\.Z\b/g, "1.3.x"],
  [/1\.3\.A\b/g, "1.3.x"],
  [/1\.3\.B\b/g, "1.3.x"],
  [/1\.3\.C\b/g, "1.3.x"],
  [/1\.3\.MPA\b/g, "1.3.x"],
  [/1\.3\.COLLATERAL\b/g, "1.3.x"],
  [/1\.3\.share\b/g, "1.3.x"],
  [/1\.7\.Y\b/g, "1.7.x"],
  [/1\.20\.Z\b/g, "1.20.x"],
  [/1\.13\.Z\b/g, "1.13.x"],
  [/1\.13\.P\b/g, "1.13.x"],
  [/1\.13\.H\b/g, "1.13.x"],
  [/1\.6\.X\b/g, "1.6.x"],
  [/1\.16\.Z\b/g, "1.16.x"],
  [/1\.21\.N\b/g, "1.21.x"],
  [/1\.22\.Z\b/g, "1.22.x"],
  [/1\.19\.X\b/g, "1.19.x"],
  [/1\.20\.N\b/g, "1.20.x"],
  // remaining generic X/Y/N/P/H suffixes already captured above; catch any stray 1.N.X forms
];

function normalize(text) {
  for (const [re, rep] of placeholderMap) text = text.replace(re, rep);
  // generic fallback: any 1.<digits>.<UPPERCASE word> -> 1.<digits>.x
  text = text.replace(/1\.(\d+)\.[A-Z][A-Za-z]*/g, "1.$1.x");
  return text;
}

// split into sections by '## ' headers (level 2)
function splitSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = /^## (.+)$/.exec(line);
    if (m) {
      if (cur) sections.push(cur);
      cur = { header: m[1], lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      // frontmatter / preamble before first '## '
      if (!sections.length) sections.push({ header: null, lines: [line] });
      else sections[0].lines.push(line);
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

function hasJsonFence(section) {
  return section.lines.some((l) => /^```json/.test(l));
}

function isBadgeOnlyLine(line) {
  const t = line.trim();
  if (!t.startsWith("<Badge")) return false;
  // a line composed only of badge tags (and whitespace)
  const stripped = t.replace(/<Badge[^>]*\/>/g, "").replace(/\s+/g, "");
  return stripped.length === 0;
}

function removeOpenItLive(text) {
  // Match an Aside block titled "Open it live" followed by a blank line and a LinkCard block,
  // and replace with a single markdown link line.
  const re =
    /<Aside type="tip" title="Open it live">[\s\S]*?<\/Aside>\s*\n*<LinkCard\s+title="([^"]+)"\s+description="[^"]*"\s+href="([^"]+)"\s*\/>/g;
  return text.replace(re, (_, title, href) => `**Open in the app:** [${title}](${href}).`);
}

function processFile(path) {
  let text = readFileSync(path, "utf8");

  // 1) split + filter sections
  const sections = splitSections(text);
  const out = [];
  for (const sec of sections) {
    const h = (sec.header || "").toLowerCase();
    // drop Related files entirely
    if (sec.header && /related files/.test(h)) continue;
    // drop Operation(s) used section if it has no json fence
    if (sec.header && /operations? used/.test(h) && !hasJsonFence(sec)) continue;
    out.push(sec.lines.join("\n"));
  }
  text = out.join("\n");

  // 2) dedupe "Open it live"
  text = removeOpenItLive(text);

  // 3) drop badge-only lines
  text = text
    .split("\n")
    .filter((l) => !isBadgeOnlyLine(l))
    .join("\n");

  // 4) placeholder normalization
  text = normalize(text);

  // 5) tidy: collapse 3+ blank lines into 2
  text = text.replace(/\n{3,}/g, "\n\n");

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
console.log("Cleaned docs pages.");
