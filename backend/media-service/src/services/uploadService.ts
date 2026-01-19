import fs from "fs/promises";
import { randomBytes } from "crypto";
import { encryptBuffer } from "../utils/crypto.ts";
import { saveFile as saveEncryptedFile } from "./storageService.ts";
import { scanFile } from "./scanService.ts";
import prismaClient from "../config/db.ts";

export const handleUpload = async (
  file: Express.Multer.File,
  ownerId: string
) => {
  const clean = !(await scanFile());
  if (!clean) throw new Error("Virus detected");

  const buffer = await fs.readFile(file.path);
  const encryptionKey = randomBytes(32);
  const encrypted = encryptBuffer(buffer, encryptionKey);

  const storagePath = await saveEncryptedFile(
    file.filename,
    encrypted.encrypted
  );

  return prismaClient.media.create({
    data: {
      ownerId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
      encryptedKey: encryptionKey.toString("hex"),
      iv: encrypted.iv,
    },
  });
};


