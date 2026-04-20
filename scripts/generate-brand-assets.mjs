import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pngToIco from "png-to-ico";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const iconPath = path.join(root, "public", "icon.png");
const logoPath = path.join(root, "public", "icon2.png");

async function main() {
  const buf16 = await sharp(iconPath).resize(16, 16).png().toBuffer();
  const buf32 = await sharp(iconPath).resize(32, 32).png().toBuffer();
  const buf48 = await sharp(iconPath).resize(48, 48).png().toBuffer();
  const ico = await pngToIco([buf16, buf32, buf48]);
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), ico);

  await sharp(iconPath).resize(180, 180, { fit: "cover" }).png().toFile(path.join(root, "public", "apple-touch-icon.png"));

  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect fill="url(#ogbg)" width="1200" height="630"/>
  <image xlink:href="data:image/png;base64,${logoBase64}" x="490" y="95" width="220" height="220" preserveAspectRatio="xMidYMid meet"/>
  <text x="600" y="395" text-anchor="middle" fill="#f1f5f9" font-family="Segoe UI, system-ui, -apple-system, sans-serif" font-size="40" font-weight="600">Stop writing reports.</text>
  <text x="600" y="455" text-anchor="middle" fill="#38bdf8" font-family="Segoe UI, system-ui, -apple-system, sans-serif" font-size="40" font-weight="700">Start delivering.</text>
</svg>`;

  await sharp(Buffer.from(svg)).resize(1200, 630).png().toFile(path.join(root, "public", "og-image.png"));

  console.log("Wrote src/app/favicon.ico, public/apple-touch-icon.png, public/og-image.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
