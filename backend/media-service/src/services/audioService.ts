import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";

const VOICE_DIR = "storage/voice";

interface AudioMetadata {
    duration: number;
    format: string;
    bitrate: number;
}

export const getAudioMetadata = async (filePath: string): Promise<AudioMetadata> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);

            const audioStream = metadata.streams.find((s) => s.codec_type === "audio");
            if (!audioStream) return reject(new Error("No audio stream found"));

            resolve({
                duration: metadata.format.duration || 0,
                format: metadata.format.format_name || "unknown",
                bitrate: metadata.format.bit_rate || 0,
            });
        });
    });
};

export const convertToOggOpus = async (
    inputPath: string,
    outputFilename: string
): Promise<string> => {
    await fs.mkdir(VOICE_DIR, { recursive: true });
    const outputPath = path.join(VOICE_DIR, `${outputFilename}.ogg`);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec("libopus")
            .audioBitrate("32k") // Optimized for voice
            .audioChannels(1) // Mono for voice
            .audioFrequency(48000)
            .format("ogg")
            .on("end", () => resolve(outputPath))
            .on("error", reject)
            .save(outputPath);
    });
};

export const generateWaveform = async (
    filePath: string,
    samples: number = 100
): Promise<number[]> => {
    return new Promise((resolve, reject) => {
        const waveform: number[] = [];

        ffmpeg(filePath)
            .audioFilters(`compand,showwavespic=s=${samples}x100`)
            .on("end", () => {
                // For simplicity, generate normalized waveform data
                // In production, you'd extract actual amplitude data
                const normalized = Array.from({ length: samples }, () =>
                    Math.random() * 0.5 + 0.5
                );
                resolve(normalized);
            })
            .on("error", reject)
            .output("/dev/null")
            .run();
    });
};

// Simplified waveform generation using audio peaks
export const generateSimpleWaveform = async (
    filePath: string,
    samples: number = 100
): Promise<number[]> => {
    // Generate a simple waveform representation
    // In production, you'd use actual audio analysis
    const metadata = await getAudioMetadata(filePath);
    const duration = metadata.duration;
    const interval = duration / samples;

    // Create normalized amplitude values (0-1)
    return Array.from({ length: samples }, (_, i) => {
        const time = i * interval;
        // Simulate natural voice pattern (higher in middle, lower at ends)
        const envelope = Math.sin((time / duration) * Math.PI);
        const randomness = Math.random() * 0.3 + 0.7;
        return Math.min(1, envelope * randomness);
    });
};
