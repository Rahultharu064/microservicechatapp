import amqp from "amqplib";
import logger from "../logger/logger.js";

let channel: amqp.Channel;
export const createConnectRabbitMQ = async (): Promise<amqp.Channel> => {
    if (channel) return channel;
    try{
        const url = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || "admin"}:${process.env.RABBITMQ_PASSWORD || "admin123"}@${process.env.RABBITMQ_HOST || "localhost"}:${process.env.RABBITMQ_PORT || "5672"}`;
        const connection = await amqp.connect(url);
        logger.info("❤️RabbitMQ connected successfully");
        return (channel = await connection.createChannel());
    }
    catch (error) {
        logger.error("😒RabbitMQ connection error", error);
        throw error;
    }

};



export const publishToQueue = async (queueName: string, data: any) => {
    if (!channel) {
        channel = await createConnectRabbitMQ();
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true,
    });
    logger.info(`Message published to queue ${queueName}`);
};
