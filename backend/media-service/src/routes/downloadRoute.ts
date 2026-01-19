import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { downloadMedia, getThumbnail } from "../controllers/downloadController.ts";

const router = Router();

router.get("/:id", authMiddleware as any, downloadMedia as any);
router.get("/:id/thumbnail/:size", authMiddleware as any, getThumbnail as any);

export default router;
