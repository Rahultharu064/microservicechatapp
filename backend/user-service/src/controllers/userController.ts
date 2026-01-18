import type{ Response } from "express";
import type{ AuthRequest } from "../types/userType.ts";
import { updateUserSchema } from "../validators/userValidator.ts";
import * as userService from "../services/userService.ts";

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await userService.getUserById(req.user!.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const updateProfile = async (req: AuthRequest, res: Response) => {   
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const data: any = parsed.data;
  if (req.file) data.profilePic = `/src/uploads/${req.file.filename}`;

  const updated = await userService.updateUser(req.user!.id, data);
  res.json(updated);
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const user = await userService.deleteUser(req.user!.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  const users = await userService.getAllUsers();
  res.json(users);
};
