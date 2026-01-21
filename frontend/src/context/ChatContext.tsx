import React, { createContext, useContext, useEffect, useState } from "react";
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
    typingStatus: Record<string, boolean>;
    onlineUsers: Record<string, string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeChat, setActiveChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
    const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});

    // Initialize Socket
    useEffect(() => {
        if (token) {
            const newSocket = io("http://localhost:5000", {
                auth: { token },
                path: "/socket.io"
            });

            newSocket.on("connect", () => {
                console.log("Connected to chat socket");
            });

            newSocket.on("user:status", ({ userId, status }: { userId: string, status: string }) => {
                setOnlineUsers(prev => ({ ...prev, [userId]: status }));
            });

            newSocket.on("message:receive", (message: Message) => {
                if (activeChat === message.senderId) {
                    setMessages(prev => [...prev, message]);
                    newSocket.emit("message:read", { messageId: message.id, from: message.senderId });
                }
                // Update conversations list
                setConversations(prev => {
                    const idx = prev.findIndex(c => c.participants.some(p => p.id === message.senderId));
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], lastMessage: message, unreadCount: activeChat === message.senderId ? 0 : updated[idx].unreadCount + 1 };
                        return updated;
                    }
                    return prev;
                });
            });

            newSocket.on("message:status", ({ messageId, status }: { messageId: string, status: string }) => {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: status as any } : m));
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
    }, [token, activeChat]);

    // Fetch initial conversations
    useEffect(() => {
        if (user) {
            chatService.getConversations().then(setConversations).catch(console.error);
        }
    }, [user]);

    // Fetch messages when active chat changes
    useEffect(() => {
        if (activeChat) {
            chatService.getPrivateMessages(activeChat)
                .then(setMessages)
                .catch(err => {
                    console.error("Failed to fetch messages", err);
                    toast.error("Failed to load chat history");
                });
        } else {
            setMessages([]);
        }
    }, [activeChat]);

    const sendMessage = async (to: string, text: string) => {
        if (!socket) return;

        try {
            const encrypted = await encryptMessage(text);
            socket.emit("message:send", {
                to,
                ...encrypted
            });

            // Optimistic update could go here, but we wait for message:sent or message:receive
        } catch (err) {
            console.error("Failed to send message", err);
            toast.error("Failed to send message");
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
            typingStatus,
            onlineUsers
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
