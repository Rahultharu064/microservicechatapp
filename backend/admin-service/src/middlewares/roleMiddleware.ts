import type { Request, Response, NextFunction } from "express";

export const roleMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    next();
};
