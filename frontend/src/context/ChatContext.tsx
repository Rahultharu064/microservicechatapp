import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import chatService from "../services/chatService";
import type { Message, Conversation } from "../services/chatService";
import { encryptMessage } from "../utils/encryption";
import toast from "react-hot-toast";

interface ChatContextType {
    socket: Socket | null;
    conversations: Conversation[];
    activeChat: string | null;
    messages: Message[];
    setActiveChat: (chatId: string | null) => void;
    sendMessage: (to: string, text: string) => Promise<void>;
    loadMore: () => Promise<void>;
    loadingMore: boolean;
    typingStatus: Record<string, boolean>;
    onlineUsers: Record<string, string>;
    connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
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
    const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
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
                transports: ["websocket"],
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

            newSocket.on("user:status", ({ userId, status }: { userId: string, status: string }) => {
                setOnlineUsers(prev => ({ ...prev, [userId]: status }));
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

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }
        else {
            setConnectionStatus('disconnected');
        }
    }, [token, refreshToken]);

    // Fetch initial conversations
    useEffect(() => {
        if (user) {
            chatService.getConversations()
                .then(list => list.sort((a, b) => {
                    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                    return bt - at;
                }))
                .then(setConversations)
                .catch(console.error);
        }
    }, [user]);

    // Fetch messages when active chat changes
    useEffect(() => {
        if (activeChat) {
            const LIMIT = 30;
            chatService.getPrivateMessages(activeChat, { limit: LIMIT })
                .then((data) => {
                    setMessages(data);
                    if (data.length > 0) {
                        // Data is ascending (oldest -> newest). Track oldest message id for cursor.
                        oldestCursorRef.current = data[0].id;
                    } else {
                        oldestCursorRef.current = null;
                    }
                    setHasMore(data.length >= LIMIT);
                })
                .catch(err => {
                    console.error("Failed to fetch messages", err);
                    toast.error("Failed to load chat history");
                });
        } else {
            setMessages([]);
            setHasMore(true);
            oldestCursorRef.current = null;
        }
    }, [activeChat]);

    const sendMessage = async (to: string, text: string) => {
        if (!socket || !user?.id) return;

        try {
            const encrypted = await encryptMessage(text);

            // Optimistic message
            const tempId = `temp-${Date.now()}`;
            const optimisticMsg: Message = {
                id: tempId,
                senderId: String(user.id),
                receiverId: String(to),
                cipherText: encrypted.cipherText,
                iv: encrypted.iv,
                status: "SENT",
                createdAt: new Date().toISOString()
            } as Message;

            setMessages(prev => [...prev, optimisticMsg]);
            setConversations(prev => {
                const idx = prev.findIndex(c => c.participants.some(p => p.id === to));
                if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = {
                        ...updated[idx],
                        lastMessage: optimisticMsg,
                        unreadCount: 0
                    };
                    // Reorder on send as well
                    return updated.sort((a, b) => {
                        const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                        const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                        return bt - at;
                    });
                }
                return prev;
            });

            socket.emit("message:send", {
                to,
                ...encrypted
            });
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
            connectionStatus
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
