import "dotenv/config";
import app from "./app.ts";
import logger from "../../shared/src/logger/logger.ts";
import { createConnectRabbitMQ } from "../../shared/src/rabbitmq/connection.ts";
import { consumeEmailOtp } from "./consumers/emailConsumer.ts";


const PORT = process.env.NOTIFICATION_PORT || 5002;

async function start() {
    try {
        const channel = await createConnectRabbitMQ();

        await consumeEmailOtp(channel);


        app.listen(PORT, () => {
            logger.info(`📨 Notification Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Notification service startup failed", error);
        process.exit(1);
    }
}

start();
