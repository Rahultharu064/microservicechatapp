import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { uploadMedia, uploadMultipleMedia } from "../controllers/uploadController.ts";
import path from "path";

const router = Router();

// Multer Config
const storage = multer.diskStorage({
    destination: "temp/uploads",
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Routes
router.post("/single", authMiddleware as any, upload.single("file"), uploadMedia as any);
router.post("/multiple", authMiddleware as any, upload.array("files", 10), uploadMultipleMedia as any);

export default router;
