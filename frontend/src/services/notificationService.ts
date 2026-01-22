import { api } from "./Api";

export interface Notification {
    id: string;
    userId: string;
    type: 'MESSAGE' | 'MENTION' | 'GROUP_INVITE' | 'SYSTEM';
    title: string;
    body: string;
    data?: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationPreference {
    id: string;
    userId: string;
    enabledTypes: string;
    muteUntil?: string;
}

const notificationService = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await api.get("/notifications");
        return response.data;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.patch(`/notifications/${id}/read`);
    },

    getPreferences: async (): Promise<NotificationPreference> => {
        const response = await api.get("/notifications/preferences");
        return response.data;
    },

    updatePreferences: async (prefs: Partial<NotificationPreference>): Promise<NotificationPreference> => {
        const response = await api.put("/notifications/preferences", prefs);
        return response.data;
    }
};

export default notificationService;
