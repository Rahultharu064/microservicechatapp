import type { Request, Response, NextFunction } from "express";
import redisClient from "../../../shared/src/redis/client.ts";
import { REDIS_KEYS } from "../../../shared/src/constants/redisKeys.ts";

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export const rateLimit = ({ limit, windowSeconds }: RateLimitOptions) => async (req: Request, res: Response, next: NextFunction) => {
  const key = REDIS_KEYS.rateLimit(req.ip || "unknown", req.path);
  const current = await redisClient.incr(key);
  if (current === 1) await redisClient.expire(key, windowSeconds);

  if (current > limit) return res.status(429).json({ message: "Too many requests" });
  next();
};
