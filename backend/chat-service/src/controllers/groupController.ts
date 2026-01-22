import { Request, Response } from "express";
import prisma from "../config/db.js";
import logger from "../../../shared/src/logger/logger.js";
import { v4 as uuidv4 } from 'uuid';

export const createGroup = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { name, description, isPublic, encryptedGroupKey, keyVersion } = req.body;

        const group = await (prisma as any).group.create({
            data: {
                name,
                description,
                isPublic: isPublic ?? false,
                inviteCode: uuidv4(),
            },
        });

        await (prisma as any).groupMember.create({
            data: {
                groupId: group.id,
                userId,
                role: "ADMIN",
                encryptedGroupKey,
                keyVersion,
            },
        });

        res.status(201).json(group);
    } catch (err) {
        logger.error("Failed to create group", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const joinByInviteCode = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { inviteCode, encryptedGroupKey, keyVersion } = req.body;

        const group = await (prisma as any).group.findUnique({
            where: { inviteCode },
        });

        if (!group) {
            return res.status(404).json({ error: "Invalid invite code" });
        }

        const existingMember = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId: group.id,
                    userId,
                },
            },
        });

        if (existingMember) {
            return res.status(400).json({ error: "Already a member" });
        }

        const member = await (prisma as any).groupMember.create({
            data: {
                groupId: group.id,
                userId,
                role: "MEMBER",
                encryptedGroupKey,
                keyVersion,
            },
        });

        res.json({ success: true, group, member });
    } catch (err) {
        logger.error("Failed to join group by invite code", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { groupId } = req.params;
        const { name, description, isPublic } = req.body;

        const member = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId },
            },
        });

        if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
            return res.status(403).json({ error: "Access denied: insufficient permissions" });
        }

        const updatedGroup = await (prisma as any).group.update({
            where: { id: groupId },
            data: {
                name,
                description,
                isPublic,
            },
        });

        res.json(updatedGroup);
    } catch (err) {
        logger.error("Failed to update group", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateMemberRole = async (req: Request, res: Response) => {
    try {
        const myUserId = (req as any).user.id;
        const { groupId, userId } = req.params;
        const { role } = req.body;

        const myMember = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId: myUserId },
            },
        });

        if (!myMember || myMember.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can change roles" });
        }

        const updatedMember = await (prisma as any).groupMember.update({
            where: {
                groupId_userId: { groupId, userId },
            },
            data: { role },
        });

        res.json(updatedMember);
    } catch (err) {
        logger.error("Failed to update member role", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const removeMember = async (req: Request, res: Response) => {
    try {
        const myUserId = (req as any).user.id;
        const { groupId, userId } = req.params;

        const myMember = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId: myUserId },
            },
        });

        const targetMember = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId },
            },
        });

        if (!myMember || !targetMember) {
            return res.status(404).json({ error: "Member not found" });
        }

        // Admins can remove anyone, Moderators can remove Members
        const canRemove = myMember.role === "ADMIN" ||
            (myMember.role === "MODERATOR" && targetMember.role === "MEMBER") ||
            myUserId === userId; // Self-leave

        if (!canRemove) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        await (prisma as any).groupMember.delete({
            where: {
                groupId_userId: { groupId, userId },
            },
        });

        res.json({ success: true });
    } catch (err) {
        logger.error("Failed to remove member", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const regenerateInviteCode = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { groupId } = req.params;

        const member = await (prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId },
            },
        });

        if (!member || member.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can regenerate invite codes" });
        }

        const updatedGroup = await (prisma as any).group.update({
            where: { id: groupId },
            data: { inviteCode: uuidv4() },
        });

        res.json({ inviteCode: updatedGroup.inviteCode });
    } catch (err) {
        logger.error("Failed to regenerate invite code", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
