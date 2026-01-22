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
        options?: { before?: string; limit?: number }
    ): Promise<Message[]> => {
        const params: Record<string, any> = {};
        if (options?.before) params.before = options.before;
        if (options?.limit) params.limit = options.limit;
        const response = await api.get(`/chat/messages/private/${otherUserId}`,{ params });
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
