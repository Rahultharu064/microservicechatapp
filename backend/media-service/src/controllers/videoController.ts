import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import fs from "fs/promises";
import { randomBytes } from "crypto";

import { encryptBuffer } from "../utils/crypto.ts";
import { saveFile } from "../services/storageService.ts";
import {
  getVideoMetadata,
  compressVideo,
  generateVideoThumbnail,
  validateVideoFile,
} from "../services/videoService.ts";

import prismaClient from "../config/db.ts";
import { publishMediaProcessed } from "../services/messageService.ts";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/* ======================================================
   UPLOAD VIDEO MESSAGE
====================================================== */
export const uploadVideoMessage = async (
  req: AuthRequest,
  res: Response
) => {
  const file = req.file;
  const userId = req.user!.userId;

  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  if (file.size > MAX_VIDEO_SIZE) {
    await fs.unlink(file.path).catch(() => {});
    return res.status(400).json({ error: "Video file too large (max 50MB)" });
  }

  try {
    /* ---------- Validate ---------- */
    await validateVideoFile(file.path);

    /* ---------- Metadata ---------- */
    const metadata = await getVideoMetadata(file.path);

    /* ---------- Compress ---------- */
    const compressedPath = await compressVideo(
      file.path,
      `video_${Date.now()}`
    );

    /* ---------- Thumbnail ---------- */
    const thumbnailPath = await generateVideoThumbnail(
      compressedPath,
      `thumb_${Date.now()}`
    );

    /* ---------- Encrypt ---------- */
    const buffer = await fs.readFile(compressedPath);
    const encryptionKey = randomBytes(32);
    const { encrypted, iv } = encryptBuffer(buffer, encryptionKey);

    /* ---------- Save ---------- */
    const storagePath = await saveFile(
      `video_${Date.now()}_encrypted`,
      encrypted
    );

    /* ---------- Create Media ---------- */
    const media = await prismaClient.media.create({
      data: {
        ownerId: userId,
        filename: file.originalname,
        mimeType: "video/mp4",
        size: buffer.length,
        storagePath,
        encryptedKey: encryptionKey.toString("hex"),
        iv,
      },
    });

    /* ---------- Create VideoMessage ---------- */
    const videoMessage = await prismaClient.videoMessage.create({
      data: {
        mediaId: media.id,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        format: "mp4",
        thumbnailPath,
        convertedPath: compressedPath,
      },
    });

    /* ---------- Publish Event ---------- */
    await publishMediaProcessed(
      media.id,
      userId,
      `/api/media/video/${media.id}`
    );

    /* ---------- Cleanup ---------- */
    await fs.unlink(file.path).catch(() => {});

    /* ---------- Response ---------- */
    return res.status(201).json({
      media: {
        id: media.id,
        filename: media.filename,
        mimeType: media.mimeType,
        size: media.size,
        createdAt: media.createdAt,
      },
      videoMessage: {
        id: videoMessage.id,
        duration: videoMessage.duration,
        width: videoMessage.width,
        height: videoMessage.height,
        thumbnailPath: videoMessage.thumbnailPath,
      },
    });
  } catch (error: any) {
    console.error("Video upload error:", error);

    if (file?.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    return res.status(500).json({
      error: error.message || "Failed to process video message",
    });
  }
};

/* ======================================================
   GET VIDEO MESSAGE METADATA
====================================================== */
export const getVideoMessage = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const media = await prismaClient.media.findUnique({
      where: { id },
      include: { videoMessage: true },
    });

    if (!media || !media.videoMessage) {
      return res.status(404).json({ error: "Video message not found" });
    }

    return res.json({
      id: media.id,
      duration: media.videoMessage.duration,
      width: media.videoMessage.width,
      height: media.videoMessage.height,
      thumbnailPath: media.videoMessage.thumbnailPath,
      createdAt: media.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to get video message" });
  }
};

/* ======================================================
   GET VIDEO THUMBNAIL
====================================================== */
export const getVideoThumbnail = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params;

  try {
    const media = await prismaClient.media.findUnique({
      where: { id },
      include: { videoMessage: true },
    });

    if (!media?.videoMessage?.thumbnailPath) {
      return res.status(404).json({ error: "Thumbnail not found" });
    }

    const thumbnailBuffer = await fs.readFile(
      media.videoMessage.thumbnailPath
    );

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    return res.send(thumbnailBuffer);
  } catch (error) {
    console.error("Thumbnail fetch error:", error);
    return res.status(500).json({ error: "Failed to get thumbnail" });
  }
};
