import express from "express";
import healthRoutes from "../src/routes/healthRoute.ts";

const app = express();
app.use(express.json());
app.use("/health", healthRoutes);

export default app;
