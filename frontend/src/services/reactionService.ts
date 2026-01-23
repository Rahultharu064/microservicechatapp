import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const reactionService = {
    addReaction: async (messageId: string, emoji: string) => {
        const response = await axios.post(`${API_URL}/reactions/message/${messageId}`, { emoji }, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    removeReaction: async (messageId: string, emoji: string) => {
        const response = await axios.delete(`${API_URL}/reactions/message/${messageId}`, {
            data: { emoji },
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    getReactions: async (messageId: string) => {
        const response = await axios.get(`${API_URL}/reactions/message/${messageId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    updatePlaybackPosition: async (voiceMessageId: string, position: number) => {
        const response = await axios.put(`${API_URL}/reactions/voice/${voiceMessageId}/playback`, { position }, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    },

    getPlaybackPosition: async (voiceMessageId: string) => {
        const response = await axios.get(`${API_URL}/reactions/voice/${voiceMessageId}/playback`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
        });
        return response.data;
    }
};

export default reactionService;
