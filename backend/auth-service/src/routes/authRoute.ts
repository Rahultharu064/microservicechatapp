import { Router } from "express";
import { login, verifyLogin, refreshToken } from "../controllers/authController.ts";
import { rateLimit } from "../middlewares/ratelimitMiddleware.ts";
import { validate } from "../middlewares/validateMiddleware.ts";
import { loginSchema, verifyOtpSchema, refreshTokenSchema } from "../validators/authValidator.ts";

const router = Router();

router.post("/login", rateLimit({ limit: 5, windowSeconds: 600 }), validate(loginSchema), login);
router.post("/verify-otp", rateLimit({ limit: 5, windowSeconds: 600 }), validate(verifyOtpSchema), verifyLogin);
router.post("/refresh", rateLimit({ limit: 10, windowSeconds: 900 }), validate(refreshTokenSchema), refreshToken);

export default router;
