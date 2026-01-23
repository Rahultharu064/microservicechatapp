import type { Response } from "express";
import type { AuthRequest } from "../types/userType.ts";
import { updateUserSchema } from "../validators/userValidator.ts";
import * as userService from "../services/userService.ts";
import logger from "../../../shared/src/logger/logger.ts";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    logger.error("Error in getProfile:", error);
    res.status(500).json({ message: "Internal server error", error: (error as any).message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const data: any = parsed.data;
    if (req.file) data.profilePic = req.file.filename;

    const updated = await userService.updateUser(req.user!.id, data);
    res.json(updated);
  } catch (error) {
    logger.error("Error in updateProfile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.deleteUser(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    logger.error("Error in deleteUser:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.query;
    let users;
    if (typeof ids === "string") {
      const idList = ids.split(",").filter(Boolean);
      users = await userService.getAllUsers(idList);
    } else {
      users = await userService.getAllUsers();
    }
    res.json(users);
  } catch (error) {
    logger.error("Error in getAllUsers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
