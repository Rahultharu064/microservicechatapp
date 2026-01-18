import { Server } from "socket.io";
import  prisma  from "../config/db.ts";
import logger from "../../../shared/src/logger/logger.ts";
import { publishToQueue } from "../../../shared/src/rabbitmq/connection.ts";

interface GroupMessagePayload {
  groupId: string;
  cipherText: string;
  iv: string;
  keyVersion: number;
}

export const groupChatSocket = (io: Server) => {
  io.on("connection", (socket: any) => {
    socket.on("join_group", (groupId: string) => {
      socket.join(groupId);
      logger.info("Joined group", { userId: socket.user.id, groupId });
    });

    socket.on("send_group_message", async (payload: GroupMessagePayload) => {
      const msg = await prisma.groupMessage.create({
        data: {
          groupId: payload.groupId,
          senderId: socket.user.id,
          cipherText: payload.cipherText,
          iv: payload.iv,
          keyVersion: payload.keyVersion,
        },
      });

      await publishToQueue("chat.message.sent", {
        groupId: payload.groupId,
        senderId: socket.user.id,
      });

      io.to(payload.groupId).emit("receive_group_message", msg);
    });
  });
};
