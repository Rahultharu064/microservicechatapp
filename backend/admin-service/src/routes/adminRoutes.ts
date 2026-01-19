import { Router } from "express";
import { adminController } from "../controllers/adminController.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { roleMiddleware } from "../middlewares/roleMiddleware.ts";

const router = Router();

// Publicly accessible (Authenticated) routes
router.post("/reports", authMiddleware, adminController.createReport);

// Admin-only routes
router.use(authMiddleware, roleMiddleware);

router.get("/stats", adminController.getStats);
router.get("/reports", adminController.getReports);
router.put("/reports/:id", adminController.resolveReport);
router.post("/users/:id/suspend", adminController.suspendUser);
router.post("/users/:id/unsuspend", adminController.unsuspendUser);

export default router;
