import app from './app.ts';
import config from './config/env.ts';
import logger from '../../shared/src/logger/logger.ts';

const server = app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Required for http-proxy-middleware to handle WebSockets correctly in standalone mode
// but since we usually use it as middleware in app.ts with ws: true, 
// we still need to catch the upgrade event on the server instance.
import { createProxyMiddleware } from 'http-proxy-middleware';

const wsProxy = createProxyMiddleware({
    target: config.services.chat,
    ws: true,
    changeOrigin: true,
    pathFilter: '/socket.io',
    logger: logger as any
});

server.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/socket.io')) {
        (wsProxy as any).upgrade(req, socket, head);
    }
});
