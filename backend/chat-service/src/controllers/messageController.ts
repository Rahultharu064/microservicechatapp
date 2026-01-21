import type { Request, Response } from "express";
import prisma from "../config/db.js";
import logger from "../../../shared/src/logger/logger.js";

export const getPrivateMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const otherIdStr = otherId as string;
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherIdStr },
          { senderId: otherIdStr, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(messages.reverse());
  } catch (err) {
    logger.error("Failed to fetch private messages", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const groupIdStr = groupId as string;
    const messages = await prisma.groupMessage.findMany({
      where: { groupId: groupIdStr },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(messages.reverse());
  } catch (err) {
    logger.error("Failed to fetch group messages", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const syncMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { lastSync } = req.query;

    if (!lastSync) {
      return res.status(400).json({ error: "lastSync timestamp is required" });
    }

    const syncDate = new Date(lastSync as string);

    const privateMessages = await prisma.privateMessage.findMany({
      where: {
        receiverId: userId,
        createdAt: { gt: syncDate },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ privateMessages });
  } catch (err) {
    logger.error("Failed to sync messages", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Fetch unique participants from PrivateMessage
    // This is a simplified approach for getting "conversations"
    // In a real app, you might have a Conversation model.
    // Here we query sent and received messages to find unique partners.

    // Get all private messages involving the user
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const conversationMap = new Map();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          id: partnerId, // Using partnerId as conversation id for simplicity
          participants: [{ id: userId }, { id: partnerId }], // Needs full user details from User service ideally
          lastMessage: msg,
          unreadCount: 0 // Simplified
        });
      }
    }

    const conversations = Array.from(conversationMap.values());

    // Note: To match the frontend expectation of full participant objects, 
    // the frontend currently expects { id, fullName, profilePic }.
    // Since this is a microservice, we don't have user names here. 
    // We should either fetch from User service or rely on frontend to enrich.
    // HOWEVER, Dashboard.tsx uses allUsers to find names if missing in participant list.
    // I will return basic structure and let frontend handle enrichment if needed, 
    // but better if I return what it expects if possible.

    // Actually, Dashboard.tsx:69: const otherUser = activeConversation?.participants.find(p => p.id === activeChat) || allUsers.find(u => u.id === activeChat);
    // So if I return participants with just IDs, it might work if names are fetched elsewhere.

    res.json(conversations);
  } catch (err) {
    logger.error("Failed to fetch conversations", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await (prisma.privateMessage as any).count({
      where: {
        receiverId: userId,
        status: { not: "READ" }
      }
    });
    res.json({ unreadCount: count });
  } catch (err) {
    logger.error("Failed to get unread count", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
