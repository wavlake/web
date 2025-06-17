import { useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { AudioPlayerEngineRef } from '@/components/audio/AudioPlayerEngine';

export function useAudioPlayer() {
  const playerRef = useRef<AudioPlayerEngineRef>(null);
  const {
    setAudioPlayer,
    setIsLoading,
    setDuration,
    updateCurrentTime,
    pause,
    nextTrack,
    volume,
    isMuted,
    currentAudioUrl,
    isPlaying,
  } = useAudioPlayerStore();

  // Set up the audio player reference
  useEffect(() => {
    if (playerRef.current) {
      setAudioPlayer(playerRef.current);
    }

    return () => {
      setAudioPlayer(null);
    };
  }, [setAudioPlayer]);

  // Handle audio player events
  const handleReady = () => {
    setIsLoading(false);
  };

  const handleStart = () => {
    setIsLoading(false);
  };

  const handlePlay = () => {
    // ReactPlayer manages play/pause state through props
    // This is just for consistency with the store
  };

  const handlePause = () => {
    // ReactPlayer manages play/pause state through props
    // This is just for consistency with the store
  };

  const handleEnded = () => {
    // Auto-advance to next track if available
    nextTrack();
  };

  const handleError = (error: unknown) => {
    console.error('Audio error:', error);
    setIsLoading(false);
    pause();
  };

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    updateCurrentTime(state.playedSeconds);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleSeek = (seconds: number) => {
    updateCurrentTime(seconds);
  };

  return {
    playerRef,
    props: {
      url: currentAudioUrl || undefined,
      playing: isPlaying,
      volume: isMuted ? 0 : volume,
      muted: isMuted,
      onReady: handleReady,
      onStart: handleStart,
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded,
      onError: handleError,
      onProgress: handleProgress,
      onDuration: handleDuration,
      onSeek: handleSeek,
    },
  };
}