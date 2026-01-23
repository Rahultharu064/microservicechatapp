import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import prismaClient from "../config/db.js";

export const addReaction = async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user!.userId;

    if (!emoji) {
        return res.status(400).json({ error: "Emoji is required" });
    }

    try {
        const reaction = await prismaClient.messageReaction.create({
            data: {
                messageId,
                userId,
                emoji,
            },
        });

        res.status(201).json(reaction);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Reaction already exists" });
        }
        console.error("Add reaction error:", error);
        res.status(500).json({ error: "Failed to add reaction" });
    }
};

export const removeReaction = async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user!.userId;

    try {
        await prismaClient.messageReaction.deleteMany({
            where: {
                messageId,
                userId,
                emoji,
            },
        });

        res.status(204).send();
    } catch (error) {
        console.error("Remove reaction error:", error);
        res.status(500).json({ error: "Failed to remove reaction" });
    }
};

export const getReactions = async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;

    try {
        const reactions = await prismaClient.messageReaction.findMany({
            where: { messageId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        profilePic: true,
                    },
                },
            },
        });

        res.json(reactions);
    } catch (error) {
        console.error("Get reactions error:", error);
        res.status(500).json({ error: "Failed to get reactions" });
    }
};

export const updatePlaybackPosition = async (req: AuthRequest, res: Response) => {
    const { voiceMessageId } = req.params;
    const { position } = req.body;
    const userId = req.user!.userId;

    if (typeof position !== 'number' || position < 0) {
        return res.status(400).json({ error: "Valid position is required" });
    }

    try {
        const playbackPosition = await prismaClient.voicePlaybackPosition.upsert({
            where: {
                voiceMessageId_userId: {
                    voiceMessageId,
                    userId,
                },
            },
            update: {
                position,
            },
            create: {
                voiceMessageId,
                userId,
                position,
            },
        });

        res.json(playbackPosition);
    } catch (error) {
        console.error("Update playback position error:", error);
        res.status(500).json({ error: "Failed to update playback position" });
    }
};

export const getPlaybackPosition = async (req: AuthRequest, res: Response) => {
    const { voiceMessageId } = req.params;
    const userId = req.user!.userId;

    try {
        const playbackPosition = await prismaClient.voicePlaybackPosition.findUnique({
            where: {
                voiceMessageId_userId: {
                    voiceMessageId,
                    userId,
                },
            },
        });

        res.json(playbackPosition || { position: 0 });
    } catch (error) {
        console.error("Get playback position error:", error);
        res.status(500).json({ error: "Failed to get playback position" });
    }
};
