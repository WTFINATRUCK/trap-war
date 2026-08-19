import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createRunSeed(): string {
  return randomBytes(32).toString("base64url");
}

export function encryptSecret(secret: string, key: Buffer): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedSecret, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
