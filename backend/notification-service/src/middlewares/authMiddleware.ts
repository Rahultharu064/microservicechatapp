import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../../../shared/src/logger/logger";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token!, process.env.JWT_SECRET || "default_secret");
        (req as any).user = decoded;
        next();
    } catch (error) {
        logger.error("Authentication failed", error);
        res.status(401).json({ error: "Invalid token" });
    }
};
