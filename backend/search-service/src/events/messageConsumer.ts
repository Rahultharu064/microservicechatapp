import { createConnectRabbitMQ } from "../../../shared/src/rabbitmq/connection.ts";
import logger from "../../../shared/src/logger/logger.ts";
import redisClient from "../../../shared/src/redis/client.ts";
import prismaClient from "../config/db.ts";

const EXCHANGE_NAME = "chat.events";

export const consumeMessages = async () => {
    try {
        const channel = await createConnectRabbitMQ();
        await channel.assertExchange(EXCHANGE_NAME, "fanout", { durable: true });

        const q = await channel.assertQueue("", { exclusive: true });
        logger.info(`[*] Waiting for messages in ${q.queue}`);

        channel.bindQueue(q.queue, EXCHANGE_NAME, "");

        channel.consume(q.queue, async (msg) => {
            if (msg) {
                const content = JSON.parse(msg.content.toString());
                logger.info("Received message event:", content);

                if (content.type === "message.created") {
                    try {
                        await prismaClient.chatMessage.create({
                            data: {
                                id: content.id,
                                chatId: content.chatId,
                                senderId: content.senderId,
                                content: content.content,
                                createdAt: content.createdAt,
                                type: (content.messageType as any) || "TEXT" // Cast to any to bypass strict type check if enum import is tricky, or import Enum
                            }
                        });
                    } catch (err) {
                        logger.error("Failed to index message", err);
                    }

                    // Invalidate cache for relevant search queries
                    const keys = await redisClient.keys("search:messages:*");
                    if (keys.length > 0) {
                        await redisClient.del(keys);
                        logger.info(`Invalidated ${keys.length} search cache keys`);
                    }
                }

                channel.ack(msg);
            }
        });
    } catch (error) {
        logger.error("Error in RabbitMQ consumer:", error);
    }
};
