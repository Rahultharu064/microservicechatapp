import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const uploadDir = path.join(dirname(fileURLToPath(import.meta.url)), "../../src/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});
