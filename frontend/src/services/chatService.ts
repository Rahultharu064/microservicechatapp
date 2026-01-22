import { api } from "./Api";

export interface Message {
    id: string;
    senderId: string;
    receiverId?: string;
    groupId?: string;
    cipherText: string;
    iv: string;
    senderPublicKey?: string;
    keyVersion?: number;
    status: "SENT" | "DELIVERED" | "READ";
    createdAt: string;
}

export interface Conversation {
    id: string;
    participants: { id: string; fullName: string; profilePic?: string }[];
    lastMessage?: Message;
    unreadCount: number;
}

const chatService = {
    getPrivateMessages: async (
        otherUserId: string,
        options?: { beforeId?: string; limit?: number; offset?: number }
    ): Promise<Message[]> => {
        const params: Record<string, string | number> = {};
        if (options?.beforeId) params.beforeId = options.beforeId;
        if (options?.limit !== undefined) params.limit = options.limit;
        if (options?.offset !== undefined) params.offset = options.offset;
        const response = await api.get(`/chat/messages/private/${otherUserId}`, { params });
        return response.data;
    },

    getGroupMessages: async (groupId: string): Promise<Message[]> => {
        const response = await api.get(`/chat/messages/group/${groupId}`);
        return response.data;
    },

    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get("/chat/messages/conversations");
        return response.data;
    }
};

export default chatService;
