import fs from "fs";
import path from "path";

const appDir = path.join("src", "app");

const EXCLUDE_PREFIXES = [
  "auth/",
  "dashboard/",
  "portal/",
  "api/",
  "settings/",
  "account/",
  "onboarding/",
  "welcome/",
  "checkout/",
  "sentry-example-page",
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === "page.tsx" || ent.name === "layout.tsx") files.push(p);
  }
  return files;
}

function relApp(p) {
  return path.relative(appDir, p).split(path.sep).join("/");
}

function routeFromPage(relPath) {
  let r = relPath.replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "");
  if (!r || r === "page.tsx") return "/";
  return "/" + r;
}

function isExcluded(route) {
  const r = route.replace(/^\//, "");
  if (r === "referral/status" || r.startsWith("referral/status/")) return true;
  return EXCLUDE_PREFIXES.some(
    (p) => r === p.replace(/\/$/, "") || r.startsWith(p)
  );
}

function extractField(block, field) {
  if (!block) return null;
  const re = new RegExp(
    field +
      String.raw`\s*:\s*(?:\{[^}]*default\s*:\s*)?["']([^"']*)["']`
  );
  const m = block.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    field + String.raw`\s*:\s*(?:\{[^}]*default\s*:\s*)?\`([^\`]*)\``
  );
  const m2 = block.match(re2);
  if (m2) return m2[1].replace(/\s+/g, " ").trim();
  // template with ${}
  const re3 = new RegExp(
    field + String.raw`\s*:\s*(?:\{[^}]*default\s*:\s*)?([^\n,]+)`
  );
  const m3 = block.match(re3);
  if (m3 && !m3[1].includes("{") && !m3[1].includes("openGraph")) {
    const v = m3[1].trim().replace(/,$/, "");
    if (v.startsWith('"') || v.startsWith("'") || v.startsWith("`")) return null;
    return `[expr] ${v}`;
  }
  return null;
}

function extractMetaBlock(src) {
  const m = src.match(
    /export\s+const\s+metadata(?:\s*:\s*Metadata)?\s*=\s*(\{[\s\S]*?\n\})/
  );
  return m ? m[1] : null;
}

function extractOG(block) {
  if (!block) return { title: null, desc: null, present: false };
  const og = block.match(/openGraph\s*:\s*(\{[\s\S]*?\n\s*\})/);
  if (!og) return { title: null, desc: null, present: false };
  return {
    present: true,
    title: extractField(og[1], "title"),
    desc: extractField(og[1], "description"),
  };
}

function extractGenerateMetadata(src) {
  if (!/generateMetadata/.test(src)) return null;
  // Capture full function body roughly
  const fn = src.match(
    /export\s+async\s+function\s+generateMetadata[\s\S]*?(?=\nexport\s|\nfunction\s|\nconst\s+\w+\s*=|\n\/\/|$)/
  );
  return {
    hasGenerate: true,
    snippet: fn ? fn[0].slice(0, 2500) : "found but not extracted",
  };
}

function stripJsxText(t) {
  return t
    .replace(/\{`([^`]*)`\}/g, "$1")
    .replace(/\{["']([^"']*)["']\}/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractH1(src) {
  const h1s = [];
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = re.exec(src))) {
    const t = stripJsxText(m[1]);
    if (t) h1s.push(t);
  }
  // Motion/Heading as="h1"
  const re2 = /as=["']h1["'][^>]*>([\s\S]*?)<\//gi;
  while ((m = re2.exec(src))) {
    const t = stripJsxText(m[1]);
    if (t) h1s.push(t);
  }
  // <Heading ... level={1} or variant
  return h1s;
}

function findLayouts(route) {
  const parts = route === "/" ? [] : route.slice(1).split("/");
  const candidates = [];
  for (let i = parts.length; i >= 0; i--) {
    const dir = path.join(appDir, ...parts.slice(0, i));
    const layout = path.join(dir, "layout.tsx");
    if (fs.existsSync(layout)) candidates.push(layout);
  }
  return candidates;
}

const files = walk(appDir);
const pages = files
  .filter((f) => f.endsWith("page.tsx"))
  .map((f) => {
    const r = relApp(f);
    return { file: f, rel: "src/app/" + r, route: routeFromPage(r) };
  })
  .filter((p) => !isExcluded(p.route));

const results = [];
for (const p of pages) {
  const src = fs.readFileSync(p.file, "utf8");
  let metaBlock = extractMetaBlock(src);
  let metaSource = "page";
  let title = metaBlock ? extractField(metaBlock, "title") : null;
  let description = metaBlock ? extractField(metaBlock, "description") : null;
  let og = extractOG(metaBlock);
  const gen = extractGenerateMetadata(src);

  if (!title && !description && !gen) {
    for (const layout of findLayouts(p.route)) {
      const lsrc = fs.readFileSync(layout, "utf8");
      const lb = extractMetaBlock(lsrc);
      if (!lb) continue;
      const lt = extractField(lb, "title");
      const ld = extractField(lb, "description");
      if (!lt && !ld) continue;
      const relL = "src/app/" + relApp(layout);
      if (relL === "src/app/layout.tsx") {
        if (!title && !description) {
          title = lt;
          description = ld;
          og = extractOG(lb);
          metaSource = "root-layout";
        }
      } else {
        title = lt;
        description = ld;
        og = extractOG(lb);
        metaSource = relL;
        break;
      }
    }
  }

  const h1s = extractH1(src);
  results.push({
    route: p.route,
    file: p.rel,
    title,
    description,
    metaSource,
    ogPresent: og.present,
    ogTitle: og.title,
    ogDesc: og.desc,
    h1: h1s[0] || null,
    allH1: h1s,
    hasGenerate: !!gen,
    genSnippet: gen?.snippet ?? null,
    thin:
      src.length < 800 ||
      /home-client|HomeClient|PricingPageClient|MarketingConversion|ReferralCodeLanding|ReferralPageContent/i.test(
        src
      ),
    importsHomeClient: /home-client|HomeClient/i.test(src),
  });
}

results.sort((a, b) => a.route.localeCompare(b.route));
fs.writeFileSync("_audit-meta-out.json", JSON.stringify(results, null, 2));
console.log(`Wrote ${results.length} pages`);
for (const r of results) {
  const flags = [];
  if (r.hasGenerate) flags.push("GEN");
  if (!r.title) flags.push("NO_TITLE");
  if (!r.h1) flags.push("NO_H1");
  if (r.thin) flags.push("THIN");
  if (r.metaSource !== "page") flags.push("META:" + r.metaSource);
  console.log(`${r.route} | ${flags.join(",") || "ok"}`);
}
