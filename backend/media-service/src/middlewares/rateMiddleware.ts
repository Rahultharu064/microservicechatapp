import type{ Request, Response, NextFunction } from "express";
import redisClient from "../../../shared/src/redis/client.ts";
import logger from "../../../shared/src/logger/logger.ts";

interface RateLimitOptions {
  windowSec: number;
  maxRequests: number;
  keyPrefix: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  const { windowSec, maxRequests, keyPrefix } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip;
      const userId = (req as any).user?.id || "guest";

      const key = `${keyPrefix}:${userId}:${ip}`;

      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSec);
      }

      if (current > maxRequests) {
        logger.warn("Rate limit exceeded", {
          ip,
          userId,
          key,
        });

        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      }

      next();
    } catch (error) {
      logger.error("Rate limit error", error);
      next(); // fail-open (important in prod)
    }
  };
};
