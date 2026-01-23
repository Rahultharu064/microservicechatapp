import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import {
    uploadVideoMessage,
    getVideoMessage,
    getVideoThumbnail,
} from "../controllers/videoController.ts";
import path from "path";

const router = Router();

// Multer Config for video messages
const storage = multer.diskStorage({
    destination: "temp/video",
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "video-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video
    fileFilter: (req, file, cb) => {
        // Accept video files only
        const allowedMimeTypes = [
            "video/mp4",
            "video/quicktime", // MOV
            "video/x-msvideo", // AVI
            "video/webm",
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only video files are allowed (MP4, MOV, AVI, WEBM)"));
        }
    },
});

// Routes
router.post("/upload", authMiddleware as any, upload.single("video"), uploadVideoMessage as any);
router.get("/:id", authMiddleware as any, getVideoMessage as any);
router.get("/:id/thumbnail", authMiddleware as any, getVideoThumbnail as any);

export default router;
