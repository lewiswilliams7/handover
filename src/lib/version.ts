import packageJson from "../../package.json";

/** App semver from package.json — single source of truth for UI version labels. */
export const APP_VERSION = packageJson.version;
