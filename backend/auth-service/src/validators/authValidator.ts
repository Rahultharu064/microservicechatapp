import { z } from "zod";

/**
 * POST /auth/register
 */
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fullName: z.string().min(1, "Full name is required").optional(),
  }),
});

/**
 * POST /auth/login
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

/**
 * POST /auth/verify-login
 */
export const verifyLoginSchema = z.object({
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

/**
 * POST /auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

/**
 * POST /auth/reset-password
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

/**
 * POST /auth/verify-email
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6, "OTP must be 6 digits"),
  }),
});
