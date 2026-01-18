import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { getPrivateMessages } from "../controllers/messageController.ts";
import { getGroupMessages } from "../controllers/messageController.ts";

const router = Router();

router.get("/private/:userId", authMiddleware, getPrivateMessages);
router.get("/group/:groupId", authMiddleware, getGroupMessages);    


export default router;
