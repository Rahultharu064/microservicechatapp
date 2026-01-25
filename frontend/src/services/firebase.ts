import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from "axios";
import toast from "react-hot-toast";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const requestNotificationPermission = async (token: string) => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            try {
                // Use a try-catch for getToken specifically to handle invalid VAPID keys dev/placeholder scenario
                const fcmToken = await getToken(messaging, {
                    vapidKey: "YOUR_VAPID_KEY"
                });

                if (fcmToken) {
                    // Register token with user service via API gateway
                    await axios.post(`${API_URL}/users/fcm-token`, { token: fcmToken }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log("FCM Token registered successfully");
                }
            } catch (tokenError) {
                console.warn("FCM getToken failed. This is expected if VAPID key is a placeholder.", tokenError);
                toast("Push notifications not fully configured (dev mode)", { icon: '⚠️' });
            }
        }
    } catch (error) {
        console.error("Failed to request notification permission:", error);
    }
};

onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    toast.success(payload.notification?.title || "New notification", {
        icon: '🔔',
    });
});

export { messaging };
