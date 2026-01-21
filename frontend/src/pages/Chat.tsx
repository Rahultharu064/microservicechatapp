import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { Send, User, Search, MoreVertical, Shield, Plus, X } from 'lucide-react';
import { decryptMessage } from '../utils/encryption';
import userService, { type UserProfile } from '../services/userService.ts';

const Chat: React.FC = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeChat,
    messages,
    setActiveChat,
    sendMessage,
    typingStatus,
    onlineUsers
  } = useChat();

  const [input, setInput] = useState('');
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all users for discovery
  useEffect(() => {
    userService.getAllUsers().then(setAllUsers).catch(console.error);
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
      for (const msg of messages) {
        if (!newDecrypted[msg.id]) {
          newDecrypted[msg.id] = await decryptMessage(msg.cipherText, msg.iv);
        }
      }
      setDecryptedMessages(newDecrypted);
    };
    decryptAll();
  }, [messages]);

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

  const activeConversation = conversations.find(c => c.participants.some(p => p.id === activeChat));
  const otherUser = activeConversation?.participants.find(p => p.id === activeChat) || allUsers.find(u => u.id === activeChat);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-900 text-white rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">

      {/* User Search Overlay */}
      {showUserSearch && (
        <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-start p-8 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-2xl flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Start New Conversation</h2>
              <button
                onClick={() => setShowUserSearch(false)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                title="Close Search"
                aria-label="Close user search"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 text-lg transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No users found matching "{searchQuery}"</div>
              ) : (
                filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setActiveChat(u.id);
                      setShowUserSearch(false);
                      setSearchQuery('');
                    }}
                    className="p-4 flex items-center space-x-4 hover:bg-gray-800 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-gray-700 active:scale-[0.98]"
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold">{u.fullName}</h4>
                      <p className="text-sm text-gray-400">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
          <h2 className="text-xl font-bold">Chats</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUserSearch(true)}
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-all shadow-lg active:scale-95"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-900/30">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 mt-10">
              <p className="mb-4">No active conversations</p>
              <button
                onClick={() => setShowUserSearch(true)}
                className="text-blue-500 hover:underline font-medium"
              >
                Find someone to talk to
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const partner = conv.participants.find(p => p.id !== user?.id);
              const isOnline = onlineUsers[partner?.id || ''] === 'online';

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveChat(partner?.id || null)}
                  className={`p-4 flex items-center space-x-3 cursor-pointer transition-colors ${activeChat === partner?.id ? 'bg-blue-600/20 border-l-4 border-blue-500' : 'hover:bg-gray-800'}`}
                >
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center font-bold text-lg">
                      {partner?.fullName.charAt(0)}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-semibold truncate">{partner?.fullName}</h4>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.lastMessage ? (decryptedMessages[conv.lastMessage.id] || '...') : 'Start chatting'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                  {otherUser?.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">{otherUser?.fullName}</h3>
                  <p className="text-xs text-gray-400">
                    {typingStatus[activeChat] ? (
                      <span className="text-blue-400 italic">typing...</span>
                    ) : (
                      onlineUsers[activeChat] === 'online' ? 'Online' : 'Offline'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Shield className="h-5 w-5 hover:text-green-400 transition-colors" />
                <MoreVertical className="h-5 w-5 cursor-pointer" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                  <Shield className="h-12 w-12 opacity-20" />
                  <p>Messages are end-to-end encrypted.</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-3 shadow-lg ${isMe ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-800 rounded-tl-none border border-gray-700'}`}>
                      {!isMe && <p className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">{otherUser?.fullName}</p>}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {decryptedMessages[msg.id] || "Encrypted message..."}
                      </p>
                      <div className="flex items-center justify-end space-x-1 mt-1">
                        <span className="text-[10px] opacity-50">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold">
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

            {/* Input */}
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <form onSubmit={handleSend} className="flex items-center space-x-3 bg-gray-800 rounded-2xl px-4 py-1 border border-gray-700 focus-within:border-blue-500 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type an encrypted message..."
                  className="flex-1 bg-transparent py-3 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="bg-blue-600 p-2 rounded-xl text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="h-24 w-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-2xl">
              <User className="h-12 w-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your Workspace Chat</h2>
            <p className="max-w-md">Select a conversation from the sidebar or click the plus icon to find someone to talk to. All chats are end-to-end encrypted.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;

