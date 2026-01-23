import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = { userId: payload.userId };
    next();
  } catch {
    res.sendStatus(401);
  }
};
