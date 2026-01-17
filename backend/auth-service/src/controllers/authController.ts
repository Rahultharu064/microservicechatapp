import type{ Request, Response } from "express";
import { generateOTP, verifyOTP } from "../services/otpService.ts";
import { generateTokens, rotateRefreshToken } from "../services/tokenService.ts";

export const login = async (req: Request, res: Response) => {
  const { email } = req.body;
  await generateOTP(email);
  res.json({ message: "OTP sent" });
};

export const verifyLogin = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  await verifyOTP(email, otp);
  const tokens = await generateTokens(email);
  res.json(tokens);
};

export const refreshToken = async (req: Request, res: Response) => {
  const { userId, refreshToken } = req.body;
  const tokens = await rotateRefreshToken(userId, refreshToken);
  res.json(tokens);
};
