import type { Request, Response } from "express";
import prisma from "../config/db.js";
import mediaServiceClient from "../services/mediaServiceClient.js";
import logger from "../../../shared/src/logger/logger.js";

export const uploadAttachment = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const { messageType = "private" } = req.body;
        const token = req.headers.authorization?.split(" ")[1];

        if (!file) {
            return res.status(400).json({ error: "No file provided" });
        }

        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Determine if it's a voice message
        const isVoice = file.mimetype.startsWith("audio/");

        // Upload to Media Service
        const uploadResponse = isVoice
            ? await mediaServiceClient.uploadVoice(file, token)
            : await mediaServiceClient.uploadFile(file, token);

        // Determine media type
        let mediaType = "file";
        if (file.mimetype.startsWith("image/")) mediaType = "image";
        else if (file.mimetype.startsWith("video/")) mediaType = "video";
        else if (isVoice) mediaType = "voice";

        // Generate URLs
        const mediaUrl = mediaServiceClient.getDownloadUrl(uploadResponse.id);
        const thumbnail =
            mediaType === "image" || mediaType === "video"
                ? mediaServiceClient.getThumbnailUrl(uploadResponse.id)
                : null;

        // Prepare metadata
        const metadata = uploadResponse.voiceMessage
            ? JSON.stringify({
                duration: uploadResponse.voiceMessage.duration,
                waveform: uploadResponse.voiceMessage.waveform,
            })
            : JSON.stringify({
                filename: uploadResponse.filename,
                size: uploadResponse.size,
            });

        // Return attachment info (will be saved when message is sent)
        res.status(201).json({
            mediaId: uploadResponse.id,
            mediaType,
            mediaUrl,
            thumbnail,
            metadata: JSON.parse(metadata),
            filename: uploadResponse.filename,
            size: uploadResponse.size,
        });
    } catch (err) {
        logger.error("Failed to upload attachment", err);
        res.status(500).json({ error: "Failed to upload attachment" });
    }
};

export const getAttachment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const attachment = await prisma.messageAttachment.findUnique({
            where: { id: id as string },
        });

        if (!attachment) {
            return res.status(404).json({ error: "Attachment not found" });
        }

        res.json({
            ...attachment,
            metadata: attachment.metadata ? JSON.parse(attachment.metadata) : null,
        });
    } catch (err) {
        logger.error("Failed to get attachment", err);
        res.status(500).json({ error: "Failed to get attachment" });
    }
};

export const getMessageAttachments = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;

        const attachments = await prisma.messageAttachment.findMany({
            where: { messageId: messageId as string },
            orderBy: { createdAt: "asc" },
        });

        res.json(
            attachments.map((att) => ({
                ...att,
                metadata: att.metadata ? JSON.parse(att.metadata) : null,
            }))
        );
    } catch (err) {
        logger.error("Failed to get message attachments", err);
        res.status(500).json({ error: "Failed to get message attachments" });
    }
};
