import fs from "fs/promises";
import { randomBytes } from "crypto";
import { encryptBuffer } from "../utils/crypto.ts";
import { saveFile } from "./storageService.ts";
import { generateThumbnail } from "./thumbnailService.ts";
import prismaClient from "../config/db.ts";
import { publishMediaProcessed } from "./messageService.ts";


export const handleUpload = async (
  file: Express.Multer.File,
  ownerId: string
) => {
  // Virus scan
  
 

  // Read file into buffer
  const buffer = await fs.readFile(file.path);

  // Encryption
  const encryptionKey = randomBytes(32);
  const { encrypted, iv } = encryptBuffer(buffer, encryptionKey);

  // Storage
  const storagePath = await saveFile(file.filename, encrypted);

  // Database Entry
  const media = await prismaClient.media.create({
    data: {
      ownerId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
      encryptedKey: encryptionKey.toString("hex"),
      iv: iv,
    },
  });

  // Post-processing: Thumbnails for images
  if (file.mimetype.startsWith("image/")) {
    const thumbnails = await generateThumbnail(media.id, storagePath, buffer);

    await prismaClient.thumbnail.createMany({
      data: thumbnails.map(t => ({
        mediaId: media.id,
        size: t.size,
        path: t.path
      }))
    });
  }

  // Publish event
  await publishMediaProcessed(media.id, ownerId, `/api/media/download/${media.id}`);

  // Cleanup Multer temp file
  await fs.unlink(file.path);

  return media;
};
