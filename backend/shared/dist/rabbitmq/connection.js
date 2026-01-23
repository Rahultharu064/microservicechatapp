import amqp from "amqplib";
import logger from "../logger/logger.js";
let channel;
export const createConnectRabbitMQ = async () => {
    if (channel)
        return channel;
    try {
        const url = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || "admin"}:${process.env.RABBITMQ_PASSWORD || "admin123"}@${process.env.RABBITMQ_HOST || "localhost"}:${process.env.RABBITMQ_PORT || "5672"}`;
        const connection = await amqp.connect(url);
        connection.on("error", (err) => logger.error("RabbitMQ Connection Error", err));
        connection.on("close", () => logger.warn("RabbitMQ Connection Closed"));
        logger.info("❤️ RabbitMQ connected successfully");
        channel = await connection.createChannel();
        channel.on("error", (err) => logger.error("RabbitMQ Channel Error", err));
        return channel;
    }
    catch (error) {
        logger.error("😒RabbitMQ connection error", error);
        throw error;
    }
};
export const publishToQueue = async (queueName, data) => {
    if (!channel) {
        channel = await createConnectRabbitMQ();
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true,
    });
    logger.info(`Message published to queue ${queueName}`);
};
//# sourceMappingURL=connection.js.map