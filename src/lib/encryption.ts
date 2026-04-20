import CryptoJS from "crypto-js";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set.");
  }
  return key;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(text: string): string {
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(text, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error("Failed to decrypt value.");
  }
  return decrypted;
}
