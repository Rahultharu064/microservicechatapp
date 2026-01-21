import rateLimit from 'express-rate-limit';
import logger from '../../../shared/src/logger/logger.ts';
import { RATE_LIMIT_CONFIG } from '../config/rateLimit.ts';

export const rateLimitMiddleware = rateLimit({
    ...RATE_LIMIT_CONFIG,
    skip: (req) => req.path.startsWith('/socket.io'),
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            message: 'Too many requests from this IP, please try again after 15 minutes',
        });
    },
});
