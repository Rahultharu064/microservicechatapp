import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import userRoutes from "./routes/userRoute.ts";

const app = express();
app.use(express.json());

// Serve profile pictures
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(dirname(fileURLToPath(import.meta.url)), "../src/uploads")));

// API routes
app.use("/users", userRoutes);

// Health check route
app.get("/health", (_req, res) => {
  res.json({
    service: "user-service",
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

export default app;
