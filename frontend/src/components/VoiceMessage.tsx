import React, { useState, useRef, useEffect } from 'react';
import reactionService from '../services/reactionService';
import mediaService from '../services/mediaService';

interface VoiceMessageProps {
    messageId: string;
    voiceMessageId: string;
    duration: number;
    waveform: number[];
    onReaction?: (messageId: string, emoji: string) => void;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({
    messageId,
    voiceMessageId,
    duration,
    waveform,
    onReaction
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [reactions, setReactions] = useState<any[]>([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    useEffect(() => {
        loadPlaybackPosition();
        loadReactions();
        drawWaveform();
    }, []);

    const loadPlaybackPosition = async () => {
        try {
            const position = await reactionService.getPlaybackPosition(voiceMessageId);
            setCurrentTime(position.position || 0);
        } catch (error) {
            console.error('Failed to load playback position:', error);
        }
    };

    const loadReactions = async () => {
        try {
            const reactionData = await reactionService.getReactions(messageId);
            setReactions(reactionData);
        } catch (error) {
            console.error('Failed to load reactions:', error);
        }
    };

    const drawWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = width / waveform.length;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#e0e0e0';

        waveform.forEach((amplitude, index) => {
            const barHeight = amplitude * height;
            const x = index * barWidth;
            const y = (height - barHeight) / 2;

            ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
    };

    const togglePlayback = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            await reactionService.updatePlaybackPosition(voiceMessageId, audio.currentTime);
        } else {
            audio.currentTime = currentTime;
            await audio.play();
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (audio) {
            setCurrentTime(audio.currentTime);
        }
    };

    const handleEnded = async () => {
        setIsPlaying(false);
        setCurrentTime(0);
        await reactionService.updatePlaybackPosition(voiceMessageId, 0);
    };

    const handleReaction = async (emoji: string) => {
        try {
            await reactionService.addReaction(messageId, emoji);
            await loadReactions();
            setShowReactionPicker(false);
            onReaction?.(messageId, emoji);
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    };

    const handleDownload = async () => {
        try {
            const blob = await mediaService.downloadVoice(voiceMessageId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `voice_message_${voiceMessageId}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download voice message:', error);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="voice-message-container">
            <div className="voice-message-player">
                <button
                    onClick={togglePlayback}
                    className="play-button"
                >
                    {isPlaying ? '⏸️' : '▶️'}
                </button>

                <div className="waveform-container">
                    <canvas
                        ref={canvasRef}
                        width={200}
                        height={40}
                        className="waveform-canvas"
                    />
                    <div
                        className="progress-indicator"
                        style={{
                            left: `${(currentTime / duration) * 100}%`
                        }}
                    />
                </div>

                <span className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className="reaction-button"
                >
                    😊
                </button>

                <button
                    onClick={handleDownload}
                    className="download-button"
                >
                    ⬇️
                </button>
            </div>

            {showReactionPicker && (
                <div className="reaction-picker">
                    {commonEmojis.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="emoji-button"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {reactions.length > 0 && (
                <div className="reactions-display">
                    {reactions.map((reaction, index) => (
                        <span key={index} className="reaction-item">
                            {reaction.emoji} {reaction.user.fullName}
                        </span>
                    ))}
                </div>
            )}

            {/* Hidden audio element for playback */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                preload="none"
            />
        </div>
    );
};

export default VoiceMessage;
