import fs from "fs";
import https from "https";

const outDir = new URL("../public/", import.meta.url);

const downloads = [
  // Simple Icons SVG served as PNG path — actually returns SVG; we'll save with correct ext below
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Handover-asset-fetch/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (!loc) {
            reject(new Error("Redirect without location"));
            return;
          }
          get(loc).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function main() {
  const svgTargets = [
    ["jira.svg", "https://cdn.simpleicons.org/jira/0052CC"],
    ["zendesk.svg", "https://cdn.simpleicons.org/zendesk/03363D"],
    ["datto.svg", "https://cdn.simpleicons.org/datto/199ED9"],
    ["atlassian.svg", "https://cdn.simpleicons.org/atlassian/0052CC"],
  ];

  for (const [name, url] of svgTargets) {
    try {
      const buf = await get(url);
      fs.writeFileSync(new URL(name, outDir), buf);
      console.log("OK", name, buf.length);
    } catch (e) {
      console.error("FAIL", name, e.message);
    }
  }

  const pngTry = [
    ["autotask.png", "https://logo.clearbit.com/autotask.net"],
    ["monday.png", "https://logo.clearbit.com/monday.com"],
    ["freshservice.png", "https://logo.clearbit.com/freshservice.com"],
  ];

  for (const [name, url] of pngTry) {
    try {
      const buf = await get(url);
      if (buf.length < 100) throw new Error("too small");
      fs.writeFileSync(new URL(name, outDir), buf);
      console.log("OK", name, buf.length);
    } catch (e) {
      console.error("FAIL", name, e.message);
    }
  }
}

main();
