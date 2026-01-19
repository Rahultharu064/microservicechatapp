import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware.ts";
import fs from "fs/promises";
import path from "path";
import { handleUpload } from "../services/uploadService.ts";

const CHUNK_TEMP_DIR = "temp/chunks";

export const uploadChunk = async (req: AuthRequest, res: Response) => {
    const { uploadId, index } = req.body;
    const file = req.file;

    if (!file || !uploadId || index === undefined) {
        return res.status(400).json({ error: "Missing required chunk data" });
    }

    const chunkDir = path.join(CHUNK_TEMP_DIR, uploadId);
    await fs.mkdir(chunkDir, { recursive: true });

    const chunkPath = path.join(chunkDir, `chunk-${index}`);
    await fs.rename(file.path, chunkPath);

    res.status(200).json({ message: `Chunk ${index} uploaded successfully` });
};

export const assembleChunks = async (req: AuthRequest, res: Response) => {
    const { uploadId, filename, mimeType, totalChunks } = req.body;
    const userId = req.user!.userId;

    if (!uploadId || !filename || !totalChunks) {
        return res.status(400).json({ error: "Missing assembly data" });
    }

    const chunkDir = path.join(CHUNK_TEMP_DIR, uploadId);
    const combinedPath = path.join(CHUNK_TEMP_DIR, `${uploadId}_assembled`);

    try {
        // Create an empty file to start appending
        await fs.writeFile(combinedPath, "");

        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(chunkDir, `chunk-${i}`);
            const chunkBuffer = await fs.readFile(chunkPath);
            await fs.appendFile(combinedPath, chunkBuffer);
            await fs.unlink(chunkPath); // Delete chunk after appending
        }

        // Cleanup chunk directory
        await fs.rm(chunkDir, { recursive: true, force: true });

        // Reuse handleUpload logic by creating a dummy Multer file object
        const stats = await fs.stat(combinedPath);
        const dummyFile: any = {
            path: combinedPath,
            filename: `${uploadId}_final`,
            originalname: filename,
            mimetype: mimeType || "application/octet-stream",
            size: stats.size,
        };

        const media = await handleUpload(dummyFile, userId);

        res.status(201).json(media);
    } catch (error) {
        console.error("Assembly error:", error);
        res.status(500).json({ error: "Failed to assemble chunks" });
    }
};
