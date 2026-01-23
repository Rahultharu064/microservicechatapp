import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const VIDEO_DIR = "storage/video";
const THUMBNAIL_DIR = "storage/thumbnails";

interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    codec: string;
    format: string;
    bitrate: number;
}

export const getVideoMetadata = async (filePath: string): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);

            const videoStream = metadata.streams.find((s) => s.codec_type === "video");
            if (!videoStream) return reject(new Error("No video stream found"));

            resolve({
                duration: metadata.format?.duration || 0,
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                codec: videoStream.codec_name || "unknown",
                format: metadata.format?.format_name || "unknown",
                bitrate: metadata.format?.bit_rate || 0,
            });
        });
    });
};

export const compressVideo = async (
    inputPath: string,
    outputFilename: string,
    maxWidth: number = 720
): Promise<string> => {
    await fs.mkdir(VIDEO_DIR, { recursive: true });
    const outputPath = path.join(VIDEO_DIR, `${outputFilename}.mp4`);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .audioBitrate("128k")
            .videoBitrate("1500k")
            .size(`${maxWidth}x?`) // Maintain aspect ratio
            .format("mp4")
            .outputOptions([
                "-preset fast",
                "-crf 23",
                "-movflags +faststart", // Enable streaming
                "-pix_fmt yuv420p", // Better compatibility
            ])
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .save(outputPath);
    });
};

export const generateVideoThumbnail = async (
    videoPath: string,
    outputFilename: string,
    timeInSeconds: number = 1
): Promise<string> => {
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
    const tempPath = path.join(THUMBNAIL_DIR, `${outputFilename}_temp.png`);
    const outputPath = path.join(THUMBNAIL_DIR, `${outputFilename}.jpg`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [timeInSeconds],
                filename: `${outputFilename}_temp.png`,
                folder: THUMBNAIL_DIR,
                size: "320x180",
            })
            .on("end", async () => {
                try {
                    // Convert PNG to JPEG and optimize
                    await sharp(tempPath)
                        .jpeg({ quality: 80 })
                        .toFile(outputPath);

                    // Delete temp PNG
                    await fs.unlink(tempPath).catch(() => { });

                    resolve(outputPath);
                } catch (err) {
                    reject(err);
                }
            })
            .on("error", reject);
    });
};

export const validateVideoFile = async (filePath: string): Promise<boolean> => {
    try {
        const metadata = await getVideoMetadata(filePath);

        // Validate duration (max 5 minutes = 300 seconds)
        if (metadata.duration > 300) {
            throw new Error("Video duration exceeds maximum of 5 minutes");
        }

        // Validate file exists
        await fs.access(filePath);

        return true;
    } catch (error) {
        throw error;
    }
};

export const getVideoDuration = async (filePath: string): Promise<number> => {
    const metadata = await getVideoMetadata(filePath);
    return metadata.duration;
};

export const convertToWebFormat = async (
    inputPath: string,
    outputFilename: string
): Promise<string> => {
    await fs.mkdir(VIDEO_DIR, { recursive: true });
    const outputPath = path.join(VIDEO_DIR, `${outputFilename}_web.mp4`);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .format("mp4")
            .outputOptions([
                "-preset fast",
                "-crf 23",
                "-movflags +faststart",
                "-pix_fmt yuv420p",
                "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2", // Ensure even dimensions
            ])
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .save(outputPath);
    });
};
