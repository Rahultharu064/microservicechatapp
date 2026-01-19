import fs from "fs/promises";
import path from "path";

const MEDIA_DIR = "storage/media";

export const saveFile = async (
  filename: string,
  buffer: Buffer
) => {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  const filePath = path.join(MEDIA_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

export const readFile = async (filePath: string) => {
  return fs.readFile(filePath);
};
export const deleteFile = async (filePath: string) => {
  return fs.unlink(filePath);
};
export const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }     
};
export const listFiles = async () => {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  return fs.readdir(MEDIA_DIR);
};
export const getFilePath = (filename: string) => {
  return path.join(MEDIA_DIR, filename);
};

