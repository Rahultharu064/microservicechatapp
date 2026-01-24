import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import redisClient from "../../../shared/src/redis/client.js";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.js";
import logger from "../../../shared/src/logger/logger.js";

interface PrivateMessagePayload {
  to: string;
  cipherText: string;
  iv: string;
  senderPublicKey: string;
  burnAfterRead?: boolean;
  media?: {
    id: string;
    type: string;
    filename: string;
  };
}

export const privateChatSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) return;

    socket.join(user.id);

    // Set user online
    redisClient.set(`user:presence:${user.id}`, "online");
    io.emit("user:status", { userId: user.id, status: "online" });
    logger.info("User connected to private socket", { userId: user.id });

    // Handle private message
    socket.on("message:send", async (payload: PrivateMessagePayload) => {
      try {
        const message = await (prisma.privateMessage as any).create({
          data: {
            senderId: user.id,
            receiverId: payload.to,
            cipherText: payload.cipherText, // E2EE: already encrypted by client
            iv: payload.iv,
            senderPublicKey: payload.senderPublicKey,
            burnAfterRead: payload.burnAfterRead ?? false,
            status: "SENT",
          },
        });

        // Save attachment if media is present
        let media = undefined;
        if (payload.media) {
          await (prisma as any).messageAttachment.create({
            data: {
              messageId: message.id,
              messageType: "private",
              mediaId: payload.media.id,
              mediaType: payload.media.type,
              mediaUrl: `/media/download/${payload.media.id}`,
              metadata: JSON.stringify({
                filename: payload.media.filename,
                type: payload.media.type
              })
            }
          });
          media = {
            id: payload.media.id,
            type: payload.media.type,
            filename: payload.media.filename,
            voiceMessage: payload.media.type.startsWith('audio/') ? {
              duration: 0, // Will be populated later
              waveform: []
            } : undefined
          };
        }

        // Relay to recipient (room is the recipient user id)
        const messageWithMedia = { ...message, media };
        const recipientRoom = io.to(payload.to);
        recipientRoom.emit("message:receive", messageWithMedia);

        // Notify sender as ack
        socket.emit("message:sent", { messageId: message.id, status: "SENT" });

        // If recipient currently has any active socket in room, mark as DELIVERED immediately
        const room = io.sockets.adapter.rooms.get(payload.to);
        if (room && room.size > 0) {
          await (prisma.privateMessage as any).update({
            where: { id: message.id },
            data: { status: "DELIVERED" }
          });
          io.to(user.id).emit("message:status", { messageId: message.id, status: "DELIVERED" });
        }

        // Publish to RabbitMQ for Notifications & Analytics
        await publishToQueue("chat.message.sent", {
          messageId: message.id,
          type: "private",
          senderId: user.id,
          receiverId: payload.to,
          timestamp: message.createdAt,
          // For push notifications, we only send a generic notification since it's E2EE
          notification: {
            title: "New Message",
          }
        }).catch(err => logger.error("RabbitMQ Publish failed", err));

        // Publish to Search Service
        await publishToQueue("chat.events", {
          type: "message.created",
          kind: "private",
          id: message.id,
          content: payload.cipherText, // Note: Search service likely needs decrypted content, but for now passing what we have. 
          // REALITY CHECK: Search service cannot search encrypted text. 
          // If E2EE is strict, search is impossible on backend without key.
          // Requirement said "Search" and "E2EE". Usually means client-side search or shared key. 
          // For this task, assuming we pass metadata or available content. 
          // Re-reading 'searchService.ts', it searches 'ChatMessage'. 
          // If 'ChatMessage' in search-service is a different table than 'PrivateMessage' in chat-service, we need to sync.
          // The 'search-service' schema has 'ChatMessage' model. 
          // I will map PrivateMessage to ChatMessage structure for search.
          senderId: user.id,
          chatId: payload.to, // For private, chatId is usually other user id or unique conversation id
          createdAt: message.createdAt
        }).catch(err => logger.error("Search Sync Publish failed", err));

        logger.info("Private message sent", { from: user.id, to: payload.to });
      } catch (err) {
        logger.error("Failed to send private message", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing status
    socket.on("typing:start", (payload: { to: string }) => {
      io.to(payload.to).emit("typing:start", { from: user.id });
    });

    socket.on("typing:stop", (payload: { to: string }) => {
      io.to(payload.to).emit("typing:stop", { from: user.id });
    });

    // Handle read receipts
    socket.on("message:read", async (payload: { messageId: string, from: string }) => {
      try {
        await (prisma.privateMessage as any).update({
          where: { id: payload.messageId },
          data: { status: "READ" }
        });
        io.to(payload.from).emit("message:status", { messageId: payload.messageId, status: "READ", readerId: user.id });

        // Also notify via RabbitMQ that message was read
        await publishToQueue("chat.message.read", {
          messageId: payload.messageId,
          readerId: user.id,
          senderId: payload.from
        }).catch(() => { });
      } catch (err) {
        logger.error("Failed to update read status", err);
      }
    });

    // Handle reactions
    socket.on("message:reaction", async (payload: { messageId: string, emoji: string, action: 'add' | 'remove', to: string }) => {
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

        // Broadcast reaction to both parties
        const reactionEvent = {
          messageId: payload.messageId,
          userId: user.id,
          emoji: payload.emoji,
          action: payload.action
        };
        io.to(payload.to).emit("message:reaction", reactionEvent);
        socket.emit("message:reaction", reactionEvent);

        logger.info(`Reaction ${payload.action}ed`, { from: user.id, messageId: payload.messageId, emoji: payload.emoji });
      } catch (err) {
        logger.error("Failed to handle reaction", err);
      }
    });

    socket.on("disconnect", async () => {
      await redisClient.set(`user:presence:${user.id}`, "offline");
      await redisClient.set(`user:lastSeen:${user.id}`, new Date().toISOString());
      io.emit("user:status", { userId: user.id, status: "offline", lastSeen: new Date() });
      logger.info("User disconnected from private socket", { userId: user.id });
    });

    // Handle message edit
    socket.on("message:edit", async (payload: { messageId: string, cipherText: string, iv: string, to: string }) => {
      try {
        const message = await (prisma.privateMessage as any).update({
          where: { id: payload.messageId, senderId: user.id },
          data: {
            cipherText: payload.cipherText,
            iv: payload.iv
          }
        });

        const updateEvent = {
          messageId: message.id,
          cipherText: message.cipherText,
          iv: message.iv,
          updatedAt: (message as any).updatedAt
        };

        io.to(payload.to).emit("message:edit", updateEvent);
        socket.emit("message:edit", updateEvent);

        logger.info("Private message edited", { userId: user.id, messageId: message.id });
      } catch (err) {
        logger.error("Failed to edit private message", err);
      }
    });

    // Handle message delete
    socket.on("message:delete", async (payload: { messageId: string, to: string }) => {
      try {
        // Complete delete: remove related data first if no FK relations with cascade
        await Promise.all([
          (prisma as any).messageReaction.deleteMany({ where: { messageId: payload.messageId } }),
          (prisma as any).messageAttachment.deleteMany({ where: { messageId: payload.messageId } }),
          (prisma as any).messageReceipt.deleteMany({ where: { messageId: payload.messageId } }),
          (prisma as any).voicePlaybackPosition.deleteMany({ where: { voiceMessageId: payload.messageId } })
        ]).catch(err => logger.error("Orphan cleanup failed", err));

        await (prisma.privateMessage as any).delete({
          where: { id: payload.messageId, senderId: user.id }
        });

        const deleteEvent = {
          messageId: payload.messageId
        };

        io.to(payload.to).emit("message:delete", deleteEvent);
        socket.emit("message:delete", deleteEvent);

        logger.info("Private message completely deleted (hard delete)", { userId: user.id, messageId: payload.messageId });
      } catch (err) {
        logger.error("Failed to delete private message", err);
      }
    });
  });
};
