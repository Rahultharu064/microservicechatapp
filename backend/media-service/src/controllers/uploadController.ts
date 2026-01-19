import type{ Response } from "express";
import type {AuthRequest}  from "../middlewares/authMiddleware.ts";
import { handleUpload } from "../services/uploadService.ts";

export const uploadMedia = async (
  req: AuthRequest,
  res: Response
) => {
  const media = await handleUpload(req.file!, req.user!.userId);
  res.status(201).json(media);
};


export const uploadMultipleMedia = async (
  req: AuthRequest,
  res: Response 
) => {
  const files = req.files as Express.Multer.File[];
  const uploadPromises = files.map((file) =>    
    handleUpload(file, req.user!.userId)
  );
  const mediaList = await Promise.all(uploadPromises);
  res.status(201).json(mediaList);
};


export default { uploadMedia, uploadMultipleMedia };
