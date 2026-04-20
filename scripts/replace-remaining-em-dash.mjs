/**
 * Replaces any remaining U+2014 (em dash) with " - " in customer-facing code.
 * Skips LLM prompt files and generate route.
 */
import fs from "fs";
import path from "path";

const EM = "\u2014";

const SKIP_FILES = new Set([
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
    else if (p.endsWith(".tsx") || p.endsWith(".ts") || p.endsWith(".css") || p.endsWith(".md")) {
      if (SKIP_FILES.has(norm)) continue;
      out.push(p);
    }
  }
  return out;
}

let n = 0;
for (const f of walk("src")) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes(EM)) continue;
  const orig = s;
  s = s.split(EM).join(" - ");
  while (s.includes(" -  - ")) s = s.split(" -  - ").join(" - ");
  if (s !== orig) {
    fs.writeFileSync(f, s);
    n++;
  }
}
console.log(`Updated ${n} files (remaining em dash)`);
