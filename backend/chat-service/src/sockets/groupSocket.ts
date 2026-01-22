import { Server, Socket } from "socket.io";
import prisma from "../config/db.js";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.js";
import logger from "../../../shared/src/logger/logger.js";

interface GroupMessagePayload {
  groupId: string;
  cipherText: string;
  iv: string;
  keyVersion: number;
}

export const groupChatSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) return;

    socket.on("group:join", async (groupId: string) => {
      try {
        const membership = await (prisma as any).groupMember.findUnique({
          where: {
            groupId_userId: { groupId, userId: user.id }
          }
        });

        if (!membership) {
          logger.warn("Unauthorized group join attempt", { userId: user.id, groupId });
          return socket.emit("error", { message: "You are not a member of this group" });
        }

        socket.join(`group:${groupId}`);
        logger.info("User joined group socket", { userId: user.id, groupId, role: membership.role });
      } catch (err) {
        logger.error("Failed to join group socket", err);
      }
    });

    socket.on("group:leave", (groupId: string) => {
      socket.leave(`group:${groupId}`);
      logger.info("User left group", { userId: user.id, groupId });
    });

    socket.on("group:message:send", async (payload: GroupMessagePayload) => {
      try {
        const msg = await prisma.groupMessage.create({
          data: {
            groupId: payload.groupId,
            senderId: user.id,
            cipherText: payload.cipherText, // E2EE
            iv: payload.iv,
            keyVersion: payload.keyVersion,
          },
        });

        // Broadcast to group (including sender) with sender details
        io.to(`group:${payload.groupId}`).emit("group:message:receive", {
          ...msg,
          sender: {
            id: user.id,
            fullName: user.fullName || 'Unknown'
          }
        });

        // Fetch group members to notify (except sender)
        const members = await (prisma as any).groupMember.findMany({
          where: { groupId: payload.groupId },
          select: { userId: true }
        });
        const recipientIds = members
          .map((m: any) => m.userId)
          .filter((id: string) => id !== user.id);

        // Publish to RabbitMQ for Notifications
        await publishToQueue("chat.message.sent", {
          messageId: msg.id,
          type: "group",
          groupId: payload.groupId,
          senderId: user.id,
          recipientIds,
          timestamp: msg.createdAt,
          notification: {
            title: "New Group Message",
            body: `New message in group ${payload.groupId}`,
          }
        }).catch(() => { });

        // Publish to Search Service
        await publishToQueue("chat.events", {
          type: "message.created",
          kind: "group",
          id: msg.id,
          content: payload.cipherText,
          senderId: user.id,
          chatId: payload.groupId,
          createdAt: msg.createdAt
        }).catch(err => logger.error("Search Sync Publish failed", err));

        logger.info("Group message sent", { from: user.id, groupId: payload.groupId });
      } catch (err) {
        logger.error("Failed to send group message", err);
        socket.emit("error", { message: "Failed to send group message" });
      }
    });

    socket.on("group:typing:start", (payload: { groupId: string }) => {
      socket.to(`group:${payload.groupId}`).emit("group:typing:start", { from: user.id, groupId: payload.groupId });
    });

    socket.on("group:typing:stop", (payload: { groupId: string }) => {
      socket.to(`group:${payload.groupId}`).emit("group:typing:stop", { from: user.id, groupId: payload.groupId });
    });

    // Handle group message reactions
    socket.on("group:message:reaction", async (payload: { messageId: string, groupId: string, emoji: string, action: 'add' | 'remove' }) => {
      try {
        if (payload.action === 'add') {
          await (prisma as any).messageReaction.upsert({
            where: {
              messageId_userId_emoji: {
                messageId: payload.messageId,
                userId: user.id,
                emoji: payload.emoji
              }
            },
            create: {
              messageId: payload.messageId,
              userId: user.id,
              emoji: payload.emoji
            },
            update: {}
          });
        } else {
          await (prisma as any).messageReaction.delete({
            where: {
              messageId_userId_emoji: {
                messageId: payload.messageId,
                userId: user.id,
                emoji: payload.emoji
              }
            }
          });
        }

        // Broadcast to group
        io.to(`group:${payload.groupId}`).emit("group:message:reaction", {
          messageId: payload.messageId,
          userId: user.id,
          emoji: payload.emoji,
          action: payload.action,
          groupId: payload.groupId
        });

        logger.info(`Group reaction ${payload.action}ed`, { from: user.id, messageId: payload.messageId, emoji: payload.emoji });
      } catch (err) {
        logger.error("Failed to handle group reaction", err);
      }
    });

    // Handle group message edit
    socket.on("group:message:edit", async (payload: { messageId: string, groupId: string, cipherText: string, iv: string }) => {
      try {
        const message = await prisma.groupMessage.update({
          where: { id: payload.messageId, senderId: user.id, groupId: payload.groupId },
          data: {
            cipherText: payload.cipherText,
            iv: payload.iv
          }
        });

        const updateEvent = {
          messageId: message.id,
          groupId: message.groupId,
          cipherText: message.cipherText,
          iv: message.iv,
          updatedAt: message.updatedAt
        };

        io.to(`group:${payload.groupId}`).emit("group:message:edit", updateEvent);
        logger.info("Group message edited", { userId: user.id, messageId: message.id });
      } catch (err) {
        logger.error("Failed to edit group message", err);
      }
    });

    // Handle group message delete
    socket.on("group:message:delete", async (payload: { messageId: string, groupId: string }) => {
      try {
        const message = await prisma.groupMessage.update({
          where: { id: payload.messageId, senderId: user.id, groupId: payload.groupId },
          data: {
            status: "DELETED" as any, // Using any because generate might not have finished
            cipherText: "MESSAGE_DELETED",
            iv: "DELETED"
          }
        });

        const deleteEvent = {
          messageId: message.id,
          groupId: message.groupId,
          status: "DELETED"
        };

        io.to(`group:${payload.groupId}`).emit("group:message:receive", { ...message, status: "DELETED" }); // Re-emit to update UI
        io.to(`group:${payload.groupId}`).emit("group:message:delete", deleteEvent);

        logger.info("Group message deleted", { userId: user.id, messageId: message.id });
      } catch (err) {
        logger.error("Failed to delete group message", err);
      }
    });
  });
};
