import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import logger from "../../../shared/src/logger/logger.ts";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      logger.warn("Validation failed", error.errors);
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
  };
