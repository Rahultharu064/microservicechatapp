import { createConnectRabbitMQ } from "../../../shared/src/rabbitmq/connection.ts";
import { QUEUES } from "../../../shared/src/constants/queues.ts";
import prisma from "../config/db.ts";
import logger from "../../../shared/src/logger/logger.ts";

export const consumeUserEvents = async () => {
    try {
        const channel = await createConnectRabbitMQ();

        await channel.assertQueue(QUEUES.USER_CREATED, { durable: true });

        channel.consume(QUEUES.USER_CREATED, async (msg) => {
            if (msg) {
                const data = JSON.parse(msg.content.toString());
                const { userId, email, fullName } = data;

                logger.info(`Processing USER_CREATED event for ${email}`);

                try {
                    await prisma.user.create({
                        data: {
                            id: userId,
                            email,
                            fullName,
                            role: "USER",
                            status: "ACTIVE"
                        }
                    });
                    logger.info(`User profile created for ${email}`);
                    channel.ack(msg);
                } catch (error) {
                    logger.error("Error creating user profile from event", error);
                    // Decide whether to ack, nack or reject. 
                    // If it's a duplicate key error, we might want to ack/discard or log it.
                    // For now, let's ack to avoid loops if it's a permanent error like constraints.
                    // But ideally check error code.
                    channel.ack(msg);
                }
            }
        });

        logger.info("User Service consumer registered");
    } catch (error) {
        logger.error("Failed to start User Service consumer", error);
    }
};
