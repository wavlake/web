import { AudioPlayerEngine } from './AudioPlayerEngine';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

/**
 * Global Audio Player Component
 * 
 * This component manages the global audio playback for the application.
 * It should be placed once at the root level of the app to ensure
 * consistent audio playback across all pages.
 * 
 * The audio player is invisible and controlled entirely through the
 * audio player store. This separation allows for flexible UI components
 * while maintaining centralized audio state management.
 */
export function GlobalAudioPlayer() {
  const { playerRef, props } = useAudioPlayer();

  return (
    <AudioPlayerEngine
      ref={playerRef}
      {...props}
    />
  );
}