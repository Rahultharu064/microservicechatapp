import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import chatService from "../services/chatService";
import type { Message, Conversation } from "../services/chatService";
import { encryptMessage, decryptMessage } from "../utils/encryption";
import { v4 as uuidv4 } from 'uuid';
import toast from "react-hot-toast";
import { db } from "../services/db";

interface ChatContextType {
    socket: Socket | null;
    conversations: Conversation[];
    activeChat: string | null;
    messages: Message[];
    setActiveChat: (chatId: string | null) => void;
    sendMessage: (to: string, text: string, media?: { id: string, type: string, filename: string }) => Promise<void>;

    editMessage: (messageId: string, newText: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    loadMore: () => Promise<void>;
    loadingMore: boolean;
    typingStatus: Record<string, boolean>;
    onlineUsers: Record<string, { status: string; lastSeen?: string }>;
    connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
    sendReaction: (messageId: string, emoji: string, action: 'add' | 'remove') => void;
    createGroup: (name: string, description?: string, isPublic?: boolean) => Promise<any>;
    joinGroup: (inviteCode: string) => Promise<any>;
    refreshConversations: () => Promise<void>;
    searchLocalMessages: (query: string, chatId?: string) => Promise<any[]>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, refreshToken } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const oldestCursorRef = useRef<string | null>(null); // Oldest loaded message ID
    const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
    const [onlineUsers, setOnlineUsers] = useState<Record<string, { status: string; lastSeen?: string }>>({});
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('disconnected');
    const [loadingMore, setLoadingMore] = useState<boolean>(false);

    // Refs to avoid stale values inside socket listeners
    const activeChatRef = useRef<string | null>(null);
    const userRef = useRef<typeof user>(user);

    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Initialize Socket (only on token changes, not activeChat)
    useEffect(() => {
        if (token) {
            const newSocket = io("http://localhost:5000", {
                auth: { token },
                path: "/socket.io",
                transports: ["polling", "websocket"],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
            setConnectionStatus('connecting');

            newSocket.on("connect", () => {
                setConnectionStatus('connected');
                console.log("Connected to chat socket");
            });

            newSocket.on("disconnect", () => {
                setConnectionStatus('disconnected');
            });

            newSocket.on("connect_error", async (err: { message?: string }) => {
                // If server reports auth expired, refresh and reconnect with the new token
                if (err?.message === 'AUTH_EXPIRED') {
                    try {
                        await refreshToken();
                        const fresh = localStorage.getItem('accessToken');
                        if (fresh) {
                            // update auth for the same socket instance then reconnect
                            (newSocket as any).auth = { token: fresh };
                            newSocket.connect();
                            return;
                        }
                    } catch {
                        // fallthrough to reconnecting state
                    }
                }
                setConnectionStatus('reconnecting');
            });

            newSocket.io.on("reconnect_attempt", () => {
                setConnectionStatus('reconnecting');
            });

            newSocket.io.on("reconnect", () => {
                setConnectionStatus('connected');
            });

            newSocket.io.on("error", () => {
                setConnectionStatus('disconnected');
            });

            newSocket.on("user:status", ({ userId, status, lastSeen }: { userId: string, status: string, lastSeen?: string }) => {
                setOnlineUsers(prev => ({ ...prev, [userId]: { status, lastSeen } }));
            });

            newSocket.on("message:receive", (message: Message) => {
                // Use refs to get the latest values to avoid stale closures
                const currentActive = activeChatRef.current;
                const currentUser = userRef.current;

                // Determine if the message belongs to the currently active private chat
                const isOutgoing = currentUser?.id && String(message.senderId) === String(currentUser.id);
                const otherPartyId = isOutgoing ? message.receiverId : message.senderId;

                if (currentActive && otherPartyId && String(currentActive) === String(otherPartyId)) {
                    setMessages(prev => {
                        if (isOutgoing) {
                            // Try to replace an optimistic temp message
                            const idx = prev.findIndex(m => m.id.startsWith('temp-')
                                && String(m.senderId) === String(currentUser?.id)
                                && String(m.receiverId) === String(otherPartyId)
                                && m.iv === message.iv
                                && m.cipherText === message.cipherText);
                            if (idx !== -1) {
                                const copy = [...prev];
                                copy[idx] = message;
                                return copy;
                            }
                        }
                        return [...prev, message];
                    });
                    // Mark as read for incoming messages only
                    if (!isOutgoing) {
                        newSocket.emit("message:read", { messageId: message.id, from: message.senderId });
                    }
                } else if (!isOutgoing) {
                    // Show notification for incoming messages from other chats
                    decryptMessage(message.cipherText, message.iv)
                        .then(async text => {
                            toast.success(`New message from ${message.senderId}: ${text}`, {
                                icon: '💬',
                                duration: 4000
                            });

                            // Index incoming message
                            await db.messages.put({
                                messageId: message.id,
                                chatId: String(otherPartyId),
                                senderId: String(message.senderId),
                                content: text,
                                timestamp: new Date(message.createdAt),
                                type: 'private'
                            });
                        })
                        .catch(() => {
                            toast.success(`New message from ${message.senderId}`, { icon: '💬' });
                        });
                }

                // If it's the active chat, we should also index it if it's not outgoing (outgoing is indexed in sendMessage)
                if (currentActive && otherPartyId && String(currentActive) === String(otherPartyId) && !isOutgoing) {
                    decryptMessage(message.cipherText, message.iv).then(async text => {
                        await db.messages.put({
                            messageId: message.id,
                            chatId: String(otherPartyId),
                            senderId: String(message.senderId),
                            content: text,
                            timestamp: new Date(message.createdAt),
                            type: 'private'
                        });
                    }).catch(() => { });
                }

                // Update conversations list using the other participant in the conversation
                setConversations(prev => {
                    if (!otherPartyId) return prev;
                    const idx = prev.findIndex(c => c.participants.some(p => String(p.id) === String(otherPartyId)));
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            lastMessage: message,
                            unreadCount: String(currentActive) === String(otherPartyId) ? 0 : updated[idx].unreadCount + (isOutgoing ? 0 : 1)
                        };
                        // Reorder like real chat apps: most recent conversation at top
                        return updated.sort((a, b) => {
                            const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                            const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                            return bt - at;
                        });
                    }
                    return prev;
                });
            });

            newSocket.on("message:status", ({ messageId, status }: { messageId: string, status: string }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: status as unknown as Message['status'] } : m));
            });

