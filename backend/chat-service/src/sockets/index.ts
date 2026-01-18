import { Server } from "socket.io";
import { privateChatSocket } from "./privateSocket.ts";
import { groupChatSocket } from "./groupSocket.ts";

export const initSockets = (io: Server) => {
  privateChatSocket(io);
  groupChatSocket(io);
};
