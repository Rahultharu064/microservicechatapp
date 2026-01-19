import { publishToQueue } from "../../../shared/src/rabbitmq/connection.ts";

export const publishMediaProcessed = async (mediaId: string, ownerId: string, url: string) => {
    const event = {
        type: "MEDIA_PROCESSED",
        payload: {
            mediaId,
            ownerId,
            url,
            timestamp: new Date().toISOString(),
        },
    };

    await publishToQueue("media_events", event);
};
