import express from "express";
import dotenv from "dotenv";
import uploadRoute from "./routes/uploadRoute.ts";
import downloadRoute from "./routes/downloadRoute.ts";
import chunkRoute from "./routes/chunkRoute.ts";
import voiceRoute from "./routes/voiceRoute.ts";
import videoRoute from "./routes/videoRoute.ts";

import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/media/upload", uploadRoute);
app.use("/api/media/download", downloadRoute);
app.use("/api/media/chunk", chunkRoute);
app.use("/api/media/voice", voiceRoute);
app.use("/api/media/video", videoRoute);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
});

export default app;
