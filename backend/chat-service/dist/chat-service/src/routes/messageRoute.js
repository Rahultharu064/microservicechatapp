import { Router } from "express";
import * as messageController from "../controllers/messageController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
const router = Router();
router.get("/private/:otherId", authenticateJWT, messageController.getPrivateMessages);
router.get("/group/:groupId", authenticateJWT, messageController.getGroupMessages);
export default router;
//# sourceMappingURL=messageRoute.js.map