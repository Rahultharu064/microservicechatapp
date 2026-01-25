import Dexie, { type Table } from 'dexie';

export interface LocalMessage {
    id?: number;
    messageId: string;
    chatId: string; // Partner's ID or Group ID
    senderId: string;
    content: string; // Decrypted content
    timestamp: Date;
    type: 'private' | 'group';
}

export interface LocalConversation {
    id: string; // chatId
    partnerId?: string;
    lastMessageId?: string;
    unreadCount: number;
}

export class ChatDatabase extends Dexie {
    messages!: Table<LocalMessage>;
    conversations!: Table<LocalConversation>;

    constructor() {
        super('ChatDatabase');
        this.version(1).stores({
            messages: '++id, messageId, chatId, senderId, content, timestamp',
            conversations: 'id, partnerId, lastMessageId, unreadCount'
        });
    }
}

export const db = new ChatDatabase();
