import type{ Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type{ AuthRequest } from "../types/userType.ts";
import logger from "../../../shared/src/logger/logger.ts";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn("JWT invalid");
    res.status(401).json({ message: "Invalid token" });
  }
};
