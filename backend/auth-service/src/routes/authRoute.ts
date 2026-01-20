import { Router } from "express";
import {
  register,
  login,
  verifyLogin,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail
} from "../controllers/authController.ts";
import { rateLimit } from "../middlewares/ratelimitMiddleware.ts";
import { validate } from "../middlewares/validateMiddleware.ts";
import {
  registerSchema,
  loginSchema,
  verifyLoginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "../validators/authValidator.ts";

const router = Router();

router.post("/register", rateLimit({ limit: 3, windowSeconds: 3600 }), validate(registerSchema), register);
router.post("/login", rateLimit({ limit: 5, windowSeconds: 600 }), validate(loginSchema), login);
router.post("/verify-login", rateLimit({ limit: 5, windowSeconds: 600 }), validate(verifyLoginSchema), verifyLogin);
router.post("/refresh", rateLimit({ limit: 10, windowSeconds: 900 }), validate(refreshTokenSchema), refreshToken);
router.post("/forgot-password", rateLimit({ limit: 3, windowSeconds: 3600 }), validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", rateLimit({ limit: 5, windowSeconds: 600 }), validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", rateLimit({ limit: 5, windowSeconds: 600 }), validate(verifyEmailSchema), verifyEmail);

export default router;
