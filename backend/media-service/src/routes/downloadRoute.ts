import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { downloadMedia, downloadVoice, downloadVideo, getThumbnail } from "../controllers/downloadController.ts";

const router = Router();

router.get("/:id", downloadMedia as any);
router.get("/voice/:voiceMessageId", authMiddleware as any, downloadVoice as any);
router.get("/video/:id", authMiddleware as any, downloadVideo as any);
router.get("/:id/thumbnail/:size", getThumbnail as any);

export default router;
