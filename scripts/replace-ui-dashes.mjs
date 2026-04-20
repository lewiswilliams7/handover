/**
 * Replaces spaced em dash (U+2014) and en dash (U+2013) in source files.
 * Skips src/app/api (except nothing), and prompt-heavy API routes.
 * Skips home-client.tsx (contains regex / data literals that must keep U+2014).
 */
import fs from "fs";
import path from "path";

const EM = "\u2014";
const EN = "\u2013";

const SKIP_SUBSTR = "/api/";
const SKIP_FILES = new Set([
  "src/lib/owner-cell-format.ts",
  "src/app/api/generate/route.ts",
  "src/app/api/generation/smart-actions-suggestions/route.ts",
  "src/app/api/generation/smart-action-email/route.ts",
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    const norm = p.split(path.sep).join("/");
    if (ent.isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") || p.endsWith(".ts") || p.endsWith(".md")) {
      if (norm.includes(SKIP_SUBSTR)) continue;
      if (SKIP_FILES.has(norm)) continue;
      out.push(p);
    }
  }
  return out;
}

let filesTouched = 0;
for (const f of walk("src")) {
  let s = fs.readFileSync(f, "utf8");
  const orig = s;
  s = s.split(` ${EM} `).join(" - ");
  s = s.split(EN).join("-");
  if (s !== orig) {
    fs.writeFileSync(f, s);
    filesTouched++;
  }
}
console.log(`Updated ${filesTouched} files`);
