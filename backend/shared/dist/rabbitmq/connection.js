import amqp from "amqplib";
import logger from "../logger/logger.js";
let channel;
export const createConnectRabbitMQ = async () => {
    if (channel)
        return channel;
    try {
        const connection = await amqp.connect({
            protocol: "amqp",
            hostname: process.env.RABBITMQ_HOST || "localhost",
            port: parseInt(process.env.RABBITMQ_PORT || "5672"),
            username: process.env.RABBITMQ_USER || "admin",
            password: process.env.RABBITMQ_PASSWORD || "admin123",
        });
        logger.info("❤️RabbitMQ connected successfully");
        return (channel = await connection.createChannel());
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