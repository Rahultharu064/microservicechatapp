import express from "express";
import cors from "cors";
import notificationRoutes from "./routes/notificationRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[Notification Service] ${req.method} ${req.url}`);
    next();
});

app.get("/api/notifications/health", (req, res) => {
    res.json({ service: "notification-service", status: "UP" });
});

app.use("/api/notifications", notificationRoutes);

export default app;