            newSocket.on("typing:start", ({ from }: { from: string }) => {
                setTypingStatus(prev => ({ ...prev, [from]: true }));
            });

            newSocket.on("typing:stop", ({ from }: { from: string }) => {
                setTypingStatus(prev => ({ ...prev, [from]: false }));
            });

            newSocket.on("message:reaction", ({ messageId, userId, emoji, action }: { messageId: string, userId: string, emoji: string, action: 'add' | 'remove' }) => {
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        const reactions = m.reactions || [];
                        if (action === 'add') {
                            if (!reactions.find(r => r.userId === userId && r.emoji === emoji)) {
                                return { ...m, reactions: [...reactions, { id: `${messageId}-${userId}-${emoji}`, messageId, userId, emoji, createdAt: new Date().toISOString() }] };
                            }
                        } else {
                            return { ...m, reactions: reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) };
                        }
                    }
                    return m;
                }));
            });

            newSocket.on("group:message:reaction", ({ messageId, userId, emoji, action }: { messageId: string, userId: string, emoji: string, action: 'add' | 'remove', groupId: string }) => {
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        const reactions = m.reactions || [];
                        if (action === 'add') {
                            if (!reactions.find(r => r.userId === userId && r.emoji === emoji)) {
                                return { ...m, reactions: [...reactions, { id: `${messageId}-${userId}-${emoji}`, messageId, userId, emoji, createdAt: new Date().toISOString() }] };
                            }
                        } else {
                            return { ...m, reactions: reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) };
                        }
                    }
                    return m;
                }));
            });

            newSocket.on("message:edit", ({ messageId, cipherText, iv }: { messageId: string, cipherText: string, iv: string }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, cipherText, iv } : m));
            });

            newSocket.on("message:delete", ({ messageId }: { messageId: string }) => {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            });

            newSocket.on("group:message:edit", ({ messageId, cipherText, iv }: { messageId: string, cipherText: string, iv: string }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, cipherText, iv } : m));
            });

            newSocket.on("group:message:delete", ({ messageId }: { messageId: string }) => {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            });

            newSocket.on("group:message:receive", (message: Message) => {
                const currentActive = activeChatRef.current;
                const currentUser = userRef.current;

                if (currentActive && String(message.groupId) === String(currentActive)) {
                    setMessages(prev => {
                        const exists = prev.find(m => m.id === message.id || (m.id.startsWith('temp-') && m.iv === message.iv));
                        if (exists) return prev.map(m => (m.id === exists.id) ? message : m);
                        return [...prev, message];
                    });
                } else if (currentUser?.id && String(message.senderId) !== String(currentUser.id)) {
                    // Show notification for incoming group messages from other groups
                    decryptMessage(message.cipherText, message.iv)
                        .then(text => {
                            toast.success(`New group message: ${text}`, {
                                icon: '👥',
                                duration: 4000
                            });
                        })
                        .catch(() => {
                            toast.success(`New group message`, { icon: '👥' });
                        });
                }

                setConversations(prev => {
                    const idx = prev.findIndex(c => String(c.id) === String(message.groupId));
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], lastMessage: message };
                        return updated.sort((a, b) => (new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime()));
                    }
                    return prev;
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }
        else {
            setConnectionStatus('disconnected');
        }
    }, [token, refreshToken]);

    useEffect(() => {
        if (user) {
            chatService.getConversations()
                .then(list => {
                    const sorted = list.sort((a, b) => {
                        const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                        const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                        return bt - at;
                    });

                    // Initialize presence state with lastSeen data from participants
                    const initialStatuses: Record<string, { status: string; lastSeen?: string }> = {};
                    sorted.forEach(c => {
                        c.participants.forEach(p => {
                            if (p.id !== user.id) {
                                initialStatuses[p.id] = {
                                    status: 'offline',
                                    lastSeen: (p as any).lastSeen
                                };
                            }
                        });
                    });
                    setOnlineUsers(prev => ({ ...initialStatuses, ...prev }));
                    setConversations(sorted);
                })
                .catch(console.error);
        }
    }, [user]);

    // Fetch messages when active chat changes
    useEffect(() => {
        if (activeChat) {
            const LIMIT = 30;

            // For now, try to fetch as private first, if fail or if we know it's a group, fetch group
            // Better: use conversation type
            const conversation = conversations.find(c => String(c.id) === String(activeChat));
            const fetchPromise = (conversation && !conversation.participants.some(p => String(p.id) === String(activeChat)))
                ? chatService.getGroupMessages(activeChat)
                : chatService.getPrivateMessages(activeChat, { limit: LIMIT });

            fetchPromise
                .then((data) => {
                    setMessages(data);
                    if (data.length > 0) {
                        oldestCursorRef.current = data[0].id;
                    } else {
                        oldestCursorRef.current = null;
                    }
                    setHasMore(data.length >= LIMIT);

                    if (socket) {
                        if (conversation && !conversation.participants.some(p => String(p.id) === String(activeChat))) {
                            socket.emit("group:join", activeChat);
                        }
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch messages", err);
                });
        } else {
            setMessages([]);
            setHasMore(true);
            oldestCursorRef.current = null;
        }
    }, [activeChat, conversations.length, socket]);

    const sendMessage = async (to: string, text: string, media?: { id: string, type: string, filename: string }) => {
        if (!socket || !user?.id) return;

        try {
            const encrypted = await encryptMessage(text || 'Attachment'); // Encrypt placeholder if text is empty
            const conversation = conversations.find(c => String(c.id) === String(to));
            const isGroup = conversation?.type === 'GROUP';

            // Optimistic message
            const tempId = `temp-${Date.now()}`;
            const optimisticMsg: Message = {
                id: tempId,
                senderId: String(user.id),
                [isGroup ? 'groupId' : 'receiverId']: String(to),
                cipherText: encrypted.cipherText,
                iv: encrypted.iv,
                keyVersion: isGroup ? 1 : undefined,
                status: "SENT",
                createdAt: new Date().toISOString(),
                media // Add media to optimistic message
            } as any;

            setMessages(prev => [...prev, optimisticMsg]);

            if (isGroup) {
                socket.emit("group:message:send", {
                    groupId: to,
                    cipherText: encrypted.cipherText,
                    iv: encrypted.iv,
                    keyVersion: 1,
                    media // Send media metadata
                });
            } else {
                socket.emit("message:send", {
                    to,
                    ...encrypted,
                    media // Send media metadata
                });

                // Index outgoing message
                await db.messages.put({
                    messageId: tempId, // Use tempId for now, update on ack if needed
                    chatId: String(to),
                    senderId: String(user.id),
                    content: text,
                    timestamp: new Date(),
                    type: 'private'
                });
            }
        } catch (err) {
            console.error("Failed to send message", err);
            toast.error("Failed to send message");
        }
    };

    const loadMore = async () => {
        const chatId = activeChatRef.current;
        if (!chatId || !hasMore) return;
        const beforeId = oldestCursorRef.current || undefined;
        const LIMIT = 30;
        try {
            setLoadingMore(true);
            const older = await chatService.getPrivateMessages(chatId, { beforeId, limit: LIMIT });
            if (older.length > 0) {
                setMessages(prev => [...older, ...prev]);
                oldestCursorRef.current = older[0].id;
            }
            setHasMore(older.length >= LIMIT);
        } catch {
            console.error('Failed to load more messages');
        } finally {
            setLoadingMore(false);
        }
    };

    const sendReaction = (messageId: string, emoji: string, action: 'add' | 'remove') => {
        if (!socket || !activeChat) return;

        // Check if group or private
        const conversation = conversations.find(c => String(c.id) === String(activeChat));
        const isGroupConv = conversation && !conversation.participants.some(p => String(p.id) === String(activeChat));

        if (isGroupConv) {
            socket.emit("group:message:reaction", {
                messageId,
                groupId: activeChat,
                emoji,
                action
            });
        } else {
            socket.emit("message:reaction", {
                messageId,
                emoji,
                action,
                to: activeChat
            });
        }
        // Optimistic update
        setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
                const reactions = m.reactions || [];
                if (action === 'add') {
                    if (!reactions.find(r => r.userId === String(user?.id) && r.emoji === emoji)) {
                        return { ...m, reactions: [...reactions, { id: `temp-${Date.now()}`, messageId, userId: String(user?.id), emoji, createdAt: new Date().toISOString() }] };
                    }
                } else {
                    return { ...m, reactions: reactions.filter(r => !(r.userId === String(user?.id) && r.emoji === emoji)) };
                }
            }
            return m;
        }));
    };

    const createGroup = async (name: string, description?: string, isPublic?: boolean) => {
        try {
            const groupKey = btoa(uuidv4()); // Mock group key
            const encryptedGroupKey = groupKey; // In real life: encrypt with user's public key

            const group = await chatService.createGroup({
                name,
                description,
                isPublic,
                encryptedGroupKey,
                keyVersion: 1
            });

            await refreshConversations();
            toast.success("Group created!");
            return group;
        } catch (error) {
            toast.error("Failed to create group");
            throw error;
        }
    };

    const joinGroup = async (inviteCode: string) => {
        try {
            // In a real app, we'd fetch the group key from an admin or have it in the link
            // For now, we'll mock joining.
            const group = await chatService.joinGroup({
                inviteCode,
                encryptedGroupKey: "mock-joined-key",
                keyVersion: 1
            });

            await refreshConversations();
            toast.success("Joined group!");
            return group;
        } catch (error) {
            toast.error("Invalid invite code or already a member");
            throw error;
        }
    };

    const editMessage = async (messageId: string, newText: string) => {
        if (!socket || !activeChat) return;
        try {
            const encrypted = await encryptMessage(newText);
            const conversation = conversations.find(c => String(c.id) === String(activeChat));
            const isGroup = conversation?.type === 'GROUP';

            if (isGroup) {
                socket.emit("group:message:edit", {
                    messageId,
                    groupId: activeChat,
                    ...encrypted
                });
            } else {
                socket.emit("message:edit", {
                    messageId,
                    to: activeChat,
                    ...encrypted
                });
            }
            // Optimistic update
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...encrypted } : m));

            // Update local index
            const existing = await db.messages.where('messageId').equals(messageId).first();
            if (existing) {
                await db.messages.update(existing.id!, {
                    content: newText
                });
            }
        } catch (err) {
            console.error("Failed to edit message", err);
            toast.error("Failed to edit message");
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!socket || !activeChat) return;
        try {
            const conversation = conversations.find(c => String(c.id) === String(activeChat));
            const isGroup = conversation?.type === 'GROUP';

            if (isGroup) {
                socket.emit("group:message:delete", {
                    messageId,
                    groupId: activeChat
                });
            } else {
                socket.emit("message:delete", {
                    messageId,
                    to: activeChat
                });
            }
            // Optimistic update
            setMessages(prev => prev.filter(m => m.id !== messageId));

            // Delete from local index
            await db.messages.where('messageId').equals(messageId).delete();
        } catch (err) {
            console.error("Failed to delete message", err);
            toast.error("Failed to delete message");
        }
    };

    const refreshConversations = async () => {
        try {
            const list = await chatService.getConversations();
            setConversations(list.sort((a, b) => {
                const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                return bt - at;
            }));
        } catch (err) {
            console.error("Failed to refresh conversations", err);
        }
    };

    const searchLocalMessages = async (query: string, chatId?: string) => {
        if (!query.trim()) return [];
        try {
            const normalizedQuery = query.toLowerCase();
            let collection = db.messages.filter(m =>
                m.content.toLowerCase().includes(normalizedQuery)
            );
            if (chatId) {
                collection = collection.filter(m => m.chatId === chatId);
            }
            return await collection.toArray();
        } catch (err) {
            console.error("Local search failed", err);
            return [];
        }
    };

    return (
        <ChatContext.Provider value={{
            socket,
            conversations,
            activeChat,
            messages,
            setActiveChat,
            sendMessage,
            loadMore,
            loadingMore,
            typingStatus,
            onlineUsers,
            connectionStatus,
            sendReaction,
            createGroup,
            joinGroup,
            editMessage,
            deleteMessage,
            refreshConversations,
            searchLocalMessages
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
};
