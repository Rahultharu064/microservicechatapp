import { Router } from "express";
import * as groupController from "../controllers/groupController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticateJWT);

router.post("/", groupController.createGroup);
router.post("/join", groupController.joinByInviteCode);
router.put("/:groupId", groupController.updateGroup);
router.post("/:groupId/regenerate-invite", groupController.regenerateInviteCode);
router.put("/:groupId/members/:userId/role", groupController.updateMemberRole);
router.delete("/:groupId/members/:userId", groupController.removeMember);

export default router;
