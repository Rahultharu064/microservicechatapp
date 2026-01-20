import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/env.ts';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware.ts';
import { authMiddleware } from './middlewares/auth.middleware.ts';
import { SERVICE_ROUTES } from './config/services.ts';

import authRoutes from './routes/auth.routes.ts';
import userRoutes from './routes/user.routes.ts';
import chatRoutes from './routes/chat.routes.ts';
import mediaRoutes from './routes/media.routes.ts';
import searchRoutes from './routes/search.routes.ts';
import adminRoutes from './routes/admin.routes.ts';
import logger from '@shared/logger/logger.ts';

const app = express();

// Security and Monitoring
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Global Rate Limiting
app.use(rateLimitMiddleware);

// Global Auth Middleware
// Verify token for all routes except public ones
app.use(authMiddleware);

// Register Service Routes
app.use(SERVICE_ROUTES.AUTH.path, authRoutes);
app.use(SERVICE_ROUTES.USERS.path, userRoutes);
app.use(SERVICE_ROUTES.CHAT.path, chatRoutes);
app.use(SERVICE_ROUTES.NOTIFICATIONS.path, (req, res, next) => {
    // Placeholder - Notifications route (similar to others or inline)
    // For now we can use a direct proxy here or creating a route file if not created
    // Since we don't have routes/notification.routes.ts yet (my oversight in plan), let's create inline or skip if user didn't ask explicitly (but he asked for all services from routes)
    // Wait, let's just use proxy middleware directly here if needed or I should have created routes/notification.routes.ts
    // I will check if I missed it in the plan. Yes I missed it in step 5 list.
    // I will add it now inline for simplicity or quickly write a file.
    // Let's create a notification route file to be consistent.
    next();
});
// Correction: I should create notification routes too.
import configServices from './config/env.ts';
import { createProxyMiddleware } from './middlewares/proxy.middleware.ts';

app.use(SERVICE_ROUTES.NOTIFICATIONS.path, createProxyMiddleware(
    configServices.services.notification,
    SERVICE_ROUTES.NOTIFICATIONS.rewrite
));


app.use(SERVICE_ROUTES.MEDIA.path, mediaRoutes);
app.use(SERVICE_ROUTES.SEARCH.path, searchRoutes);
app.use(SERVICE_ROUTES.ADMIN.path, adminRoutes);

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
