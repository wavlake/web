import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';

export interface AudioPlayerEngineRef {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIsPlaying: () => boolean;
  load: (url: string) => void;
}

export interface AudioPlayerEngineProps {
  url?: string;
  playing?: boolean;
  volume?: number;
  muted?: boolean;
  onReady?: () => void;
  onStart?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  onSeek?: (seconds: number) => void;
  className?: string;
}

/**
 * Audio Player Engine Component
 * 
 * This component wraps the underlying audio player implementation (currently react-player)
 * to provide a consistent interface. This abstraction allows for easy swapping of the
 * underlying audio player library in the future without changing the rest of the codebase.
 * 
 * Usage:
 * ```tsx
 * const playerRef = useRef<AudioPlayerEngineRef>(null);
 * 
 * <AudioPlayerEngine
 *   ref={playerRef}
 *   url="https://example.com/audio.mp3"
 *   playing={isPlaying}
 *   volume={volume}
 *   onPlay={() => console.log('Playing')}
 *   onPause={() => console.log('Paused')}
 * />
 * ```
 */
export const AudioPlayerEngine = forwardRef<AudioPlayerEngineRef, AudioPlayerEngineProps>(
  (
    {
      url,
      playing = false,
      volume = 1,
      muted = false,
      onReady,
      onStart,
      onPlay,
      onPause,
      onEnded,
      onError,
      onProgress,
      onDuration,
      onSeek,
      className,
    },
    ref
  ) => {
    const playerRef = useRef<ReactPlayer>(null);

    const play = useCallback(() => {
      // ReactPlayer doesn't have a direct play method, we control it via the playing prop
      // The actual playing state is managed by the store
      if (onPlay) onPlay();
    }, [onPlay]);

    const pause = useCallback(() => {
      // ReactPlayer doesn't have a direct pause method, we control it via the playing prop
      // The actual playing state is managed by the store
      if (onPause) onPause();
    }, [onPause]);

    const stop = useCallback(() => {
      if (playerRef.current) {
        playerRef.current.seekTo(0);
      }
      if (onPause) onPause();
    }, [onPause]);

    const seekTo = useCallback((seconds: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds);
      }
    }, []);

    const setVolume = useCallback((newVolume: number) => {
      // Volume is controlled via props in ReactPlayer
      // This method is here for API consistency
    }, []);

    const getCurrentTime = useCallback(() => {
      if (playerRef.current) {
        return playerRef.current.getCurrentTime();
      }
      return 0;
    }, []);

    const getDuration = useCallback(() => {
      if (playerRef.current) {
        return playerRef.current.getDuration();
      }
      return 0;
    }, []);

    const getIsPlaying = useCallback(() => {
      return playing;
    }, [playing]);

    const load = useCallback((newUrl: string) => {
      // URL is controlled via props in ReactPlayer
      // This method is here for API consistency
    }, []);

    useImperativeHandle(ref, () => ({
      play,
      pause,
      stop,
      seekTo,
      setVolume,
      getCurrentTime,
      getDuration,
      getIsPlaying,
      load,
    }));

    return (
      <div className={className} style={{ display: 'none' }}>
        <ReactPlayer
          ref={playerRef}
          url={url}
          playing={playing}
          volume={volume}
          muted={muted}
          width="0"
          height="0"
          onReady={onReady}
          onStart={onStart}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onError={onError}
          onProgress={onProgress}
          onDuration={onDuration}
          onSeek={onSeek}
          config={{
            file: {
              forceAudio: true,
              attributes: {
                controlsList: 'nodownload',
              },
            },
          }}
        />
      </div>
    );
  }
);

AudioPlayerEngine.displayName = 'AudioPlayerEngine';