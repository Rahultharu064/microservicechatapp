import { Router } from "express";
import * as reactionController from "../controllers/reactionController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Message reactions
router.post("/message/:messageId", authenticateJWT, reactionController.addReaction);
router.delete("/message/:messageId", authenticateJWT, reactionController.removeReaction);
router.get("/message/:messageId", authenticateJWT, reactionController.getReactions);

// Voice message playback position
router.put("/voice/:voiceMessageId/playback", authenticateJWT, reactionController.updatePlaybackPosition);
router.get("/voice/:voiceMessageId/playback", authenticateJWT, reactionController.getPlaybackPosition);

export default router;
