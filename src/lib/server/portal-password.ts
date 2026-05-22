import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPortalPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPortalPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || typeof hash !== "string") return false;
  return bcrypt.compare(plain, hash);
}
