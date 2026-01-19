import express from "express";
import adminRoutes from "./routes/adminRoutes.ts";

const app = express();

app.use(express.json());

// Routes
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "admin-service" });
});

export default app;
