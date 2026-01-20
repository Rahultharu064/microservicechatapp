import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../../../shared/src/logger/logger.ts";

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret || !token) {
      logger.error("JWT_SECRET or Token is missing");
      return res.sendStatus(500);
    }

    jwt.verify(token, secret, (err: any, user: any) => {
      if (err) {
        logger.error("JWT verification failed", err);
        return res.sendStatus(403);
      }

      (req as any).user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};
