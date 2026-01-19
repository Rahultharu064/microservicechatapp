import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
    uploadAttachment,
    getAttachment,
    getMessageAttachments,
} from "../controllers/attachmentController.js";

const router = Router();

// Multer config for memory storage (will be forwarded to Media Service)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Routes
router.post(
    "/upload",
    authMiddleware as any,
    upload.single("file"),
    uploadAttachment as any
);
router.get("/:id", authMiddleware as any, getAttachment as any);
router.get(
    "/message/:messageId",
    authMiddleware as any,
    getMessageAttachments as any
);

export default router;
