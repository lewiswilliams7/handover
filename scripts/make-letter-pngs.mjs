import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

function letterPng(outName, hex, letter) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${hex}"/><text x="64" y="88" font-family="system-ui,sans-serif" font-size="56" font-weight="700" fill="white" text-anchor="middle">${letter}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toFile(path.join(publicDir, outName));
}

await letterPng("teams.png", "#6264A7", "T");
console.log("done");
