import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import userService, { type UserProfile } from "../services/userService";
import {
    LogOut, User as UserIcon, UserPlus, Shield,
    Send, Search, Plus, X, Settings, Pencil, Trash2,
    Users, Link as LinkIcon, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import { decryptMessage } from "../utils/encryption";
import { useNotifications } from "../context/NotificationContext";

export default function Dashboard() {
    const { logout, user } = useAuth();
    const {
        conversations,
        activeChat,
        messages,
        setActiveChat,
        sendMessage,
        typingStatus,
        onlineUsers,
        connectionStatus,
        loadMore,
        loadingMore,
        sendReaction,
        createGroup,
        joinGroup,
        editMessage,
        deleteMessage
    } = useChat();

    const {
        notifications,
        unreadCount: globalUnreadCount,
        markAsRead
    } = useNotifications();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showJoinGroup, setShowJoinGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [inviteCode, setInviteCode] = useState('');

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
        try {
            const cached = localStorage.getItem('userDirectory');
            return cached ? JSON.parse(cached) as UserProfile[] : [];
        } catch {
            return [];
        }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [showProfile, setShowProfile] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Resolve self id reliably even before user is fully loaded
    const selfId = useMemo(() => String(user?.id || localStorage.getItem('userId') || ''), [user]);

    // Dispose object URL preview if any
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    // Fetch profile and all users
    useEffect(() => {
        const initData = async () => {
            // Early check: if no access token, don't try to fetch data
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                console.log('No access token found, skipping data fetch');
                setLoading(false);
                return;
            }

            try {
                const [profileData, usersData] = await Promise.all([
                    userService.getProfile(),
                    userService.getAllUsers()
                ]);
                setProfile(profileData);
                setAllUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                // Don't show error toast if it's an auth error (will be handled by interceptor)
                if (!(error as any)?.message?.includes('No refresh token')) {
                    toast.error("Could not load dashboard data.");
                }
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

    // Persist directory cache when it changes
    useEffect(() => {
        try {
            localStorage.setItem('userDirectory', JSON.stringify(allUsers));
        } catch {
            // ignore quota/serialisation errors
        }
    }, [allUsers]);

    // Ensure sidebar partner names are always available: fetch missing partner profiles by id
    useEffect(() => {
        const ensurePartnerProfiles = async () => {
            try {
                const knownIds = new Set(allUsers.map(u => String(u.id)));
                const missingIds = new Set<string>();
                for (const conv of conversations) {
                    const partner = conv.participants.find(p => String(p.id) !== selfId) || conv.participants[0];
                    if (!partner) continue;
                    const pid = String(partner.id || '');
                    if (!pid) continue;
                    if (!knownIds.has(pid)) {
                        missingIds.add(pid);
                    }
                }
                if (missingIds.size === 0) return;
                const fetched = await Promise.all(
                    Array.from(missingIds).map(id => userService.getUserById(id).catch(() => null))
                );
                const valid = fetched.filter((u): u is UserProfile => !!u);
                if (valid.length > 0) {
                    setAllUsers(prev => {
                        const map = new Map(prev.map(u => [String(u.id), u] as const));
                        for (const u of valid) map.set(String(u.id), u);
                        return Array.from(map.values());
                    });
                }
            } catch {
                // silent fail; sidebar will fallback to 'Unknown'
            }
        };
        if (conversations.length > 0) {
            ensurePartnerProfiles();
        }
    }, [conversations, allUsers, selfId]);

    // Build WhatsApp-like chat list: one row per partner, showing the most recent conversation with them
    const displayConversations = useMemo(() => {
        const byPartner = new Map<string, typeof conversations[number]>();
        const groups: typeof conversations = [];

        for (const conv of conversations) {
            if (conv.type === 'GROUP') {
                groups.push(conv);
                continue;
            }

            // Private conversation logic
            const lm = conv.lastMessage;
            let partnerId: string | null = null;
            if (lm && lm.senderId && lm.receiverId) {
                partnerId = String(lm.senderId) === selfId ? String(lm.receiverId) : String(lm.senderId);
            } else if (conv.participants && conv.participants.length > 0) {
                const p = conv.participants.find(p => String(p.id) !== selfId) || conv.participants[0];
                partnerId = p ? String(p.id) : null;
            }
            if (!partnerId || partnerId === selfId) continue;

            const existing = byPartner.get(partnerId);
            if (!existing) {
                byPartner.set(partnerId, conv);
            } else {
                const a = existing.lastMessage?.createdAt ? new Date(existing.lastMessage.createdAt).getTime() : 0;
                const b = conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).getTime() : 0;
                if (b > a) byPartner.set(partnerId, conv);
            }
        }
        const list = [...Array.from(byPartner.values()), ...groups];
        return list.sort((a, b) => {
            const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bt - at;
        });
    }, [conversations, selfId]);

    // Filter users based on search
    const filteredUsers = useMemo(() => {
        return allUsers.filter(u =>
            u.id !== user?.id &&
            (u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [allUsers, searchQuery, user]);

    // Decrypt messages as they arrive
    useEffect(() => {
        const decryptAll = async () => {
            const newDecrypted: Record<string, string> = { ...decryptedMessages };
            let updated = false;
            for (const msg of messages) {
                if (!newDecrypted[msg.id]) {
                    try {
                        newDecrypted[msg.id] = await decryptMessage(msg.cipherText, msg.iv);
                        updated = true;
                    } catch (e) {
                        console.error("Decryption failed for message", msg.id, e);
                    }
                }
            }
            if (updated) setDecryptedMessages(newDecrypted);
        };
        decryptAll();
    }, [messages, decryptedMessages]);

    // Scroll to bottom on new messages appended (not when loading older)
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load older messages when scrolled near top
    const handleScroll = async () => {
        const el = messagesContainerRef.current;
        if (!el) return;
        if (el.scrollTop <= 80) {
            const prevHeight = el.scrollHeight;
            await loadMore();
            // Maintain viewport position after prepend
            const newHeight = el.scrollHeight;
            el.scrollTop = newHeight - prevHeight + el.scrollTop;
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        try {
            await createGroup(groupName, groupDesc, isPublic);
            setShowCreateGroup(false);
            setGroupName('');
            setGroupDesc('');
        } catch (error) {
            // Toast handled in context
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;
        try {
            await joinGroup(inviteCode);
            setShowJoinGroup(false);
            setInviteCode('');
        } catch (error) {
            // Toast handled in context
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeChat) return;

        await sendMessage(activeChat, input);
        setInput('');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    const activeConversation = conversations.find(c =>
        String(c.id) === String(activeChat) ||
        c.participants.some(p => String(p.id) === String(activeChat))
    );
    const otherUser = activeConversation?.participants.find(p => String(p.id) === String(activeChat)) || allUsers.find(u => String(u.id) === String(activeChat));

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50 backdrop-blur-xl">
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
                            {profile?.profilePic ? (
                                <img src={profile.profilePic} alt="avatar" className="h-10 w-10 object-cover" />
                            ) : (
                                profile?.fullName?.charAt(0) || <UserIcon className="h-5 w-5" />
                            )}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-sm font-bold truncate max-w-[120px]">{profile?.fullName}</h2>
                            <p className="text-[10px] text-green-500 flex items-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`p-2 hover:bg-gray-800 rounded-lg transition-colors relative ${isNotificationOpen ? 'text-blue-400 bg-gray-800' : 'text-gray-400'}`}
                                title="Notifications"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {globalUnreadCount > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full border border-gray-900">
                                        {globalUnreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-gray-800 font-bold text-xs text-white">Notifications</div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500 text-xs">No notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setIsNotificationOpen(false);
                                                    }}
                                                    className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${!n.isRead ? 'bg-blue-600/5 border-l-2 border-blue-500' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className="font-semibold text-[11px] text-gray-200">{n.title}</span>
                                                        <span className="text-[9px] text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 line-clamp-2">{n.body}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors" title="Settings">
                            <Settings className="h-4 w-4" />
                        </button>
                        <button onClick={logout} className="p-2 hover:bg-red-600/10 rounded-lg text-gray-400 hover:text-red-500 transition-all" title="Logout">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Search / New Chat */}
                <div className="p-4 space-y-2">
                    <button
                        onClick={() => setShowUserSearch(true)}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span className="text-sm font-semibold">New Contact</span>
                    </button>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 py-2 rounded-xl transition-all border border-gray-700 active:scale-[0.98]"
                        >
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-semibold">Create Group</span>
                        </button>
                        <button
                            onClick={() => setShowJoinGroup(true)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 py-2 rounded-xl transition-all border border-gray-700 active:scale-[0.98]"
                        >
                            <LinkIcon className="h-4 w-4" />
                            <span className="text-xs font-semibold">Join Group</span>
                        </button>
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 mt-10">
                            <p className="text-sm">No active conversations</p>
                            <button onClick={() => setShowUserSearch(true)} className="text-blue-500 hover:underline text-xs mt-2">Find users</button>
                        </div>
                    ) : (
                        displayConversations.map((conv) => {
                            const isGroup = conv.type === 'GROUP';
                            let partnerId: string | null = null;
                            let displayName = '';
                            let displayPic: string | undefined = undefined;

                            if (isGroup) {
                                partnerId = conv.id;
                                displayName = conv.name || 'Group';
                            } else {
                                // Resolve partner for private chats
                                const lm = conv.lastMessage;
                                if (lm && lm.senderId && lm.receiverId) {
                                    partnerId = String(lm.senderId) === selfId ? String(lm.receiverId) : String(lm.senderId);
                                } else if (conv.participants && conv.participants.length > 0) {
                                    const p = conv.participants.find(p => String(p.id) !== selfId) || conv.participants[0];
                                    partnerId = p ? String(p.id) : null;
                                }
                                const partnerProfile = allUsers.find(u => String(u.id) === String(partnerId));
                                displayName = partnerProfile?.fullName || partnerProfile?.email || 'Unknown';
                                displayPic = partnerProfile?.profilePic || undefined;
                            }

                            if (!partnerId) return null;
                            const isOnline = !isGroup && onlineUsers[partnerId] === 'online';
                            const isActive = activeChat === partnerId;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveChat(partnerId)}
                                    className={`p-4 flex items-center space-x-3 cursor-pointer transition-all relative ${isActive ? 'bg-blue-600/10 border-r-2 border-blue-500' : 'hover:bg-gray-800/50'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`h-12 w-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg border ${isActive ? 'border-blue-500' : 'border-gray-700'} ${isGroup ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800'}`}>
                                            {displayPic ? (
                                                <img src={displayPic} alt="avatar" className="h-12 w-12 object-cover" />
                                            ) : (
                                                displayName?.charAt(0)
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-gray-900 shadow-sm"></div>
                                        )}
                                        {isGroup && (
                                            <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] font-black px-1 rounded border border-gray-900">GRP</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className={`font-semibold truncate text-sm ${isActive ? 'text-blue-400' : 'text-gray-200'}`}>{displayName}</h4>
                                            {conv.lastMessage && (
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">
                                            {conv.lastMessage ? (decryptedMessages[conv.lastMessage.id] || '...') : 'No messages yet'}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-500 text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                                            {conv.unreadCount}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col bg-gray-900/20 backdrop-blur-sm relative">
                {activeChat ? (
                    <div className="contents">
                        {/* Chat Header */}
                        <header className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/40 backdrop-blur-md sticky top-0 z-10 transition-all">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg border border-white/10">
                                    {activeConversation?.name?.charAt(0) || otherUser?.fullName?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white flex items-center">
                                        {activeConversation?.name || otherUser?.fullName}
                                        {activeConversation?.type === 'GROUP' && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/30 uppercase tracking-tighter font-black">Group</span>
                                        )}
                                    </h3>
                                    <div className="flex items-center text-[10px]">
                                        {activeConversation?.type === 'GROUP' ? (
                                            <div className="flex items-center space-x-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1"></span>
                                                {activeConversation.inviteCode && (
                                                    <span className="text-gray-400 cursor-pointer hover:text-blue-400 flex items-center transition-all bg-gray-800/50 px-2 py-0.5 rounded-md border border-gray-700/50 hover:border-blue-500/30" onClick={() => {
                                                        navigator.clipboard.writeText(activeConversation.inviteCode!);
                                                        toast.success("Invite code copied!", {
                                                            icon: '📋',
                                                            style: {
                                                                borderRadius: '10px',
                                                                background: '#1f2937',
                                                                color: '#fff',
                                                            },
                                                        });
                                                    }}>
                                                        <span className="mr-1.5 opacity-60">Invite:</span>
                                                        <span className="font-mono text-[9px]">{activeConversation.inviteCode}</span>
                                                        <Copy className="h-2.5 w-2.5 ml-2 text-blue-400" />
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            typingStatus[activeChat!] ? (
                                                <span className="text-blue-400 italic font-medium animate-pulse">typing...</span>
                                            ) : (
                                                <div className="flex items-center">
                                                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${onlineUsers[activeChat!] === 'online' ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                                    <span className="text-gray-400">{onlineUsers[activeChat!] === 'online' ? 'Online' : 'Offline'}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Sidebar Toggle Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowUserSearch(true)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-blue-400"
                                    title="Start New Chat"
                                >
                                    <UserPlus size={20} />
                                </button>
                                <button
                                    onClick={() => setShowProfile(!showProfile)}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
                                    title="View Profile"
                                >
                                    <Settings size={20} />
                                </button>
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        window.location.href = '/login';
                                    }}
                                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-red-400"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </header>

                        {connectionStatus !== 'connected' && (
                            <div className="px-4 py-1 text-center text-[11px] bg-gray-800/70 text-gray-300 border-b border-gray-700">
                                {connectionStatus === 'connecting' && 'Connecting to chat...'}
                                {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                                {connectionStatus === 'disconnected' && 'You are offline. Trying to reconnect...'}
                            </div>
                        )}

                        {/* Messages Area */}
                        <div
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] custom-scrollbar"
                        >
                            {loadingMore && (
                                <div className="flex items-center justify-center py-2 text-[11px] text-gray-400">
                                    Loading older messages…
                                </div>
                            )}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                                    <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center">
                                        <Shield className="h-8 w-8 text-blue-500/30" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-300">End-to-End Encrypted</p>
                                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Messages are secured with AES-GCM encryption.</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg) => {
                                const isMe = String(msg.senderId) === String(user?.id);

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-4 py-2.5 shadow-xl transition-all ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
                                                }`}>
                                                {editingMessageId === msg.id ? (
                                                    <div className="flex items-center space-x-2 w-full min-w-[200px]">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="flex-1 bg-gray-900 border border-blue-500 rounded px-2 py-1 text-sm outline-none text-white"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && editValue.trim()) {
                                                                    editMessage(msg.id, editValue);
                                                                    setEditingMessageId(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingMessageId(null);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => { if (editValue.trim()) editMessage(msg.id, editValue); setEditingMessageId(null); }}
                                                            className="text-blue-400 text-xs font-bold hover:text-blue-300"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMessageId(null)}
                                                            className="text-gray-400 text-xs font-bold hover:text-gray-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                        {msg.status === 'DELETED' ? (
                                                            <span className="italic opacity-50 flex items-center gap-1.5">
                                                                <Trash2 size={12} className="opacity-50" /> Message deleted
                                                            </span>
                                                        ) : (
                                                            decryptedMessages[msg.id] || <span className="italic opacity-50">Decrypting...</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                                {isMe && msg.status !== 'DELETED' && !editingMessageId && (
                                                    <div className="flex items-center space-x-1 mr-2 bg-gray-800/50 rounded-lg px-1 py-0.5 border border-gray-700/50">
                                                        <button
                                                            onClick={() => {
                                                                setEditingMessageId(msg.id);
                                                                setEditValue(decryptedMessages[msg.id] || '');
                                                            }}
                                                            className="p-1 hover:bg-gray-700 rounded text-blue-400 transition-colors"
                                                            title="Edit Message"
                                                        >
                                                            <Pencil size={11} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Delete this message for everyone?')) {
                                                                    deleteMessage(msg.id);
                                                                }
                                                            }}
                                                            className="p-1 hover:bg-gray-700 rounded text-red-400 transition-colors"
                                                            title="Delete Message"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                )}
                                                <span className="text-[9px] text-gray-500">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    (() => {
                                                        const isPartnerOnline = activeChat ? onlineUsers[activeChat] === 'online' : false;
                                                        let ticks = '✓';
                                                        let color = 'text-gray-600';
                                                        const title = `Status: ${msg.status}`;
                                                        if (msg.status === 'READ') {
                                                            ticks = '✓✓';
                                                            color = 'text-blue-400';
                                                        } else if (msg.status === 'DELIVERED') {
                                                            ticks = '✓✓';
                                                        } else if (msg.status === 'SENT') {
                                                            // For a real-time feel: if recipient is online, show double tick even before delivered
                                                            ticks = isPartnerOnline ? '✓✓' : '✓';
                                                        }
                                                        return (
                                                            <span className={`text-[9px] font-bold ${color}`} title={title}>
                                                                {ticks}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                                <div className="flex items-center space-x-1 ml-2">
                                                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => sendReaction(msg.id, emoji, 'add')}
                                                            className="hover:scale-125 transition-transform p-0.5"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Reaction Display */}
                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {Object.entries(
                                                        msg.reactions.reduce((acc, r) => {
                                                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                            return acc;
                                                        }, {} as Record<string, number>)
                                                    ).map(([emoji, count]) => (
                                                        <div
                                                            key={emoji}
                                                            onClick={() => sendReaction(msg.id, emoji, 'remove')}
                                                            className="bg-gray-800/80 border border-gray-700/50 rounded-full px-1.5 py-0.5 text-[10px] flex items-center space-x-1 cursor-pointer hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className="text-gray-400 font-bold">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        {/* Message Input */}
                        <footer className="p-4 bg-gray-900/60 backdrop-blur-md border-t border-gray-800">
                            <form onSubmit={handleSend} className="flex items-center space-x-3 bg-gray-800/80 rounded-2xl px-4 py-1.5 border border-gray-700/50 focus-within:border-blue-500/50 transition-all shadow-inner">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a secure message..."
                                    className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder-gray-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="bg-blue-600 p-2 rounded-xl text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                    title="Send Message"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </footer>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                        <div className="h-24 w-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mb-8 shadow-2xl border border-gray-700/50 animate-bounce-subtle">
                            <UserIcon className="h-12 w-12 text-gray-700" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Welcome to Your Workspace</h2>
                        <p className="max-w-md text-sm text-gray-400 leading-relaxed">
                            Pick a conversation from the sidebar or start a new one to begin chatting. All your messages are protected with state-of-the-art end-to-end encryption.
                        </p>
                        <button
                            onClick={() => setShowUserSearch(true)}
                            className="mt-8 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl transition-all border border-gray-700 shadow-xl flex items-center space-x-2"
                            title="Start a new conversation"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="text-sm font-medium">New Conversation</span>
                        </button>
                    </div>
                )}

                {/* Profile Slide-over (simplified) */}
                {showProfile && (
                    <div className="fixed inset-0 z-20 bg-black/50 flex justify-end" onClick={() => setShowProfile(false)}>
                        <div className="w-80 h-full bg-gray-900 border-l border-gray-800 p-4" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-sm font-bold mb-4">Profile</h3>
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="h-14 w-14 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="preview" className="h-14 w-14 object-cover" />
                                    ) : profile?.profilePic ? (
                                        <img src={profile.profilePic} alt="avatar" className="h-14 w-14 object-cover" />
                                    ) : (
                                        <span className="text-lg font-bold">{profile?.fullName?.charAt(0) || '?'}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        title="Change profile picture"
                                        aria-label="Upload profile picture"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setAvatarFile(file);
                                            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                                            setAvatarPreview(file ? URL.createObjectURL(file) : null);
                                        }}
                                        className="text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                    />
                                </div>
                            </div>
                            <button
                                disabled={!avatarFile || uploadingAvatar}
                                onClick={async () => {
                                    if (!avatarFile) return;
                                    try {
                                        setUploadingAvatar(true);
                                        const fd = new FormData();
                                        fd.append('profilePic', avatarFile);
                                        const updated = await userService.updateProfile(fd);
                                        setProfile(updated);
                                        try { localStorage.setItem('profile', JSON.stringify(updated)); } catch (e) {
                                            // ignore quota errors
                                        }
                                        setAvatarFile(null);
                                        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                                        setAvatarPreview(null);
                                        toast.success('Profile picture updated');
                                    } catch {
                                        console.error('Avatar upload failed');
                                        toast.error('Failed to update avatar');
                                    } finally {
                                        setUploadingAvatar(false);
                                    }
                                }}
                                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold"
                            >
                                {uploadingAvatar ? 'Uploading...' : 'Update Picture'}
                            </button>

                            <div className="mt-6">
                                <p className="text-xs text-gray-400">Name</p>
                                <p className="text-sm text-gray-200 font-semibold">{profile?.fullName}</p>
                                <p className="text-xs text-gray-400 mt-3">Email</p>
                                <p className="text-sm text-gray-200 font-semibold break-all">{profile?.email}</p>
                            </div>
                        </div>
                    </div>
                )}
                {showProfile && (
                    <div className="absolute inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 z-50 shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold">Profile</h2>
                                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-800 rounded-lg" title="Close Profile"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="flex flex-col items-center mb-8">
                                <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold mb-4 shadow-2xl">
                                    {profile?.fullName?.charAt(0)}
                                </div>
                                <h3 className="text-lg font-bold">{profile?.fullName}</h3>
                                <p className="text-sm text-gray-400 capitalize">{profile?.status?.toLowerCase()}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Email</p>
                                    <p className="text-sm truncate">{profile?.email}</p>
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Member Since</p>
                                    <p className="text-sm">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button onClick={logout} className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all font-bold" title="Logout">
                                    <LogOut className="h-4 w-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* User Search Overlay */}
            {
                showUserSearch && (
                    <div className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-start p-8 animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl flex flex-col h-[85vh] bg-gray-900 rounded-3xl border border-gray-800 shadow-3xl">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Find People</h2>
                                    <p className="text-xs text-gray-500 mt-1">Start a secure, encrypted conversation</p>
                                </div>
                                <button
                                    onClick={() => setShowUserSearch(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                    title="Close Search"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="px-6 py-4 shrink-0">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-base transition-all placeholder-gray-600 outline-none"
                                        title="Search for users"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 custom-scrollbar">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="h-20 w-20 bg-gray-800 mx-auto rounded-full flex items-center justify-center mb-4">
                                            <Search className="h-8 w-8 text-gray-700" />
                                        </div>
                                        <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                setActiveChat(u.id);
                                                setShowUserSearch(false);
                                                setSearchQuery('');
                                            }}
                                            className="p-4 flex items-center space-x-4 hover:bg-blue-600/10 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-blue-500/20 active:scale-[0.99] group"
                                            title={`Start chat with ${u.fullName}`}
                                        >
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
                                                {u.fullName?.charAt(0) || u.email?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-100 group-hover:text-blue-400 transition-colors">{u.fullName}</h4>
                                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                            </div>
                                            <div className="hidden group-hover:block transition-all">
                                                <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">CHAT</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-950/50">
                            <h3 className="text-xl font-bold">Create New Group</h3>
                            <button onClick={() => setShowCreateGroup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Enter group name..."
                                    className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Description (Optional)</label>
                                <textarea
                                    value={groupDesc}
                                    onChange={(e) => setGroupDesc(e.target.value)}
                                    placeholder="What is this group about?"
                                    className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-24"
                                />
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-xl border border-white/5">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="isPublic" className="flex-1 cursor-pointer">
                                    <span className="block text-sm font-semibold">Public Group</span>
                                    <span className="block text-[10px] text-gray-500">Anyone with the invite code can join.</span>
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                            >
                                Create Group
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Group Modal */}
            {showJoinGroup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-950/50">
                            <h3 className="text-xl font-bold">Join Group</h3>
                            <button onClick={() => setShowJoinGroup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Close">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleJoinGroup} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Invite Code</label>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    placeholder="Paste invite code here..."
                                    className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-2"
                            >
                                Join Group
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
