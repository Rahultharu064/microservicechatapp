import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { privateChatSocket } from "./privateSocket.js";
import { groupChatSocket } from "./groupSocket.js";
import prisma from "../config/db.js";
import logger from "../../../shared/src/logger/logger.js";

export const initSockets = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const userId = decoded.userId || decoded.id || decoded.sub;

      (socket as any).user = {
        ...decoded,
        id: userId
      };
      next();
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        logger.error("Socket authentication failed: Token expired");
        const e: any = new Error("AUTH_EXPIRED");
        e.name = "AUTH_EXPIRED";
        return next(e);
      }
      logger.error("Socket authentication failed", err);
      next(new Error("Unauthorized"));
    }
  });

  privateChatSocket(io);
  groupChatSocket(io);

  // Global connection diagnostics
  io.on("connection", (socket) => {
    const user = (socket as any).user;

    socket.on("error", (err) => {
      logger.warn("Socket error", { socketId: socket.id, message: (err as any)?.message });
    });

    socket.on("disconnect", async (reason) => {
      logger.info("User disconnected", { userId: user?.id, socketId: socket.id, reason });

      if (user?.id) {
        try {
          const now = new Date();
          await (prisma.user as any).update({
            where: { id: user.id },
            data: { lastSeen: now }
          });

          // Broadcast offline status with lastSeen time
          io.emit("user:status", {
            userId: user.id,
            status: "offline",
            lastSeen: now
          });
        } catch (err) {
          logger.error("Failed to update lastSeen on disconnect", err);
        }
      }
    });
  });
};
