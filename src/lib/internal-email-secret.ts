/** Header used to protect internal email trigger routes. */
export const HANDOVER_INTERNAL_SECRET_HEADER = "x-handover-internal-secret";

export function verifyHandoverInternalEmailSecret(request: Request): boolean {
  const expected = process.env.HANDOVER_INTERNAL_EMAIL_SECRET?.trim();
  if (!expected) {
    return false;
  }
  const got = request.headers.get(HANDOVER_INTERNAL_SECRET_HEADER)?.trim();
  return got === expected;
}
