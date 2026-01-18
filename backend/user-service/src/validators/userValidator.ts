import { z } from "zod";

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional()
});

export const deleteUserSchema = z.object({
  id: z.string()
});

export const getAllUsersSchema = z.object({
  id: z.string()
});
