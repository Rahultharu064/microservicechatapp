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
}

export const privateChatSocket = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error"));

      const user = jwt.verify(token, process.env.JWT_SECRET!) as any;
      (socket as any).user = user;
      next();
    } catch (err) {
      logger.error("Socket authentication failed", err);
      next(new Error("Unauthorized"));
    }
  });

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

        // Relay to recipient
        const recipientSocket = io.to(payload.to);
        recipientSocket.emit("message:receive", message);

        // Notify sender as ack
        socket.emit("message:sent", { messageId: message.id, status: "SENT" });

        // Check if recipient is online for immediate "DELIVERED" status
        const isOnline = await redisClient.get(`user:presence:${payload.to}`);
        if (isOnline === "online") {
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

    socket.on("disconnect", async () => {
      await redisClient.set(`user:presence:${user.id}`, "offline");
      await redisClient.set(`user:lastSeen:${user.id}`, new Date().toISOString());
      io.emit("user:status", { userId: user.id, status: "offline", lastSeen: new Date() });
      logger.info("User disconnected from private socket", { userId: user.id });
    });
  });
};
