import { Router } from "express";
import { getProfile, updateProfile, deleteUser, getAllUsers } from "../controllers/userController.ts";
import { authMiddleware } from "../middlewares/authMiddleware.ts";
import { upload } from "../middlewares/uploadMiddleware.ts";

const router = Router();

router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, upload.single("profilePic"), updateProfile);
router.delete("/me", authMiddleware, deleteUser);
router.get("/", authMiddleware, getAllUsers);

export default router;
