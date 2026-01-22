import { httpServer } from "./app.js";
import { connectRedis } from "../../shared/src/redis/client.js";
import { createConnectRabbitMQ } from "../../shared/src/rabbitmq/connection.js";
import prisma from "./config/db.js";
import logger from "../../shared/src/logger/logger.js";

const PORT = process.env.CHAT_PORT || 5004;

const startServer = async () => {
    try {
        // Database check
        await prisma.$connect();
        logger.info("Chat DB connected");

        // Redis connect
        await connectRedis();

        // RabbitMQ connect
        await createConnectRabbitMQ();

        httpServer.listen(PORT, () => {
            logger.info(`Chat Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start Chat Service", error);
        process.exit(1);
    }
};

startServer();

// Prevent dev crashes on transient errors
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection in Chat Service", reason as any);
});

process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception in Chat Service", err);
});
