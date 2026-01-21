import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { Send, User, Search, MoreVertical, Shield } from 'lucide-react';
import { decryptMessage } from '../utils/encryption';

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const otherUser = activeConversation?.participants.find(p => p.id === activeChat);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-900 text-white rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Chats</h2>
          <Search className="h-5 w-5 text-gray-400 cursor-pointer" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 mt-10">No conversations yet</div>
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
            <p className="max-w-md">Select a conversation from the sidebar to start messaging. All chats are end-to-end encrypted using high-grade security protocols.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;

