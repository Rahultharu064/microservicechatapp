import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../../shared/src/logger/logger.ts';
import config from '../config/env.ts';

const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/google',
    '/api/auth/github',
    '/api/auth/verify-email',
    '/api/auth/verify-login',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/notifications/health',
    '/api/chat/health',
    '/api/users/health',
    '/socket.io',
];

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const isPublic = publicPaths.some(path => req.path.startsWith(path));
    logger.info(`AuthMiddleware: path=${req.path}, isPublic=${isPublic}`);

    if (isPublic) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn(`Unauthorized access attempt to ${req.path}`);
        return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        logger.warn(`Token missing in auth header`);
        return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.headers['x-user-id'] = (decoded as any).userId || (decoded as any).id;
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error}`);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
