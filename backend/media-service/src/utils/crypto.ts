import crypto from "crypto";

export const encryptBuffer = (buffer: Buffer, key: Buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  return {
    encrypted,
    iv: iv.toString("hex"),
  };
};
export const decryptBuffer = (
    encryptedBuffer: Buffer,
    key: Buffer,
    ivHex: string
  ) => {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
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
