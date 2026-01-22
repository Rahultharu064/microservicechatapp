import { Router } from "express";
import { getNotifications, markAsRead, getPreferences, updatePreferences } from "../controllers/notificationController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

export default router;
