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
                    },
                });
                // Relay to recipient
                io.to(payload.to).emit("message:receive", message);
                // Notify sender as ack (optional, but good for UI)
                socket.emit("message:sent", { messageId: message.id, status: "delivered" });
                // Publish to RabbitMQ for other services (notifications, search)
                await publishToQueue("chat.message.sent", {
                    messageId: message.id,
                    type: "private",
                    senderId: user.id,
                    receiverId: payload.to,
                });
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
            // Typically update DB here if needed, or just relay
            io.to(payload.from).emit("message:read", { messageId: payload.messageId, readerId: user.id });
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