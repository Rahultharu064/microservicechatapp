import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import redisClient from "../../../shared/src/redis/client.js";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.js";
import logger from "../../../shared/src/logger/logger.js";
export const privateChatSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token)
                return next(new Error("Authentication error"));
            const user = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = user;
            next();
        }
        catch (err) {
            logger.error("Socket authentication failed", err);
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        const user = socket.user;
        if (!user)
            return;
        socket.join(user.id);
        // Set user online
        redisClient.set(`user:presence:${user.id}`, "online");
        io.emit("user:status", { userId: user.id, status: "online" });
        logger.info("User connected to private socket", { userId: user.id });
        // Handle private message
        socket.on("message:send", async (payload) => {
            try {
                const message = await prisma.privateMessage.create({
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
                    await prisma.privateMessage.update({
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
                        body: "You have a new encrypted message",
                    }
                }).catch(err => logger.error("RabbitMQ Publish failed", err));
                logger.info("Private message sent", { from: user.id, to: payload.to });
            }
            catch (err) {
                logger.error("Failed to send private message", err);
                socket.emit("error", { message: "Failed to send message" });
            }
        });
        // Handle typing status
        socket.on("typing:start", (payload) => {
            io.to(payload.to).emit("typing:start", { from: user.id });
        });
        socket.on("typing:stop", (payload) => {
            io.to(payload.to).emit("typing:stop", { from: user.id });
        });
        // Handle read receipts
        socket.on("message:read", async (payload) => {
            try {
                await prisma.privateMessage.update({
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
            }
            catch (err) {
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
//# sourceMappingURL=privateSocket.js.map