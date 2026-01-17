import express from "express";
import dotenv from "dotenv";
import logger from "@shared/logger/logger.js";


dotenv.config();
const app = express();
app.use(express.json());
app.use((err: any, req: any, res: any, next: any) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;
