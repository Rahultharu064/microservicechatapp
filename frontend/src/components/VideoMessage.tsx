import React, { useState, useRef, useEffect } from 'react';
import reactionService from '../services/reactionService';
import mediaService from '../services/mediaService';

interface VideoMessageProps {
    messageId: string;
    videoMessageId: string;
    duration: number;
    width: number;
    height: number;
    thumbnailPath?: string;
    onReaction?: (messageId: string, emoji: string) => void;
}

const VideoMessage: React.FC<VideoMessageProps> = ({
    messageId,
    videoMessageId,
    duration,
    
    thumbnailPath,
    onReaction
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [reactions, setReactions] = useState<any[]>([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);

    const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    const speedOptions = [0.5, 1, 1.5, 2];

    useEffect(() => {
        loadReactions();
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const loadReactions = async () => {
        try {
            const reactionData = await reactionService.getReactions(messageId);
            setReactions(reactionData);
        } catch (error) {
            console.error('Failed to load reactions:', error);
        }
    };

    const togglePlayback = async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            if (isPlaying) {
                video.pause();
                setIsPlaying(false);
            } else {
                // Load video source on first play
                if (!hasStartedPlaying) {
                    setIsLoading(true);
                    const blob = await mediaService.downloadVideo(videoMessageId);
                    const url = URL.createObjectURL(blob);
                    video.src = url;
                    setHasStartedPlaying(true);
                }

                await video.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
            setIsLoading(false);
        }
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (video) {
            setCurrentTime(video.currentTime);
        }
    };

    const handleLoadedData = () => {
        setIsLoading(false);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * duration;
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
    };

    const changePlaybackSpeed = () => {
        const currentIndex = speedOptions.indexOf(playbackSpeed);
        const nextIndex = (currentIndex + 1) % speedOptions.length;
        const newSpeed = speedOptions[nextIndex];
        setPlaybackSpeed(newSpeed);
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed;
        }
    };

    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;

        try {
            if (!document.fullscreenElement) {
                await container.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
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
            const blob = await mediaService.downloadVideo(videoMessageId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video_message_${videoMessageId}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download video:', error);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-message-container" ref={containerRef}>
            <div
                className="video-player-wrapper"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                <video
                    ref={videoRef}
                    className="video-player"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    onLoadedData={handleLoadedData}
                    poster={thumbnailPath ? `/api/media/video/${videoMessageId}/thumbnail` : undefined}
                    playsInline
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '8px',
                        backgroundColor: '#000'
                    }}
                />

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="video-loading-overlay">
                        <div className="spinner">Loading...</div>
                    </div>
                )}

                {/* Play Button Overlay (when not started) */}
                {!hasStartedPlaying && !isLoading && (
                    <div
                        className="video-play-overlay"
                        onClick={togglePlayback}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            cursor: 'pointer',
                            fontSize: '48px',
                            color: 'white',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        ▶️
                    </div>
                )}

                {/* Video Controls */}
                {showControls && hasStartedPlaying && (
                    <div className="video-controls">
                        <div className="progress-bar-container" onClick={handleSeek}>
                            <div className="progress-bar">
                                <div
                                    className="progress-filled"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="controls-row">
                            <button onClick={togglePlayback} className="control-button">
                                {isPlaying ? '⏸️' : '▶️'}
                            </button>

                            <span className="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>

                            <div className="volume-control">
                                <span>🔊</span>
                                <label htmlFor="volume">Volume</label>
                                <input
                                    id="volume"
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                />
                            </div>

                            <button
                                onClick={changePlaybackSpeed}
                                className="control-button speed-button"
                            >
                                {playbackSpeed}x
                            </button>

                            <button onClick={toggleFullscreen} className="control-button">
                                {isFullscreen ? '⛶' : '⛶'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="video-actions">
                <button
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className="action-button"
                >
                    😊
                </button>

                <button onClick={handleDownload} className="action-button">
                    ⬇️
                </button>
            </div>

            {/* Reaction Picker */}
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

            {/* Reactions Display */}
            {reactions.length > 0 && (
                <div className="reactions-display">
                    {reactions.map((reaction, index) => (
                        <span key={index} className="reaction-item">
                            {reaction.emoji} {reaction.user.fullName}
                        </span>
                    ))}
                </div>
            )}

            <style>{`
                .video-message-container {
                    position: relative;
                    margin: 10px 0;
                }

                .video-player-wrapper {
                    position: relative;
                    display: inline-block;
                }

                .video-loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    border-radius: 8px;
                }

                .video-controls {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
                    padding: 10px;
                    border-radius: 0 0 8px 8px;
                }

                .progress-bar-container {
                    cursor: pointer;
                    padding: 5px 0;
                }

                .progress-bar {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-filled {
                    height: 100%;
                    background: #007bff;
                    transition: width 0.1s;
                }

                .controls-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                }

                .control-button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                }

                .control-button:hover {
                    opacity: 0.8;
                }

                .time-display {
                    font-size: 14px;
                    min-width: 100px;
                }

                .volume-control {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .volume-slider {
                    width: 60px;
                }

                .speed-button {
                    font-size: 14px;
                    min-width: 40px;
                }

                .video-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }

                .action-button {
                    background: #f0f0f0;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 18px;
                }

                .action-button:hover {
                    background: #e0e0e0;
                }

                .reaction-picker {
                    display: flex;
                    gap: 5px;
                    margin-top: 10px;
                    padding: 10px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .emoji-button {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                }

                .emoji-button:hover {
                    transform: scale(1.2);
                }

                .reactions-display {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 10px;
                }

                .reaction-item {
                    background: #f0f0f0;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 14px;
                }
            `}</style>
        </div>
    );
};

export default VideoMessage;
