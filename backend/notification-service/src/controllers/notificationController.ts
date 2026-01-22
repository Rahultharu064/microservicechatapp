import { Request, Response } from "express";
import prisma from "../config/db";
import logger from "../../../shared/src/logger/logger";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50
        });
        res.json(notifications);
    } catch (error) {
        logger.error("Failed to get notifications", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        await prisma.notification.update({
            where: { id, userId },
            data: { isRead: true }
        });

        res.json({ success: true });
    } catch (error) {
        logger.error("Failed to mark notification as read", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        let prefs = await prisma.notificationPreference.findUnique({
            where: { userId }
        });

        if (!prefs) {
            prefs = await prisma.notificationPreference.create({
                data: {
                    userId,
                    enabledTypes: "MESSAGE,MENTION,GROUP_INVITE,SYSTEM"
                }
            });
        }

        res.json(prefs);
    } catch (error) {
        logger.error("Failed to get preferences", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updatePreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { enabledTypes, muteUntil } = req.body;

        const prefs = await prisma.notificationPreference.upsert({
            where: { userId },
            update: {
                enabledTypes,
                muteUntil: muteUntil ? new Date(muteUntil) : null
            },
            create: {
                userId,
                enabledTypes: enabledTypes || "MESSAGE,MENTION,GROUP_INVITE,SYSTEM",
                muteUntil: muteUntil ? new Date(muteUntil) : null
            }
        });

        res.json(prefs);
    } catch (error) {
        logger.error("Failed to update preferences", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
