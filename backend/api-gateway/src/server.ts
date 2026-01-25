import app, { socketProxy } from './app.ts';
import config from './config/env.ts';
import logger from '../../shared/src/logger/logger.ts';

const server = app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Use the SAME proxy instance for the upgrade event
server.on('upgrade', (req, socket, head) => {
    if (req.url?.includes('/socket.io')) {
        logger.info(`Upgrading WebSocket connection for: ${req.url}`);
        (socketProxy as any).upgrade(req, socket, head);
    }
});
