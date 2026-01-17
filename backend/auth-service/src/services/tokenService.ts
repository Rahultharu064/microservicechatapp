import jwt from "jsonwebtoken";
import redisClient from "../../../shared/src/redis/client.ts";
import { REDIS_KEYS } from "../../../shared/src/constants/redisKeys.ts";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_EXPIRE = (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m") as any;
const REFRESH_EXPIRE = (process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") as any;

export const generateTokens = async (userId: string) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRE });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRE });

  await redisClient.set(REDIS_KEYS.refreshToken(userId), refreshToken, { EX: 7 * 24 * 60 * 60 });
  return { accessToken, refreshToken };
};

export const rotateRefreshToken = async (userId: string, token: string) => {
  const stored = await redisClient.get(REDIS_KEYS.refreshToken(userId));
  if (stored !== token) throw new Error("Invalid refresh token");

  const tokens = await generateTokens(userId);
  return tokens;
};
