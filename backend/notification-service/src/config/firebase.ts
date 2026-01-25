import admin from "firebase-admin";
import logger from "../../../shared/src/logger/logger";

const initializeFirebase = () => {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : null;

        if (!serviceAccount) {
            logger.warn("FIREBASE_SERVICE_ACCOUNT not found in environment. FCM notifications will be disabled.");
            return null;
        }

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        logger.error("Failed to initialize Firebase Admin SDK:", error);
        return null;
    }
};

export const fcmAdmin = initializeFirebase();
export default admin;
