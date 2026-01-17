import "dotenv/config";
import app from "./app.js";
import redisClient, { connectRedis } from "../../shared/dist/redis/client.js";
import { createConnectRabbitMQ } from "../../shared/dist/rabbitmq/connection.js";
import logger from "../../shared/src/logger/logger.js";
import prisma from "./config/db.ts";
const port = process.env.PORT;

const startserver = async () => {
    try {
        logger.info("Connecting to Redis...");
        await connectRedis();
        logger.info("Redis connected.");

        logger.info("Connecting to RabbitMQ...");
        await createConnectRabbitMQ();
        logger.info("RabbitMQ connected.");

        logger.info("Connecting to Prisma...");
        await prisma.$connect();
        logger.info("Prisma connected.");

        app.listen(port, () => {
            logger.info(`Auth Service running on port ${port}`);
        });

    } catch (error) {
        logger.error("Error starting server", error);
        throw error;
    }
}

startserver();
