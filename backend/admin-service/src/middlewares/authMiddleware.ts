import type{ Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY!) as any;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
