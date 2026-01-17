import { z } from "zod";

/**
 * POST /auth/login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

/**
 * POST /auth/verify-otp
 */
export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be 6 digits"),
  }),
});

/**
 * POST /auth/refresh
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    refreshToken: z.string().min(10),
  }),
});
