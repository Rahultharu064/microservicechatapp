import app from './app.ts';
import config from './config/env.ts';
import logger from '../../shared/src/logger/logger.ts';

app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port} in ${config.nodeEnv} mode`);
});
