import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set.");
  }
  // Derive a 32-byte key using scrypt
  return scryptSync(key, "salt", 32);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  // Prepend IV to encrypted data
  // IV is not secret — it just needs to be unique per encryption
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  const key = getEncryptionKey();
  const [ivHex, encryptedHex] = text.split(":");

  // Handle legacy CryptoJS format
  // if the stored value doesn't contain ":" it was encrypted with the old method
  if (!ivHex || !encryptedHex) {
    // Fall back to CryptoJS for legacy values
    const CryptoJS = require("crypto-js");
    const keyStr = process.env.ENCRYPTION_KEY ?? "";
    const bytes = CryptoJS.AES.decrypt(text, keyStr);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
