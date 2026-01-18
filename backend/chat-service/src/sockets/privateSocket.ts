import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/db.ts";
import redisClient from '../../../shared/src/redis/client.ts';
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.ts";
import logger from "../../../shared/src/logger/logger.ts";

interface PrivateMessagePayload {
  to: string;
  cipherText: string;
  iv: string;
  senderPublicKey: string;
  burnAfterRead?: boolean;
}

export const privateChatSocket = (io: Server) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const user = jwt.verify(token, process.env.JWT_SECRET!);
      (socket as any).user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: any) => {
    const user = socket.user;
    socket.join(user.id);

    // Presence
    redisClient.set(`user:online:${user.id}`, "1");
    logger.info("User online", { userId: user.id });

    socket.on("send_private_message", async (payload: PrivateMessagePayload) => {
      const message = await prisma.privateMessage.create({
        data: {
          senderId: user.id,
          receiverId: payload.to,
          cipherText: payload.cipherText,
          iv: payload.iv,
          senderPublicKey: payload.senderPublicKey,
          burnAfterRead: payload.burnAfterRead ?? false,
        },
      });

      // Publish event
      await publishToQueue("chat.message.sent", {
        messageId: message.id,
        senderId: user.id,
        receiverId: payload.to,
      });

      io.to(payload.to).emit("receive_private_message", message);

      logger.info("Private message sent", {
        from: user.id,
        to: payload.to,
      });
    });
    socket.on("disconnect", async () => {
      await redisClient.del(`user:online:${user.id}`);
      await redisClient.set(
        `user:lastSeen:${user.id}`,
        new Date().toISOString()
      );
      logger.info("User offline", { userId: user.id });
    });
  });
};
