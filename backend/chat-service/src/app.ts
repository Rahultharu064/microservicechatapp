import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import messageRoutes from "./routes/messageRoute.js";
import groupRoutes from "./routes/groupRoute.js";
import attachmentRoutes from "./routes/attachmentRoute.js";
import reactionRoutes from "./routes/reactionRoute.js";
// import fileRoutes from "./routes/fileRoute.js";
import { initSockets } from "./sockets/index.js";
import logger from "../../shared/src/logger/logger.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"],
        credentials: true,
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
});

app.use(cors());
app.get("/health", (req, res) => {
    res.json({ service: "chat-service", status: "UP" });
});

app.use(express.json());

// Routes
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/reactions", reactionRoutes);

// Socket handlers
initSockets(io);

// Engine-level diagnostics to avoid silent crashes and aid reconnection
io.engine.on("connection_error", (err) => {
    logger.warn("Socket engine connection error", { message: err.message, code: (err as any).code });
});

io.engine.on("close", (reason) => {
    logger.info("Socket engine closed", { reason });
});

export { app, httpServer, io };
