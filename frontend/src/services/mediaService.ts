import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mediaService = {
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_URL}/media/upload/single`, formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    uploadMultipleFiles: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await axios.post(`${API_URL}/media/upload/multiple`, formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    uploadVoice: async (blob: Blob) => {
        const formData = new FormData();
        formData.append('voice', blob, 'voice_message.webm');

        const response = await axios.post(`${API_URL}/media/voice/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    downloadVoice: async (voiceMessageId: string) => {
        const response = await axios.get(`${API_URL}/media/download/voice/${voiceMessageId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            responseType: 'blob',
        });
        return response.data;
    }
};

export default mediaService;
