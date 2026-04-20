const fs = require("fs");
const path = require("path");

const versionFile = path.join(__dirname, "../src/lib/version.ts");
const current = fs.readFileSync(versionFile, "utf8");

const buildMatch = current.match(/BUILD_NUMBER = (\d+)/);
const currentBuild = buildMatch ? parseInt(buildMatch[1], 10) : 0;
const newBuild = currentBuild + 1;
const buildDate = new Date().toISOString().split("T")[0];

const newContent = `// Auto-generated - do not edit manually
export const APP_VERSION = '1.0.0'
export const BUILD_NUMBER = ${newBuild}
export const BUILD_DATE = '${buildDate}'
`;

fs.writeFileSync(versionFile, newContent);
console.log(`Version bumped to build ${newBuild}`);
