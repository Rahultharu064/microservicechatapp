import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import userService, { type UserProfile } from "../services/userService";
import {
    LogOut, User as UserIcon, UserPlus, Calendar, Mail, Shield,
    Send, Search, MoreVertical, Plus, X, Settings, Bell
} from "lucide-react";
import toast from "react-hot-toast";
import { decryptMessage } from "../utils/encryption";

export default function Dashboard() {
    const { logout, user } = useAuth();
    const {
        conversations,
        activeChat,
        messages,
        setActiveChat,
        sendMessage,
        typingStatus,
        onlineUsers
    } = useChat();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showProfile, setShowProfile] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch profile and all users
    useEffect(() => {
        const initData = async () => {
            try {
                const [profileData, usersData] = await Promise.all([
                    userService.getProfile(),
                    userService.getAllUsers()
                ]);
                setProfile(profileData);
                setAllUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                toast.error("Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        initData();
    }, []);

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

    // Scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const activeConversation = conversations.find(c => c.participants.some(p => p.id === activeChat));
    const otherUser = activeConversation?.participants.find(p => p.id === activeChat) || allUsers.find(u => u.id === activeChat);

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50 backdrop-blur-xl">
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
                            {profile?.fullName?.charAt(0) || <UserIcon className="h-5 w-5" />}
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
                        <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors" title="Settings">
                            <Settings className="h-4 w-4" />
                        </button>
                        <button onClick={logout} className="p-2 hover:bg-red-600/10 rounded-lg text-gray-400 hover:text-red-500 transition-all" title="Logout">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Search / New Chat */}
                <div className="p-4">
                    <button
                        onClick={() => setShowUserSearch(true)}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-semibold">Start New Chat</span>
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 mt-10">
                            <p className="text-sm">No active conversations</p>
                            <button onClick={() => setShowUserSearch(true)} className="text-blue-500 hover:underline text-xs mt-2">Find users</button>
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const partner = conv.participants.find(p => p.id !== user?.id);
                            const isOnline = onlineUsers[partner?.id || ''] === 'online';
                            const isActive = activeChat === partner?.id;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveChat(partner?.id || null)}
                                    className={`p-4 flex items-center space-x-3 cursor-pointer transition-all relative ${isActive ? 'bg-blue-600/10 border-r-2 border-blue-500' : 'hover:bg-gray-800/50'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center font-bold text-lg border border-gray-700">
                                            {partner?.fullName.charAt(0)}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-gray-900 shadow-sm"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className={`font-semibold truncate text-sm ${isActive ? 'text-blue-400' : 'text-gray-200'}`}>{partner?.fullName}</h4>
                                            {conv.lastMessage && (
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">
                                            {conv.lastMessage ? (decryptedMessages[conv.lastMessage.id] || '...') : 'Start chatting'}
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
                                <div className="h-10 w-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold border border-blue-500/20">
                                    {otherUser?.fullName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{otherUser?.fullName}</h3>
                                    <div className="flex items-center text-[10px]">
                                        {typingStatus[activeChat] ? (
                                            <span className="text-blue-400 italic font-medium animate-pulse">typing...</span>
                                        ) : (
                                            <div className="flex items-center">
                                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${onlineUsers[activeChat] === 'online' ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                                <span className="text-gray-400">{onlineUsers[activeChat] === 'online' ? 'Online' : 'Offline'}</span>
                                            </div>
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

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] custom-scrollbar">
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
                            {messages.map((msg, idx) => {
                                const isMe = String(msg.senderId) === String(user?.id);
                                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-4 py-2.5 shadow-xl transition-all ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
                                                }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {decryptedMessages[msg.id] || <span className="italic opacity-50">Decrypting...</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                                <span className="text-[9px] text-gray-500">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    <span className={`text-[9px] font-bold ${msg.status === 'READ' ? 'text-blue-400' : 'text-gray-600'}`} title={`Status: ${msg.status}`}>
                                                        {msg.status === 'READ' ? '✓✓' : msg.status === 'DELIVERED' ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </div>
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
                                                {u.fullName.charAt(0)}
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

        </div>
    );
}
