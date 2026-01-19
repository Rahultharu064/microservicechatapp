import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { encryptBuffer } from "../utils/crypto.ts";
import { saveFile } from "../services/storageService.ts";
import prismaClient from "../config/db.ts";
import { publishMediaProcessed } from "../services/messageService.ts";
import { getAudioMetadata, convertToOggOpus, generateSimpleWaveform } from "../services/audioService.ts";

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
        // Get audio metadata
        const metadata = await getAudioMetadata(file.path);

        // Convert to OGG/Opus for optimal storage
        const convertedPath = await convertToOggOpus(file.path, `voice_${Date.now()}`);

        // Generate waveform data
        const waveform = await generateSimpleWaveform(file.path);

        // Read converted file for encryption
        const buffer = await fs.readFile(convertedPath);
        const encryptionKey = randomBytes(32);
        const { encrypted, iv } = encryptBuffer(buffer, encryptionKey);

        // Save encrypted file
        const storagePath = await saveFile(`voice_${Date.now()}_encrypted`, encrypted);

        // Create media record
        const media = await prismaClient.media.create({
            data: {
                ownerId: userId,
                filename: file.originalname,
                mimeType: "audio/ogg",
                size: buffer.length,
                storagePath,
                encryptedKey: encryptionKey.toString("hex"),
                iv: iv ,
            },
        });

        // Create voice message metadata
        const voiceMessage = await prismaClient.voiceMessage.create({
            data: {
                mediaId: media.id,
                duration: metadata.duration,
                waveform: JSON.stringify(waveform),
                format: metadata.format,
                convertedPath: convertedPath,
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
            include: { voiceMessage  : true },
        });

        if (!media || !media.voiceMessage ) {
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
