import crypto from "crypto";

export const encryptBuffer = (buffer: Buffer, key: Buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex") + authTag.toString("hex"),
  };
};

export const decryptBuffer = (
  encryptedBuffer: Buffer,
  key: Buffer,
  ivHex: string
) => {
  let iv: Buffer;
  let authTag: Buffer | null = null;

  // Check if we have an appended tag (16 bytes IV + 16 bytes Tag = 32 bytes = 64 hex chars)
  if (ivHex.length === 64) {
    iv = Buffer.from(ivHex.slice(0, 32), "hex");
    authTag = Buffer.from(ivHex.slice(32), "hex");
  } else {
    // Legacy fallback (will likely fail for GCM but keeps types correct)
    iv = Buffer.from(ivHex, "hex");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  if (authTag) {
    decipher.setAuthTag(authTag);
  }

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);
  return decrypted;
};
export const generateKey = (password: string, salt: Buffer) => {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}
export const generateSalt = () => {
  return crypto.randomBytes(16);
};
