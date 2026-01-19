import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { uploadVoiceMessage, getVoiceMessage } from "../controllers/voiceController.ts";
import path from "path";

const router = Router();

// Multer Config for voice messages
const storage = multer.diskStorage({
    destination: "temp/voice",
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "voice-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for voice
    fileFilter: (req, file, cb) => {
        // Accept audio files only
        if (file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new Error("Only audio files are allowed"));
        }
    }
});

// Routes
router.post("/upload", authMiddleware as any, upload.single("voice"), uploadVoiceMessage as any);
router.get("/:id", authMiddleware as any, getVoiceMessage as any);

export default router;
