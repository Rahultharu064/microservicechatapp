import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import prismaClient from "../config/db.ts";
import { readFile } from "../services/storageService.ts";
import { decryptBuffer } from "../utils/crypto.ts";

export const downloadMedia = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const media = await prismaClient.media.findUnique({
            where: { id: id as string },
        });

        if (!media) {
            return res.status(404).json({ error: "Media not found" });
        }

        const encryptedBuffer = await readFile(media.storagePath);
        const encryptionKey = Buffer.from(media.encryptedKey, "hex");

        // Decrypt the buffer
        const decryptedBuffer = decryptBuffer(encryptedBuffer, encryptionKey, media.iv);

        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        // For images, allow inline display; for others, force download
        if (media.mimeType.startsWith('image/')) {
            res.setHeader("Content-Disposition", `inline; filename="${media.filename}"`);
        } else {
            res.setHeader("Content-Disposition", `attachment; filename="${media.filename}"`);
        }
        res.send(decryptedBuffer);
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Failed to download media" });
    }
};

export const downloadVoice = async (req: AuthRequest, res: Response) => {
    const { voiceMessageId } = req.params;

    try {
        const voiceMessage = await prismaClient.voiceMessage.findUnique({
            where: { id: voiceMessageId as string },
            include: { media: true },
        });

        if (!voiceMessage) {
            return res.status(404).json({ error: "Voice message not found" });
        }

        const encryptedBuffer = await readFile(voiceMessage.media.storagePath);
        const encryptionKey = Buffer.from(voiceMessage.media.encryptedKey, "hex");

        // Decrypt the buffer
        const decryptedBuffer = decryptBuffer(encryptedBuffer, encryptionKey, voiceMessage.media.iv);

        res.setHeader("Content-Type", voiceMessage.media.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="voice_message_${voiceMessageId}.${voiceMessage.format}"`);
        res.send(decryptedBuffer);
    } catch (error) {
        console.error("Voice download error:", error);
        res.status(500).json({ error: "Failed to download voice message" });
    }
};

export const downloadVideo = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const media = await prismaClient.media.findUnique({
            where: { id: id as string },
            include: { videoMessage: true },
        });

        if (!media) {
            return res.status(404).json({ error: "Video media not found" });
        }

        const encryptedBuffer = await readFile(media.storagePath);
        const encryptionKey = Buffer.from(media.encryptedKey, "hex");

        // Decrypt the buffer
        const decryptedBuffer = decryptBuffer(encryptedBuffer, encryptionKey, media.iv);

        res.setHeader("Content-Type", media.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${media.filename}"`);
        res.send(decryptedBuffer);
    } catch (error) {
        console.error("Video download error:", error);
        res.status(500).json({ error: "Failed to download video message" });
    }
};

export const getThumbnail = async (req: AuthRequest, res: Response) => {
    const { id, size } = req.params;

    try {
        const thumbnail = await prismaClient.thumbnail.findFirst({
            where: {
                mediaId: id as string,
                size: size as string
            },
        });

        if (!thumbnail) {
            return res.status(404).json({ error: "Thumbnail not found" });
        }

        const buffer = await readFile(thumbnail.path);
        res.setHeader("Content-Type", "image/webp");
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: "Failed to get thumbnail" });
    }
};
