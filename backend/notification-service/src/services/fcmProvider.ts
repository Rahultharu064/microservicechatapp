import { fcmAdmin } from "../config/firebase.ts";
import logger from "../../../shared/src/logger/logger";

export class FcmProvider {
    static async sendPushNotification(token: string, title: string, body: string, data?: any) {
        if (!fcmAdmin) {
            logger.warn("FCM Admin not initialized. Skipping push notification.");
            return;
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token,
        };

        try {
            const response = await fcmAdmin.messaging().send(message);
            logger.info("Successfully sent FCM message:", response);
            return response;
        } catch (error) {
            logger.error("Error sending FCM message:", error);
            throw error;
        }
    }
}
