import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import logger from '../../../shared/src/logger/logger.ts';

export const createServiceProxy = (
    target: string,
    pathRewrite: { [key: string]: string },
    ws: boolean = false
) => {
    const options: Options = {
        target,
        changeOrigin: true,
        pathRewrite,
        ws,
        on: {
            error: (err: Error, req: Request, res: Response) => {
                logger.error(`Proxy error: ${err.message}`);
                const response = res as any;
                if (response.headersSent) {
                    return;
                }
                if (typeof response.status === 'function') {
                    response.status(503).json({ message: 'Service Unavailable' });
                } else {
                    response.statusCode = 503;
                    response.end(JSON.stringify({ message: 'Service Unavailable' }));
                }
            },
        },
    };

    return createProxyMiddleware(options);
};
