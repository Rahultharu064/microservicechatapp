import { api } from "./Api";

export interface Reaction {
    id: string;
    messageId: string;
    userId: string;
    emoji: string;
    createdAt: string;
}

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
    reactions?: Reaction[];
    createdAt: string;
}

export interface Conversation {
    id: string;
    type?: 'PRIVATE' | 'GROUP';
    name?: string;
    description?: string;
    inviteCode?: string;
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
    },

    createGroup: async (data: { name: string, description?: string, isPublic?: boolean, encryptedGroupKey: string, keyVersion: number }): Promise<any> => {
        const response = await api.post("/chat/groups", data);
        return response.data;
    },

    joinGroup: async (data: { inviteCode: string, encryptedGroupKey: string, keyVersion: number }): Promise<any> => {
        const response = await api.post("/chat/groups/join", data);
        return response.data;
    },

    regenerateInviteLink: async (groupId: string): Promise<{ inviteCode: string }> => {
        const response = await api.post(`/chat/groups/${groupId}/regenerate-invite`);
        return response.data;
    },

    updateGroupSettings: async (groupId: string, data: { name?: string, description?: string, isPublic?: boolean }): Promise<any> => {
        const response = await api.put(`/chat/groups/${groupId}`, data);
        return response.data;
    },

    removeMember: async (groupId: string, userId: string): Promise<void> => {
        await api.delete(`/chat/groups/${groupId}/members/${userId}`);
    },

    updateMemberRole: async (groupId: string, userId: string, role: 'ADMIN' | 'MODERATOR' | 'MEMBER'): Promise<void> => {
        await api.put(`/chat/groups/${groupId}/members/${userId}/role`, { role });
    }
};

export default chatService;
