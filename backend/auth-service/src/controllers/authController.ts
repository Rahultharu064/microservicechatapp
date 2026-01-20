import type { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import { generateOTP, verifyOTP } from "../services/otpService.ts";
import { generateTokens, rotateRefreshToken } from "../services/tokenService.ts";
import prisma from "../config/db.ts";
import { createConnectRabbitMQ, publishToQueue } from "../../../shared/src/rabbitmq/connection.ts";
import { QUEUES } from "../../../shared/src/constants/queues.ts";
import logger from "../../../shared/src/logger/logger.ts";

export const register = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: { email, passwordHash, provider: "EMAIL" }
  });

  // Create user profile in user service
  await publishToQueue(QUEUES.USER_CREATED, {
    userId: user.id,
    email: user.email,
    fullName: fullName || "",
  });

  // Send verification email
  await generateOTP(email);

  res.status(201).json({
    message: "User registered successfully. Please verify your email.",
    userId: user.id
  });
};

export const login = async (req: Request, res: Response) => {
  const { email } = req.body;
  await generateOTP(email);
  res.json({ message: "OTP sent" });
};

export const verifyLogin = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  await verifyOTP(email, otp);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Account is not active" });
  }

  const tokens = await generateTokens(user.id);
  res.json(tokens);
};

export const refreshToken = async (req: Request, res: Response) => {
  const { userId, refreshToken } = req.body;
  const tokens = await rotateRefreshToken(userId, refreshToken);
  res.json(tokens);
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await generateOTP(email);
  res.json({ message: "Password reset OTP sent" });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  await verifyOTP(email, otp);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash }
  });

  res.json({ message: "Password reset successfully" });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  await verifyOTP(email, otp);

  await prisma.user.update({
    where: { email },
    data: { isEmailVerified: true }
  });

  res.json({ message: "Email verified successfully" });
};
