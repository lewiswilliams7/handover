/**
 * Public site origin for Stripe redirect URLs and emails.
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://handover.example.com).
 */
export function getAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
