import fs from "fs";
import path from "path";

const appRoot = "src/app";
const rows = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name === "page.tsx" || ent.name === "layout.tsx") {
      const text = fs.readFileSync(p, "utf8");
      if (!/export const metadata/.test(text)) continue;
      const rel = path.relative(appRoot, p).replace(/\\/g, "/");
      const route =
        "/" +
        rel
          .replace(/\/page\.tsx$/, "")
          .replace(/\/layout\.tsx$/, "")
          .replace(/\[([^\]]+)\]/g, ":$1");
      const title =
        text.match(/^\s*title:\s*["'`]([^"'`]+)["'`]/m)?.[1] ??
        text.match(/^\s*title:\s*`([^`]+)`/m)?.[1] ??
        text.match(/title:\s*`\$\{TITLE\}\s*\|\s*Handover`/)?.[0] ??
        (text.includes("TITLE") ? "(TITLE constant)" : "(dynamic)");
      let desc = "(see file)";
      const dm = text.match(/^\s*description:\s*["'`]([^"'`]{1,200})/m);
      if (dm) desc = dm[1];
      else if (/^\s*description:\s*DESCRIPTION/m.test(text)) desc = "(DESCRIPTION constant)";
      else if (/^\s*description:\s*META_DESCRIPTION/m.test(text)) desc = "(META_DESCRIPTION)";
      else if (/^\s*description:\s*metadata\.description/m.test(text))
        desc = "(metadata.description)";
      else if (/^\s*description:\s*ABOUT_PAGE_DESCRIPTION/m.test(text))
        desc = "(ABOUT_PAGE_DESCRIPTION)";
      rows.push({ route: route === "/layout.tsx" ? "/ (root layout)" : route, file: p.replace(/\\/g, "/"), title, desc });
    }
  }
}

walk(appRoot);
rows.sort((a, b) => a.route.localeCompare(b.route));
for (const r of rows) {
  console.log(`${r.route}\t${r.title}\t${r.desc}`);
}
console.error("TOTAL", rows.length);
