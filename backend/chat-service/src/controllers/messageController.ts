import type { Request, Response } from "express";
import prisma from "../config/db.js";
import logger from "../../../shared/src/logger/logger.js";
import axios from "axios";

export const getPrivateMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherId } = req.params;
    const { limit = "50", offset = "0", beforeId } = req.query as { limit?: string; offset?: string; beforeId?: string };

    const otherIdStr = otherId as string;
    let messages;
    if (beforeId) {
      // Anchor by the beforeId message's timestamp; then fetch older than that (stable with id tie-breaker)
      const anchor = await prisma.privateMessage.findUnique({ where: { id: beforeId as string } });
      const anchorTime = anchor?.createdAt || new Date();

      messages = await prisma.privateMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherIdStr },
            { senderId: otherIdStr, receiverId: userId },
          ],
          AND: [
            {
              OR: [
                { createdAt: { lt: anchorTime } },
                { createdAt: anchorTime, id: { lt: beforeId as string } },
              ],
            },
            { status: { not: "DELETED" as any } },
          ],
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: parseInt(limit as string),
      });
    } else {
      messages = await prisma.privateMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherIdStr },
            { senderId: otherIdStr, receiverId: userId },
          ],
          status: { not: "DELETED" as any },
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });
    }

    const messageIds = messages.map(m => m.id);
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: { in: messageIds } }
    });

    const attachments = await prisma.messageAttachment.findMany({
      where: { messageId: { in: messageIds }, messageType: "private" }
    });

    const messagesWithReactions = messages.map(m => {
      const msgReactions = reactions.filter((r: any) => r.messageId === m.id);
      const msgAttachments = attachments.filter((a: any) => a.messageId === m.id);

      let media = undefined;
      if (msgAttachments.length > 0) {
        const att = msgAttachments[0]!;
        const metadata = att.metadata ? JSON.parse(att.metadata) : {};
        media = {
          id: att.mediaId,
          type: att.mediaType,
          filename: metadata.filename || 'file',
          voiceMessage: att.mediaType.startsWith('audio/') ? {
            duration: metadata.duration || 0,
            waveform: metadata.waveform || []
          } : undefined
        };
      }

      return {
        ...m,
        reactions: msgReactions,
        media
      };
    });

    res.json(messagesWithReactions.reverse());
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
      where: {
        groupId: groupIdStr,
        status: { not: "DELETED" as any }
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const messageIds = messages.map((m: any) => m.id);
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: { in: messageIds } }
    });

    const attachments = await prisma.messageAttachment.findMany({
      where: { messageId: { in: messageIds }, messageType: "group" }
    });

    const messagesWithReactions = messages.map((m: any) => {
      const msgReactions = reactions.filter((r: any) => r.messageId === m.id);
      const msgAttachments = attachments.filter((a: any) => a.messageId === m.id);

      let media = undefined;
      if (msgAttachments.length > 0) {
        const att = msgAttachments[0]!;
        const metadata = att.metadata ? JSON.parse(att.metadata) : {};
        media = {
          id: att.mediaId,
          type: att.mediaType,
          filename: metadata.filename || 'file',
          voiceMessage: att.mediaType.startsWith('audio/') ? {
            duration: metadata.duration || 0,
            waveform: metadata.waveform || []
          } : undefined
        };
      }

      return {
        ...m,
        reactions: msgReactions,
        media
      };
    });

    res.json(messagesWithReactions.reverse());
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

    // Get all groups involving the user
    // Look up memberships first
    const memberships = await prisma.groupMember.findMany({
      where: { userId }
    });

    const groupIds = memberships.map(m => m.groupId);
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } }
    });

    const lastGroupMessages = await Promise.all(
      groupIds.map(async (gid) => {
        return prisma.groupMessage.findFirst({
          where: { groupId: gid },
          orderBy: { createdAt: 'desc' }
        });
      })
    );

    const conversationMap = new Map();

    // Add private conversations
    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          id: partnerId,
          type: 'PRIVATE',
          participants: [{ id: userId }, { id: partnerId }],
          lastMessage: msg,
          unreadCount: 0
        });
      }
    }

    // Add groups
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]!;
      const lastMsg = lastGroupMessages[i];
      conversationMap.set(g.id, {
        id: g.id,
        type: 'GROUP',
        name: g.name,
        description: g.description,
        inviteCode: g.inviteCode,
        participants: [], // Will be filled or managed by frontend
        lastMessage: lastMsg,
        unreadCount: 0
      });
    }

    let conversations = Array.from(conversationMap.values());

    // Optional enrichment: attach partner fullName/profile from User Service if configured
    const userServiceUrl = process.env.USER_SERVICE_URL || process.env.API_GATEWAY_URL;

    if (userServiceUrl) {
      try {
        // Collect unique partner IDs
        const partnerIds = Array.from(new Set(conversations.map((c: any) => {
          const p = c.participants?.find((p: any) => String(p.id) !== String(userId));
          return p?.id as string | undefined;
        }).filter(Boolean))) as string[];

        const baseUrl = userServiceUrl.replace(/\/$/, '');
        const profileMap = new Map<string, { id: string; fullName: string; profilePic?: string }>();

        // Try batch endpoint first: GET /users?ids=a,b,c
        let batchOk = false;
        try {
          const query = encodeURIComponent(partnerIds.join(','));
          const batchResp = await axios.get(`${baseUrl}/users?ids=${query}`, { validateStatus: () => true });
          if (batchResp.status === 200 && Array.isArray(batchResp.data)) {
            for (const u of batchResp.data) {
              if (!u || !u.id) continue;
              profileMap.set(String(u.id), {
                id: String(u.id),
                fullName: u.fullName || u.name || u.email || 'Unknown',
                profilePic: u.profilePic || undefined,
              });
            }
            batchOk = true;
          }
        } catch (e: any) {
          logger.warn('Batch user fetch failed, falling back to individual', { error: e.message });
        }

        // Fallback to per-id if batch not available
        if (!batchOk) {
          const profiles = await Promise.all(
            partnerIds.map(async (id) => {
              try {
                const resp = await axios.get(`${baseUrl}/users/${id}`);
                const data = resp.data;
                return {
                  id: String(id),
                  fullName: data.fullName || data.name || data.email || 'Unknown',
                  profilePic: data.profilePic || undefined,
                  lastSeen: data.lastSeen || undefined
                };
              } catch {
                return null;
              }
            })
          );
          for (const p of profiles) if (p) profileMap.set(p.id, p);
        }

        // Replace participant stubs with enriched data where available
        conversations = conversations.map((c: any) => {
          const parts = c.participants || [];
          const enriched = parts.map((p: any) => {
            const prof = profileMap.get(String(p.id));
            return prof ? { id: prof.id, fullName: prof.fullName, profilePic: prof.profilePic } : p;
          });
          return { ...c, participants: enriched };
        });
      } catch (e) {
        // best-effort enrichment; continue without blocking
        logger.warn('Conversation enrichment failed', e as any);
      }
    }

    res.json(conversations);
  } catch (err) {
    logger.error("Failed to fetch conversations", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await prisma.privateMessage.count({
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
