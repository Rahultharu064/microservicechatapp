import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import userService, { type UserProfile } from "../services/userService";
import {
    Send, Search, Plus, X, Settings, Pencil, Trash2,
    Users, Link as LinkIcon, Copy, Paperclip, FileText,
    Mic, StopCircle, User, LogOut, UserPlus, Shield, Play, Pause, Video
} from "lucide-react";
import toast from "react-hot-toast";
import { decryptMessage } from "../utils/encryption";
import mediaService from "../services/mediaService";
import VideoMessage from "../components/VideoMessage";
import { useNotifications } from "../context/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// WhatsApp-style Voice Message Player Component
const VoiceMessagePlayer = ({ mediaId, duration, waveform, token, isMe, onForward }: {
    mediaId: string;
    duration: number;
    waveform: number[];
    token: string;
    isMe: boolean;
    onForward?: () => void;
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const waveformRef = useRef<HTMLDivElement>(null);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const changeSpeed = (speed: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
            setShowSpeedMenu(false);
        }
    };

    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !waveformRef.current) return;

        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * duration;

        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const waveformData = waveform && waveform.length > 0 ? waveform : Array(40).fill(0.5);

    return (
        <div className={`flex items-center space-x-2 p-2 rounded-lg min-w-[250px] max-w-[350px] ${isMe ? 'bg-blue-600/20' : 'bg-gray-800/50'} group`}>
            <button
                onClick={togglePlay}
                className={`p-2 rounded-full ${isMe ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-700 hover:bg-gray-600'} transition-colors flex-shrink-0`}
            >
                {isPlaying ? (
                    <Pause size={16} className="text-white fill-current" />
                ) : (
                    <Play size={16} className="text-white fill-current" />
                )}
            </button>

            <div className="flex-1 flex flex-col space-y-1">
                <div
                    ref={waveformRef}
                    onClick={handleWaveformClick}
                    className="flex items-center h-8 gap-0.5 cursor-pointer"
                    title="Click to seek"
                >
                    {waveformData.map((amplitude, i) => {
                        const barProgress = (i / waveformData.length) * 100;
                        const isActive = barProgress <= progress;
                        return (
                            <div
                                key={i}
                                className={`w-0.5 rounded-full transition-all ${isActive
                                    ? (isMe ? 'bg-blue-300' : 'bg-blue-400')
                                    : (isMe ? 'bg-blue-400/30' : 'bg-gray-600')
                                    }`}
                                style={{ height: `${Math.max(20, amplitude * 100)}%` }}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center space-x-1">
                <span className={`text-[10px] font-mono ${isMe ? 'text-blue-200' : 'text-gray-400'} flex-shrink-0`}>
                    {formatTime(isPlaying ? currentTime : duration)}
                </span>

                {/* Playback Speed Control */}
                <div className="relative">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isMe ? 'bg-blue-500/30 text-blue-200 hover:bg-blue-500/50' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } transition-colors`}
                        title="Playback speed"
                    >
                        {playbackSpeed}x
                    </button>

                    {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10">
                            {[1, 1.5, 2].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => changeSpeed(speed)}
                                    className={`block w-full px-3 py-1.5 text-xs text-left hover:bg-gray-800 transition-colors ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'text-gray-300'
                                        }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Forward Button */}
                {onForward && (
                    <button
                        onClick={onForward}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-blue-200 hover:bg-blue-500/30' : 'text-gray-400 hover:bg-gray-700'
                            }`}
                        title="Forward voice message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 11 12 6 7 11"></polyline>
                            <polyline points="17 18 12 13 7 18"></polyline>
                        </svg>
                    </button>
                )}
            </div>

            <audio
                ref={audioRef}
                src={`${API_URL}/media/download/${mediaId}?token=${token}`}
                preload="metadata"
            />
        </div>
    );
};


export default function Dashboard() {
    const { logout, user, token } = useAuth();
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
        deleteMessage,
        searchLocalMessages
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
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
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
    const [editName, setEditName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video recording state
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [showVideoPreview, setShowVideoPreview] = useState(false);
    const videoRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);

    // Voice message forwarding state
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardingVoiceMessage, setForwardingVoiceMessage] = useState<{ mediaId: string, duration: number, waveform: number[] } | null>(null);
    const [selectedForwardRecipients, setSelectedForwardRecipients] = useState<string[]>([]);

    const [isSearchingMessages, setIsSearchingMessages] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]);
    const [isSearchingLocal, setIsSearchingLocal] = useState(false);

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



    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendVoiceMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };



    const sendVoiceMessage = async (blob: Blob) => {
        if (!activeChat) return;
        try {
            setUploadingMedia(true);
            const uploaded = await mediaService.uploadVoice(blob);
            await sendMessage(activeChat, "", {
                id: uploaded.id,
                type: uploaded.mimeType,
                filename: 'voice_message.ogg'
            });
        } catch (error) {
            toast.error("Failed to send voice message");
        } finally {
            setUploadingMedia(false);
        }
    };

    // Video recording functions
    const startVideoRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });

            const mediaRecorder = new MediaRecorder(stream);
            videoRecorderRef.current = mediaRecorder;
            videoChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    videoChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
                const previewUrl = URL.createObjectURL(videoBlob);
                setVideoPreview(previewUrl);
                setShowVideoPreview(true);
                stream.getTracks().forEach(track => track.stop());
                (window as any).__pendingVideoBlob = videoBlob;
            };

            mediaRecorder.start();
            setIsRecordingVideo(true);
        } catch (error) {
            console.error("Error accessing camera:", error);
            toast.error("Camera/microphone access denied");
        }
    };

    const stopVideoRecording = () => {
        if (videoRecorderRef.current && isRecordingVideo) {
            videoRecorderRef.current.stop();
            setIsRecordingVideo(false);
        }
    };

    const cancelVideoRecording = () => {
        if (videoRecorderRef.current && isRecordingVideo) {
            videoRecorderRef.current.onstop = null;
            videoRecorderRef.current.stop();
            setIsRecordingVideo(false);
            videoChunksRef.current = [];
            if (videoRecorderRef.current.stream) {
                videoRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
            setVideoPreview(null);
        }
        setShowVideoPreview(false);
        delete (window as any).__pendingVideoBlob;
    };

    const sendVideoMessage = async () => {
        const blob = (window as any).__pendingVideoBlob;
        if (!activeChat || !blob) return;

        try {
            setUploadingMedia(true);
            setShowVideoPreview(false);

            toast.loading("Uploading video...", { id: "video-upload" });

            const uploaded = await mediaService.uploadVideo(blob, (progress) => {
                toast.loading(`Uploading video... ${progress}%`, { id: "video-upload" });
            });

            toast.dismiss("video-upload");
            toast.success("Video uploaded successfully");

            await sendMessage(activeChat, "", {
                id: uploaded.id,
                type: 'video/mp4',
                filename: 'video_message.mp4',
                metadata: JSON.stringify({
                    duration: uploaded.videoMessage?.duration || 0,
                    width: uploaded.videoMessage?.width || 0,
                    height: uploaded.videoMessage?.height || 0,
                    thumbnailPath: uploaded.videoMessage?.thumbnailPath || undefined
                })
            });

            if (videoPreview) {
                URL.revokeObjectURL(videoPreview);
                setVideoPreview(null);
            }
            delete (window as any).__pendingVideoBlob;
        } catch (error) {
            toast.dismiss("video-upload");
            toast.error("Failed to send video message");
            console.error(error);
        } finally {
            setUploadingMedia(false);
        }
    };



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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!e.target.files || e.target.files.length === 0 || !activeChat) return;
        const file = e.target.files[0];

        try {
            setUploadingMedia(true);
            toast.loading("Uploading...", { id: "upload-toast" });

            const uploaded = await mediaService.uploadFile(file);

            toast.dismiss("upload-toast");
            toast.success("File uploaded");

            await sendMessage(activeChat, "", {
                id: uploaded.id,
                type: uploaded.mimeType,
                filename: uploaded.filename
            });
        } catch (error) {
            toast.dismiss("upload-toast");
            toast.error("Failed to upload file");
            console.error(error);
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeChat) return;

        await sendMessage(activeChat, input);
        setInput('');
    };

    const handleMessageSearch = async (query: string) => {
        setMessageSearchQuery(query);
        if (!query.trim()) {
            setMessageSearchResults([]);
            return;
        }

        setIsSearchingLocal(true);
        try {
            const results = await searchLocalMessages(query, activeChat || undefined);
            setMessageSearchResults(results);
        } catch (err) {
            console.error("Local search error", err);
        } finally {
            setIsSearchingLocal(false);
        }
    };

    const handleForwardVoice = async () => {
        if (!forwardingVoiceMessage || selectedForwardRecipients.length === 0) return;

        try {
            for (const recipientId of selectedForwardRecipients) {
                await sendMessage(recipientId, "", {
                    id: forwardingVoiceMessage.mediaId,
                    type: 'audio/ogg',
                    filename: 'voice_message.ogg'
                });
            }
            toast.success(`Voice message forwarded to ${selectedForwardRecipients.length} recipient(s)`);
            setShowForwardModal(false);
            setForwardingVoiceMessage(null);
            setSelectedForwardRecipients([]);
        } catch (error) {
            toast.error("Failed to forward voice message");
            console.error(error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        try {
            const fd = new FormData();
            fd.append('fullName', editName.trim());
            if (avatarFile) {
                fd.append('profilePic', avatarFile);
            }

            const updated = await userService.updateProfile(fd);
            setProfile(updated);
            try { localStorage.setItem('profile', JSON.stringify(updated)); } catch (e) {
                // ignore quota errors
            }
            setIsEditingName(false);
            setEditName('');
            setAvatarFile(null);
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            setAvatarPreview(null);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        }
    };

    const activeConversation = conversations.find(c =>
        String(c.id) === String(activeChat) ||
        c.participants.some(p => String(p.id) === String(activeChat))
    );

    // Better otherUser resolution: check allUsers first, then fallback to activeConversation participants
    const otherUser = useMemo(() => {
        if (!activeChat) return null;
        const found = allUsers.find(u => String(u.id) === String(activeChat));
        if (found) return found;

        if (activeConversation && activeConversation.type !== 'GROUP') {
            const p = activeConversation.participants.find(p => String(p.id) === String(activeChat));
            if (p) return { id: p.id, fullName: p.fullName, profilePic: p.profilePic, email: '' } as UserProfile;
        }
        return null;
    }, [activeChat, allUsers, activeConversation]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50 backdrop-blur-xl">
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
                    <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setShowProfile(!showProfile)}>
                        <div className="h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold shadow-xl shadow-blue-500/20 transition-transform group-hover:scale-105 duration-300">
                            {profile?.profilePic ? (
                                <img src={`${API_URL}/users/uploads/${profile.profilePic}`} alt="avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-white text-lg">{profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || '?'}</span>
                            )}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-sm font-black text-white truncate max-w-[120px] tracking-tight">{profile?.fullName || 'Set Name'}</h2>
                            <p className="text-[10px] text-blue-400 font-bold flex items-center uppercase tracking-widest">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                                My Profile
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
                                if (partnerProfile) {
                                    displayName = partnerProfile.fullName;
                                    displayPic = partnerProfile.profilePic;
                                } else {
                                    const participant = conv.participants.find(p => String(p.id) === String(partnerId));
                                    displayName = participant?.fullName || 'User';
                                    displayPic = participant?.profilePic;
                                }
                            }

                            if (!partnerId) return null;
                            const isOnline = !isGroup && onlineUsers[partnerId]?.status === 'online';
                            const isActive = activeChat === partnerId;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveChat(partnerId)}
                                    className={`p-4 flex items-center space-x-3 cursor-pointer transition-all relative ${isActive ? 'bg-blue-600/10 border-r-2 border-blue-500' : 'hover:bg-gray-800/50'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`h-12 w-12 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-lg border ${isActive ? 'border-blue-500' : 'border-gray-700'} ${isGroup ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800'}`}>
                                            {displayPic ? (
                                                <img src={`${API_URL}/users/uploads/${displayPic}`} alt="avatar" className="h-12 w-12 object-cover" />
                                            ) : (
                                                displayName?.charAt(0) || '?'
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
                                <div className="h-11 w-11 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-xl shadow-2xl border border-white/5">
                                    {activeConversation?.type === 'GROUP' ? (
                                        activeConversation.name?.charAt(0) || 'G'
                                    ) : otherUser?.profilePic ? (
                                        <img src={`${API_URL}/users/uploads/${otherUser.profilePic}`} alt="avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        otherUser?.fullName?.charAt(0) || otherUser?.email?.charAt(0) || '?'
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-sm text-white flex items-center tracking-tight">
                                        <span className="truncate">{activeConversation?.name || otherUser?.fullName || otherUser?.email || 'Unknown User'}</span>
                                        {activeConversation?.type === 'GROUP' && (
                                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-[9px] rounded-lg border border-blue-400/30 uppercase font-black tracking-widest shadow-lg shadow-blue-600/20">Group</span>
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
                                                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${onlineUsers[activeChat!]?.status === 'online' ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                                                    <span className="text-gray-400">
                                                        {onlineUsers[activeChat!]?.status === 'online' ? 'Online' : (() => {
                                                            const lastSeen = onlineUsers[activeChat!]?.lastSeen;
                                                            if (!lastSeen) return 'Offline';
                                                            const date = new Date(lastSeen);
                                                            const now = new Date();
                                                            const isToday = date.toDateString() === now.toDateString();
                                                            const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
                                                            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                            if (isToday) return `Last seen today at ${time}`;
                                                            if (isYesterday) return `Last seen yesterday at ${time}`;
                                                            return `Last seen on ${date.toLocaleDateString()}`;
                                                        })()}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSearchingMessages ? (
                                        <div className="flex items-center bg-gray-800 rounded-lg px-2 py-1 border border-blue-500/50 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <Search size={14} className="text-gray-400 mr-2" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={messageSearchQuery}
                                                onChange={(e) => handleMessageSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Escape' && setIsSearchingMessages(false)}
                                                placeholder="Search messages..."
                                                className="bg-transparent text-xs outline-none w-40 text-white"
                                            />
                                            <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(''); setMessageSearchResults([]); }} className="text-gray-400 hover:text-white">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsSearchingMessages(true)}
                                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
                                            title="Search Messages"
                                        >
                                            <Search size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowUserSearch(true)}
                                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-blue-400"
                                        title="Start New Chat"
                                    >
                                        <UserPlus size={20} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Search Results Overlay */}
                        {isSearchingMessages && (messageSearchQuery.trim() || isSearchingLocal) && (
                            <div className="absolute top-[73px] left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden max-h-[60vh] flex flex-col">
                                <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {isSearchingLocal ? 'Searching...' : `Found ${messageSearchResults.length} matches`}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                    {messageSearchResults.length === 0 && !isSearchingLocal ? (
                                        <div className="p-8 text-center text-gray-500 text-xs italic">
                                            No messages matching "{messageSearchQuery}"
                                        </div>
                                    ) : (
                                        messageSearchResults.map((result) => {
                                            const isMe = String(result.senderId) === selfId;
                                            return (
                                                <div
                                                    key={result.id}
                                                    className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all border border-gray-700/30 group"
                                                    onClick={() => {
                                                        // For now, just close search. Real implementation would scroll to message.
                                                        setIsSearchingMessages(false);
                                                        setMessageSearchQuery('');
                                                        toast.success("Found message!");
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isMe ? 'text-blue-400' : 'text-purple-400'}`}>
                                                            {isMe ? 'You' : (allUsers.find(u => String(u.id) === String(result.senderId))?.fullName || 'Contact')}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-mono">
                                                            {new Date(result.timestamp).toLocaleDateString()} {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                                                        {result.content}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

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
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-4 last:mb-0`}>
                                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && activeConversation?.type === 'GROUP' && msg.sender && (
                                                <span className="text-[10px] font-semibold text-blue-400 mb-1 ml-1">
                                                    {msg.sender.fullName}
                                                </span>
                                            )}
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
                                                            placeholder="Edit message..."
                                                            title="Edit message"
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
                                                    <div className="flex flex-col">
                                                        {msg.status !== 'DELETED' && (msg as any).media && (
                                                            <div className="mb-2">
                                                                {(msg as any).media.type.startsWith('image/') && !failedImages.has((msg as any).media.id) ? (
                                                                    <div
                                                                        className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-gray-700/50"
                                                                        onClick={() => window.open(`${API_URL}/media/download/${(msg as any).media.id}?token=${token || ''}`, '_blank')}
                                                                    >
                                                                        <img
                                                                            src={`${API_URL}/media/download/${(msg as any).media.id}?token=${token || ''}`}
                                                                            alt="attachment"
                                                                            className="max-w-xs max-h-60 object-cover"
                                                                            onError={(e) => {
                                                                                setFailedImages(prev => new Set(prev).add((msg as any).media.id));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (msg as any).media.type.startsWith('video/') ? (
                                                                    <VideoMessage
                                                                        messageId={msg.id}
                                                                        videoMessageId={(msg as any).media.id}
                                                                        duration={0} // Will be populated from metadata
                                                                        width={400}
                                                                        height={300}
                                                                        onReaction={(messageId, emoji) => sendReaction(messageId, emoji, 'add')}
                                                                    />
                                                                ) : (msg as any).media.type.startsWith('audio/') ? (
                                                                    <VoiceMessagePlayer
                                                                        mediaId={(msg as any).media.id}
                                                                        duration={(msg as any).media.voiceMessage?.duration || 0}
                                                                        waveform={(msg as any).media.voiceMessage?.waveform || []}
                                                                        token={token || ''}
                                                                        isMe={isMe}
                                                                        onForward={() => {
                                                                            setForwardingVoiceMessage({
                                                                                mediaId: (msg as any).media.id,
                                                                                duration: (msg as any).media.voiceMessage?.duration || 0,
                                                                                waveform: (msg as any).media.voiceMessage?.waveform || []
                                                                            });
                                                                            setShowForwardModal(true);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <a
                                                                        href={`${API_URL}/media/download/${(msg as any).media.id}?token=${token || ''}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center space-x-2 bg-gray-900/50 p-3 rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
                                                                    >
                                                                        <div className="bg-gray-800 p-2 rounded">
                                                                            <FileText size={20} className="text-blue-400" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium truncate max-w-[150px] text-blue-300 underline">
                                                                                {(msg as any).media.filename}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-500 uppercase">
                                                                                {(msg as any).media.type.split('/')[1] || 'FILE'}
                                                                            </span>
                                                                        </div>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                            {decryptedMessages[msg.id] === 'MESSAGE_DELETED' ? '' : (decryptedMessages[msg.id] || <span className="italic opacity-50">Decrypting...</span>)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center mt-1 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity px-1 min-h-[24px]">
                                                {isMe && !editingMessageId && (
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
                                                        const isPartnerOnline = activeChat ? onlineUsers[activeChat]?.status === 'online' : false;
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
                                    type="file"
                                    id="chat-file-input"
                                    ref={fileInputRef}
                                    className="hidden"
                                    aria-label="Select file to attach"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingMedia}
                                    className={`p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 transition-colors ${uploadingMedia ? 'animate-pulse' : ''}`}
                                    title="Attach File"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a secure message..."
                                    title="Type a secure message"
                                    className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder-gray-500"
                                />
                                {isRecording ? (
                                    <button
                                        type="button"
                                        onClick={stopRecording}
                                        className="bg-red-600 p-2 rounded-xl text-white hover:bg-red-500 transition-all shadow-lg active:scale-95"
                                        title="Stop Recording"
                                    >
                                        <StopCircle className="h-4 w-4" />
                                    </button>
                                ) : isRecordingVideo ? (
                                    <button
                                        type="button"
                                        onClick={stopVideoRecording}
                                        className="bg-red-600 p-2 rounded-xl text-white hover:bg-red-500 transition-all shadow-lg active:scale-95"
                                        title="Stop Video Recording"
                                    >
                                        <StopCircle className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <div className="flex items-center space-x-1">
                                        <button
                                            type="button"
                                            onClick={startRecording}
                                            disabled={uploadingMedia}
                                            className={`p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-gray-700/50 transition-colors ${uploadingMedia ? 'animate-pulse' : ''}`}
                                            title="Record Voice Message"
                                        >
                                            <Mic className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={startVideoRecording}
                                            disabled={uploadingMedia}
                                            className={`p-2 rounded-xl text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 transition-colors ${uploadingMedia ? 'animate-pulse' : ''}`}
                                            title="Record Video Message"
                                        >
                                            <Video className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isRecording || isRecordingVideo}
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
                            <User className="h-12 w-12 text-gray-700" />
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
                )
                }

                {/* Profile Slide-over */}
                {
                    showProfile && (
                        <div className="fixed inset-0 z-[105] bg-black/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-300" onClick={() => setShowProfile(false)}>
                            <div className="w-96 h-full bg-gray-900 border-l border-white/10 p-8 shadow-3xl animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-bold text-white">Settings</h2>
                                    <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400" title="Close Settings">
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative group cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); profileInputRef.current?.click(); }}>
                                        <div className="h-28 w-28 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl transition-transform group-hover:scale-105 duration-300">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
                                            ) : profile?.profilePic ? (
                                                <img src={`${API_URL}/users/uploads/${profile.profilePic}`} alt="avatar" className="h-full w-full object-cover" />
                                            ) : (
                                                profile?.fullName?.charAt(0) || '?'
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                            <Pencil className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        id="profile-pic-input"
                                        ref={profileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const file = e.target.files?.[0] || null;
                                            setAvatarFile(file);
                                            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                                            setAvatarPreview(file ? URL.createObjectURL(file) : null);
                                        }}
                                    />
                                    {avatarFile && !uploadingAvatar && (
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                try {
                                                    setUploadingAvatar(true);
                                                    const fd = new FormData();
                                                    fd.append('profilePic', avatarFile);
                                                    const updated = await userService.updateProfile(fd);
                                                    setProfile(updated);
                                                    setAvatarFile(null);
                                                    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                                                    setAvatarPreview(null);
                                                    toast.success('Profile picture updated');
                                                } catch (error) {
                                                    toast.error('Failed to update avatar');
                                                } finally {
                                                    setUploadingAvatar(false);
                                                }
                                            }}
                                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    )}
                                    {uploadingAvatar && <div className="mt-4 text-xs text-blue-400 font-bold animate-pulse">Uploading...</div>}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                                        {isEditingName ? (
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="flex-1 bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="Enter your name"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateProfile()}
                                                    autoFocus
                                                />
                                                <button type="button" onClick={handleUpdateProfile} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all">OK</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-sm font-bold text-white">{profile?.fullName || 'Not set'}</p>
                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditName(profile?.fullName || ''); setIsEditingName(true); }} className="text-gray-400 hover:text-blue-400 transition-colors">
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Account Email</label>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-sm font-medium text-gray-300 break-all">{profile?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <button onClick={logout} className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 border border-red-500/20">
                                        <LogOut size={18} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >

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
                                                {u.profilePic ? (
                                                    <img src={`${API_URL}/users/uploads/${u.profilePic}`} alt="avatar" className="h-12 w-12 object-cover" />
                                                ) : (
                                                    u.fullName?.charAt(0)
                                                )}
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
            {
                showCreateGroup && (
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
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1" htmlFor="groupName">Group Name</label>
                                    <input
                                        id="groupName"
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Enter group name..."
                                        title="Enter group name"
                                        className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1" htmlFor="groupDesc">Description (Optional)</label>
                                    <textarea
                                        id="groupDesc"
                                        value={groupDesc}
                                        onChange={(e) => setGroupDesc(e.target.value)}
                                        placeholder="What is this group about?"
                                        title="Group description"
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
                )
            }

            {/* Join Group Modal */}
            {
                showJoinGroup && (
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
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1" htmlFor="inviteCode">Invite Code</label>
                                    <input
                                        id="inviteCode"
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="Paste invite code here..."
                                        title="Paste invite code"
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
                )
            }

            {/* Forward Voice Message Modal */}
            {
                showForwardModal && forwardingVoiceMessage && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-950/50">
                                <h3 className="text-xl font-bold">Forward Voice Message</h3>
                                <button onClick={() => {
                                    setShowForwardModal(false);
                                    setForwardingVoiceMessage(null);
                                    setSelectedForwardRecipients([]);
                                }} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Close">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="mb-4">
                                    <VoiceMessagePlayer
                                        mediaId={forwardingVoiceMessage.mediaId}
                                        duration={forwardingVoiceMessage.duration}
                                        waveform={forwardingVoiceMessage.waveform}
                                        token={token || ''}
                                        isMe={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Select Recipients</label>
                                    <div className="max-h-60 overflow-y-auto space-y-2 bg-gray-800/30 rounded-xl p-3">
                                        {displayConversations.map((conv) => {
                                            const isGroup = conv.type === 'GROUP';
                                            let partnerId: string | null = null;
                                            let displayName = '';

                                            if (isGroup) {
                                                partnerId = conv.id;
                                                displayName = conv.name || 'Group';
                                            } else {
                                                const lm = conv.lastMessage;
                                                if (lm && lm.senderId && lm.receiverId) {
                                                    partnerId = String(lm.senderId) === selfId ? String(lm.receiverId) : String(lm.senderId);
                                                } else if (conv.participants && conv.participants.length > 0) {
                                                    const p = conv.participants.find(p => String(p.id) !== selfId) || conv.participants[0];
                                                    partnerId = p ? String(p.id) : null;
                                                }
                                                const partnerProfile = allUsers.find(u => String(u.id) === String(partnerId));
                                                displayName = partnerProfile?.fullName || partnerProfile?.email || 'Unknown';
                                            }

                                            if (!partnerId) return null;

                                            return (
                                                <label key={partnerId} className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedForwardRecipients.includes(partnerId)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedForwardRecipients(prev => [...prev, partnerId!]);
                                                            } else {
                                                                setSelectedForwardRecipients(prev => prev.filter(id => id !== partnerId));
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm">{displayName}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button
                                    onClick={handleForwardVoice}
                                    disabled={selectedForwardRecipients.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                                >
                                    Forward to {selectedForwardRecipients.length} recipient{selectedForwardRecipients.length !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Video Preview Modal */}
            {
                showVideoPreview && videoPreview && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                        <div className="bg-gray-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-3xl overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gray-950/50">
                                <h3 className="text-xl font-bold">Preview Video</h3>
                                <button onClick={cancelVideoRecording} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400" title="Close">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <video
                                    src={videoPreview}
                                    controls
                                    className="w-full rounded-2xl bg-black shadow-2xl overflow-hidden"
                                    style={{ maxHeight: '50vh' }}
                                    autoPlay
                                />
                                <div className="flex space-x-4 mt-8">
                                    <button
                                        onClick={sendVideoMessage}
                                        disabled={uploadingMedia}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                                    >
                                        <span>{uploadingMedia ? 'Uploading...' : 'Send Video'}</span>
                                        {!uploadingMedia && <Send size={18} />}
                                    </button>
                                    <button
                                        onClick={cancelVideoRecording}
                                        className="px-8 bg-gray-800 hover:bg-gray-700 py-4 rounded-2xl font-bold text-gray-300 transition-all"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Hidden video element for live camera preview */}
            <video
                ref={videoPreviewRef}
                className="hidden"
                muted
                playsInline
            />

        </div >
    );
}
