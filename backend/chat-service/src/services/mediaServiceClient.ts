import axios, { AxiosInstance } from "axios";

interface UploadResponse {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: string;
    voiceMessage?: {
        duration: number;
        waveform: number[];
    };
}

interface MediaMetadata {
    id: string;
    duration?: number;
    waveform?: number[];
    createdAt: string;
}

class MediaServiceClient {
    private client: AxiosInstance;
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.MEDIA_SERVICE_URL || "http://localhost:5005";
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
        });
    }

    /**
     * Upload a file to Media Service
     */
    async uploadFile(
        file: Express.Multer.File,
        token: string
    ): Promise<UploadResponse> {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append("file", blob, file.originalname);

        const response = await this.client.post<UploadResponse>(
            "/api/media/upload/single",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    }

    /**
     * Upload a voice message to Media Service
     */
    async uploadVoice(
        file: Express.Multer.File,
        token: string
    ): Promise<UploadResponse> {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append("voice", blob, file.originalname);

        const response = await this.client.post<UploadResponse>(
            "/api/media/voice/upload",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    }

    /**
     * Get voice message metadata
     */
    async getVoiceMetadata(
        mediaId: string,
        token: string
    ): Promise<MediaMetadata> {
        const response = await this.client.get<MediaMetadata>(
            `/api/media/voice/${mediaId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return response.data;
    }

    /**
     * Generate download URL for media
     */
    getDownloadUrl(mediaId: string): string {
        return `${this.baseURL}/api/media/download/${mediaId}`;
    }

    /**
     * Generate thumbnail URL
     */
    getThumbnailUrl(mediaId: string, size: "small" | "medium" = "medium"): string {
        return `${this.baseURL}/api/media/download/${mediaId}/thumbnail/${size}`;
    }
}

export default new MediaServiceClient();
