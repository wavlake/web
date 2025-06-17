import { useEffect, useRef } from 'react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    audioElement,
    setAudioElement,
    setIsLoading,
    setDuration,
    updateCurrentTime,
    pause,
    nextTrack,
    volume,
    isMuted,
  } = useAudioPlayerStore();

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      setAudioElement(audioRef.current);
    }

    const audio = audioRef.current;

    // Event listeners
    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      updateCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      // Auto-advance to next track if available
      nextTrack();
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      pause();
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Set initial volume
    audio.volume = isMuted ? 0 : volume;

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [setAudioElement, setIsLoading, setDuration, updateCurrentTime, pause, nextTrack, volume, isMuted]);

  // Update volume when store changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return audioRef.current;
}