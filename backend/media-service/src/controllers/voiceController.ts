import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { encryptBuffer } from "../utils/crypto.ts";
import { saveFile } from "../services/storageService.ts";
import { generateWaveform, getAudioMetadata } from "../services/audioService.ts";
import prismaClient from "../config/db.ts";
import { publishMediaProcessed } from "../services/messageService.ts";

export const uploadVoiceMessage = async (
    req: AuthRequest,
    res: Response
) => {
    const file = req.file;
    const userId = req.user!.userId;

    if (!file) {
        return res.status(400).json({ error: "No file provided" });
    }

    try {
        // Read the uploaded audio file directly (no conversion needed)
        const buffer = await fs.readFile(file.path);

        // Encrypt the audio file
        const encryptionKey = randomBytes(32);
        const { encrypted, iv } = encryptBuffer(buffer, encryptionKey);

        // Save encrypted file
        const storagePath = await saveFile(`voice_${Date.now()}_encrypted`, encrypted);

        // Create media record
        const media = await prismaClient.media.create({
            data: {
                ownerId: userId,
                filename: file.originalname,
                mimeType: file.mimetype, // Keep original mimetype (webm/ogg)
                size: buffer.length,
                storagePath,
                encryptedKey: encryptionKey.toString("hex"),
                iv: iv,
            },
        });

        // Get real audio metadata
        const metadata = await getAudioMetadata(file.path);
        const realDuration = Math.max(1, Math.floor(metadata.duration));

        // Generate real waveform data
        const waveform = await generateWaveform(file.path, 40);

        // Create voice message metadata
        const voiceMessage = await prismaClient.voiceMessage.create({
            data: {
                mediaId: media.id,
                duration: realDuration,
                waveform: JSON.stringify(waveform),
                format: file.mimetype.split('/')[1] || 'webm',
                convertedPath: storagePath,
            },
        });

        // Publish event
        await publishMediaProcessed(media.id, userId, `/api/media/voice/${media.id}`);

        // Cleanup temp files
        await fs.unlink(file.path);

        res.status(201).json({
            ...media,
            voiceMessage: {
                duration: voiceMessage.duration,
                waveform: JSON.parse(voiceMessage.waveform || "[]"),
            },
        });
    } catch (error) {
        console.error("Voice upload error:", error);
        res.status(500).json({ error: "Failed to process voice message" });
    }
};

export const getVoiceMessage = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const media = await prismaClient.media.findUnique({
            where: { id: id as string },
            include: { voiceMessage: true },
        });

        if (!media || !media.voiceMessage) {
            return res.status(404).json({ error: "Voice message not found" });
        }

        res.json({
            id: media.id,
            duration: media.voiceMessage.duration,
            waveform: JSON.parse(media.voiceMessage.waveform || "[]"),
            createdAt: media.createdAt,
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get voice message" });
    }
};
