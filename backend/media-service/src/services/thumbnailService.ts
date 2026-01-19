import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const THUMBNAIL_DIR = "storage/thumbnails";

export const generateThumbnail = async (
  mediaId: string,
  inputPath: string,
  buffer: Buffer
) => {
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });

  const sizes = [
    { name: "small", width: 150 },
    { name: "medium", width: 300 },
  ];

  const results = [];

  for (const size of sizes) {
    const filename = `${mediaId}_${size.name}.webp`;
    const outputPath = path.join(THUMBNAIL_DIR, filename);

    await sharp(buffer)
      .resize(size.width)
      .webp({ quality: 80 })
      .toFile(outputPath);

    results.push({
      size: size.name,
      path: outputPath,
    });
  }

  return results;
};
