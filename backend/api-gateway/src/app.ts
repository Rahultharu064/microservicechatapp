import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/env.ts';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware.ts';
import { authMiddleware } from './middlewares/auth.middleware.ts';
import { SERVICE_ROUTES } from './config/services.ts';

import { createProxyMiddleware as createServiceProxy } from './middlewares/proxy.middleware.ts';
import { createProxyMiddleware } from 'http-proxy-middleware';
import logger from '@shared/logger/logger.ts';

const app = express();

// Security and Monitoring
app.use(helmet());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true
}));
app.use(morgan('dev'));

// Global Rate Limiting
app.use(rateLimitMiddleware);

// Global Auth Middleware
// Verify token for all routes except public ones
app.use(authMiddleware);

// Register Service Routes (Globally with pathFilter)
app.use(createServiceProxy(config.services.auth, SERVICE_ROUTES.AUTH.rewrite, SERVICE_ROUTES.AUTH.path));
app.use(createServiceProxy(config.services.user, SERVICE_ROUTES.USERS.rewrite, SERVICE_ROUTES.USERS.path));
app.use(createServiceProxy(config.services.chat, SERVICE_ROUTES.CHAT.rewrite, SERVICE_ROUTES.CHAT.path, true));
app.use(createServiceProxy(config.services.notification, SERVICE_ROUTES.NOTIFICATIONS.rewrite, SERVICE_ROUTES.NOTIFICATIONS.path));
app.use(createServiceProxy(config.services.media, SERVICE_ROUTES.MEDIA.rewrite, SERVICE_ROUTES.MEDIA.path));
app.use(createServiceProxy(config.services.search, SERVICE_ROUTES.SEARCH.rewrite, SERVICE_ROUTES.SEARCH.path));
app.use(createServiceProxy(config.services.admin, SERVICE_ROUTES.ADMIN.rewrite, SERVICE_ROUTES.ADMIN.path));

// Socket.IO Proxy - Ensure path is preserved by using pathFilter (v3 way)
app.use(createProxyMiddleware({
    target: config.services.chat,
    ws: true,
    changeOrigin: true,
    pathFilter: '/socket.io'
}));

// Health Check
app.get('/', (req, res) => {
    res.json({
        name: 'API Gateway',
        status: 'Running',
        timestamp: new Date().toISOString(),
        env: config.nodeEnv
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

export default app;
