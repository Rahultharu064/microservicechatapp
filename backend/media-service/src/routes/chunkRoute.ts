import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { uploadChunk, assembleChunks } from "../controllers/chunkController.ts";
import path from "path";

const router = Router();

// Multer Config for chunks
const storage = multer.diskStorage({
    destination: "temp/chunks-upload",
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per chunk
});

// Routes
router.post("/upload", authMiddleware as any, upload.single("chunk"), uploadChunk as any);
router.post("/assemble", authMiddleware as any, assembleChunks as any);

export default router;
