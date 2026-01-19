import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export const createThumbnail = async (input: string, id: string) => {
  const output = `storage/thumbnails/${id}.jpg`;
  await fs.mkdir("storage/thumbnails", { recursive: true });
  await sharp(input).resize(300).toFile(output);
  return output;
};
