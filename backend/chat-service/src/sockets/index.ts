import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { privateChatSocket } from "./privateSocket.js";
import { groupChatSocket } from "./groupSocket.js";
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
        return next(new Error("Token expired. Please login again."));
      }
      logger.error("Socket authentication failed", err);
      next(new Error("Unauthorized"));
    }
  });

  privateChatSocket(io);
  groupChatSocket(io);
};
