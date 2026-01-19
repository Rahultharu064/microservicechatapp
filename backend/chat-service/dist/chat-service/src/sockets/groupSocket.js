import { Server, Socket } from "socket.io";
import prisma from "../config/db.js";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.js";
import logger from "../../../shared/src/logger/logger.js";
export const groupChatSocket = (io) => {
    io.on("connection", (socket) => {
        const user = socket.user;
        if (!user)
            return;
        socket.on("group:join", (groupId) => {
            // TODO: Verify if user is actually a member of the group in DB
            socket.join(`group:${groupId}`);
            logger.info("User joined group", { userId: user.id, groupId });
        });
        socket.on("group:leave", (groupId) => {
            socket.leave(`group:${groupId}`);
            logger.info("User left group", { userId: user.id, groupId });
        });
        socket.on("group:message:send", async (payload) => {
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
                // Broadcast to group (including sender)
                io.to(`group:${payload.groupId}`).emit("group:message:receive", msg);
                // Publish to RabbitMQ for Notifications
                await publishToQueue("chat.message.sent", {
                    messageId: msg.id,
                    type: "group",
                    groupId: payload.groupId,
                    senderId: user.id,
                    timestamp: msg.createdAt,
                    notification: {
                        title: "New Group Message",
                        body: `New message in group ${payload.groupId}`,
                    }
                }).catch(() => { });
                logger.info("Group message sent", { from: user.id, groupId: payload.groupId });
            }
            catch (err) {
                logger.error("Failed to send group message", err);
                socket.emit("error", { message: "Failed to send group message" });
            }
        });
        socket.on("group:typing:start", (payload) => {
            socket.to(`group:${payload.groupId}`).emit("group:typing:start", { from: user.id, groupId: payload.groupId });
        });
        socket.on("group:typing:stop", (payload) => {
            socket.to(`group:${payload.groupId}`).emit("group:typing:stop", { from: user.id, groupId: payload.groupId });
        });
    });
};
//# sourceMappingURL=groupSocket.js.map