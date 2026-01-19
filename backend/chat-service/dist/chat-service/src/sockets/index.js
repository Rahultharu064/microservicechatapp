import { Server } from "socket.io";
import { privateChatSocket } from "./privateSocket.js";
import { groupChatSocket } from "./groupSocket.js";
export const initSockets = (io) => {
    privateChatSocket(io);
    groupChatSocket(io);
};
//# sourceMappingURL=index.js.map