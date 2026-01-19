import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import messageRoutes from "./routes/messageRoute.js";
import { initSockets } from "./sockets/index.js";
import logger from "../../shared/src/logger/logger.js";
dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust in production
        methods: ["GET", "POST"],
    },
});
app.use(cors());
app.use(express.json());
// Routes
app.use("/api/messages", messageRoutes);
// Socket handlers
initSockets(io);
export { app, httpServer, io };
//# sourceMappingURL=app.js.map