import app from "./app";
import { createConnectRabbitMQ } from "../../shared/src/rabbitmq/connection";
import { startNotificationConsumers } from "./consumers/notificationConsumer";
import logger from "../../shared/src/logger/logger";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5005;

async function startServer() {
    try {
        const channel = await createConnectRabbitMQ();
        await startNotificationConsumers(channel);

        app.listen(PORT, () => {
            logger.info(`Notification Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start Notification Service", error);
        process.exit(1);
    }
}

startServer();
