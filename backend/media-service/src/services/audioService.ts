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
                duration: metadata.format?.duration || 0,
                format: metadata.format?.format_name || "unknown",
                bitrate: metadata.format?.bit_rate || 0,
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

        // Use FFmpeg to extract actual waveform data
        ffmpeg(filePath)
            .audioFilters(`astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`)
            .outputFormat('null')
            .on('stderr', (stderr) => {
                // Parse RMS levels from FFmpeg output
                const rmsMatches = stderr.match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+\.\d+)/g);
                if (rmsMatches) {
                    rmsMatches.forEach(match => {
                        const rms = parseFloat(match.split('=')[1]);
                        // Convert dB to amplitude (0-1 range)
                        const amplitude = Math.pow(10, rms / 20);
                        waveform.push(Math.min(1, amplitude));
                    });
                }
            })
            .on("end", () => {
                if (waveform.length === 0) {
                    // Fallback to simple waveform if extraction fails
                    const normalized = Array.from({ length: samples }, () =>
                        Math.random() * 0.5 + 0.5
                    );
                    resolve(normalized);
                } else {
                    // Interpolate to desired sample count
                    const interpolated = interpolateWaveform(waveform, samples);
                    resolve(interpolated);
                }
            })
            .on("error", (err) => {
                console.error('Waveform extraction error:', err);
                // Fallback to simple waveform
                const normalized = Array.from({ length: samples }, () =>
                    Math.random() * 0.5 + 0.5
                );
                resolve(normalized);
            })
            .output("/dev/null")
            .run();
    });
};

// Helper function to interpolate waveform data to desired sample count
const interpolateWaveform = (data: number[], targetSamples: number): number[] => {
    if (data.length === targetSamples) return data;
    if (data.length === 0) return Array(targetSamples).fill(0.5);

    const result: number[] = [];
    const ratio = data.length / targetSamples;

    for (let i = 0; i < targetSamples; i++) {
        const index = i * ratio;
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.min(Math.ceil(index), data.length - 1);
        const weight = index - lowerIndex;

        if (lowerIndex === upperIndex) {
            result.push(data[lowerIndex]);
        } else {
            result.push(data[lowerIndex] * (1 - weight) + data[upperIndex] * weight);
        }
    }

    return result;
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
