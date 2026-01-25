import { Channel } from "amqplib";
import logger from "../../../shared/src/logger/logger";
import prisma from "../config/db";
import { QUEUES } from "../../../shared/src/constants/queues";
import { FcmProvider } from "../services/fcmProvider";

export async function startNotificationConsumers(channel: Channel) {
    const CHAT_EXCHANGE = "chat_events";
    const QUEUE_NAME = "notification_queue";

    await channel.assertExchange(CHAT_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind to all chat-related events
    await channel.bindQueue(QUEUE_NAME, CHAT_EXCHANGE, "chat.#");

    // Assert and consume specific queues for user sync
    await channel.assertQueue(QUEUES.USER_CREATED, { durable: true });
    await channel.assertQueue(QUEUES.USER_FCM_TOKEN_UPDATED, { durable: true });

    channel.consume(QUEUES.USER_CREATED, async (msg) => {
        if (!msg) return;
        try {
            const { userId } = JSON.parse(msg.content.toString());
            await (prisma as any).user.upsert({
                where: { id: userId },
                update: {},
                create: { id: userId }
            });
            channel.ack(msg);
        } catch (error) {
            logger.error("Error syncing user created:", error);
            channel.ack(msg);
        }
    });

    channel.consume(QUEUES.USER_FCM_TOKEN_UPDATED, async (msg) => {
        if (!msg) return;
        try {
            const { userId, fcmToken } = JSON.parse(msg.content.toString());
            await (prisma as any).user.upsert({
                where: { id: userId },
                update: { fcmToken },
                create: { id: userId, fcmToken }
            });
            channel.ack(msg);
        } catch (error) {
            logger.error("Error syncing FCM token:", error);
            channel.ack(msg);
        }
    });

    channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        try {
            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString());

            logger.info(`Received event: ${routingKey}`, content);

            if (routingKey === "chat.message.sent") {
                await handleNewMessage(content);
            }

            channel.ack(msg);
        } catch (error) {
            logger.error("Error processing notification event", error);
            // For now, ack even on error to avoid infinite loops, or use a DLX
            channel.ack(msg);
        }
    });
}

async function handleNewMessage(data: any) {
    const { senderId, receiverId, type, groupId, notification, recipientIds } = data;

    // Create in-app notification for the receiver
    if (type === "private" && receiverId) {
        await prisma.notification.create({
            data: {
                userId: receiverId,
                type: "MESSAGE",
                title: notification?.title || "New Message",
                body: "You have a new private message",
                data: JSON.stringify({ senderId, messageId: data.messageId })
            }
        });

        // Trigger FCM Push
        try {
            const user = await (prisma as any).user.findUnique({ where: { id: receiverId } });
            if (user?.fcmToken) {
                await FcmProvider.sendPushNotification(
                    user.fcmToken,
                    notification?.title || "New Message",
                    "You have a new private message",
                    { senderId, messageId: data.messageId, type: "private" }
                );
            }
        } catch (err) {
            logger.error("Failed to send private FCM push:", err);
        }
    } else if (type === "group" && groupId) {
        const idsToNotify = recipientIds || [];
        if (idsToNotify.length > 0) {
            try {
                // Create notifications for all recipients in the group (except sender)
                await prisma.notification.createMany({
                    data: idsToNotify.map((uid: string) => ({
                        userId: uid,
                        type: "MESSAGE",
                        title: notification?.title || "New Group Message",
                        body: notification?.body || "New message in group",
                        data: JSON.stringify({ senderId, groupId, messageId: data.messageId })
                    }))
                });

                // Trigger FCM Push for all recipients
                for (const uid of idsToNotify) {
                    try {
                        const user = await (prisma as any).user.findUnique({ where: { id: uid } });
                        if (user?.fcmToken) {
                            await FcmProvider.sendPushNotification(
                                user.fcmToken,
                                notification?.title || "New Group Message",
                                notification?.body || "New message in group",
                                { senderId, groupId, messageId: data.messageId, type: "group" }
                            );
                        }
                    } catch (err) {
                        logger.error(`Failed to send group FCM push to ${uid}:`, err);
                    }
                }
            } catch (error) {
                logger.error("Failed to create group notifications", error);
            }
        }
    }
}
