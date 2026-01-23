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
    }
};

export default mediaService;
