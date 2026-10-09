export function haloHostnameInputValue(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^\/\//, "");
}

export function normalizeHaloUrlForSubmit(value: string): string {
  const withoutScheme = haloHostnameInputValue(value).replace(/\/+$/, "");
  return withoutScheme ? `https://${withoutScheme}` : "";
}
