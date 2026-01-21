import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    frontendUrl: string;
    services: {
        auth: string;
        notification: string;
        user: string;
        chat: string;
        media: string;
        search: string;
        admin: string;
    };
}

const config: Config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'ksldjflkj',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5002',
        user: process.env.USER_SERVICE_URL || 'http://localhost:5003',
        chat: process.env.CHAT_SERVICE_URL || 'http://localhost:5004',
        media: process.env.MEDIA_SERVICE_URL || 'http://localhost:5005',
        search: process.env.SEARCH_SERVICE_URL || 'http://localhost:5006',
        admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:5007',
    },
};

export default config;
