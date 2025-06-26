import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NostrTrack } from '@/types/music';
import { AudioPlayerEngineRef } from '@/components/audio/AudioPlayerEngine';

interface AudioPlayerState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  
  // Current track info
  currentTrack: NostrTrack | null;
  currentTrackId: string | null;
  currentAudioUrl: string | null;
  
  // Audio element properties
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // Queue and playlist
  playlist: NostrTrack[];
  currentIndex: number;
  
  // UI state
  showPlayer: boolean;
  
  // Audio player reference (not persisted)
  audioPlayer: AudioPlayerEngineRef | null;
}

interface AudioPlayerActions {
  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  
  // Track management
  loadTrack: (track: NostrTrack) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Queue management
  setPlaylist: (tracks: NostrTrack[]) => void;
  addToPlaylist: (track: NostrTrack) => void;
  removeFromPlaylist: (trackId: string) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  
  // Audio player management
  setAudioPlayer: (player: AudioPlayerEngineRef | null) => void;
  
  // UI state
  setShowPlayer: (show: boolean) => void;
  
  // Internal state updates
  setIsLoading: (loading: boolean) => void;
  setDuration: (duration: number) => void;
  updateCurrentTime: (time: number) => void;
}

type AudioPlayerStore = AudioPlayerState & AudioPlayerActions;

export const useAudioPlayerStore = create<AudioPlayerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentTrack: null,
      currentTrackId: null,
      currentAudioUrl: null,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playlist: [],
      currentIndex: -1,
      showPlayer: false,
      audioPlayer: null,

      // Actions
      play: () => {
        set({ isPlaying: true, isPaused: false });
      },

      pause: () => {
        set({ isPlaying: false, isPaused: true });
      },

      stop: () => {
        const { audioPlayer } = get();
        if (audioPlayer) {
          audioPlayer.seekTo(0);
        }
        set({ isPlaying: false, isPaused: false, currentTime: 0 });
      },

      togglePlay: () => {
        const { isPlaying, play, pause } = get();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      },

      loadTrack: (track: NostrTrack) => {
        if (!track.audioUrl) {
          console.error('Track has no audio URL');
          return;
        }

        set({
          currentTrack: track,
          currentTrackId: track.id,
          currentTime: 0,
          showPlayer: true,
          currentAudioUrl: track.audioUrl,
          isLoading: true,
          isPlaying: true, // Auto-play when loading new track
          isPaused: false,
        });

        // Update playlist index if track is in playlist
        const { playlist } = get();
        const index = playlist.findIndex(t => t.id === track.id);
        if (index !== -1) {
          set({ currentIndex: index });
        }
      },

      setCurrentTime: (time: number) => {
        const { audioPlayer } = get();
        if (audioPlayer) {
          audioPlayer.seekTo(time);
          set({ currentTime: time });
        }
      },

      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
      },

      toggleMute: () => {
        const { isMuted, volume, setVolume } = get();
        if (isMuted) {
          setVolume(volume);
          set({ isMuted: false });
        } else {
          setVolume(0);
          set({ isMuted: true });
        }
      },

      setPlaylist: (tracks: NostrTrack[]) => {
        set({ playlist: tracks });
      },

      addToPlaylist: (track: NostrTrack) => {
        const { playlist } = get();
        if (!playlist.some(t => t.id === track.id)) {
          set({ playlist: [...playlist, track] });
        }
      },

      removeFromPlaylist: (trackId: string) => {
        const { playlist } = get();
        set({ playlist: playlist.filter(t => t.id !== trackId) });
      },

      nextTrack: () => {
        const { playlist, currentIndex, loadTrack } = get();
        if (playlist.length > 0 && currentIndex < playlist.length - 1) {
          const nextTrack = playlist[currentIndex + 1];
          loadTrack(nextTrack);
        }
      },

      previousTrack: () => {
        const { playlist, currentIndex, loadTrack } = get();
        if (playlist.length > 0 && currentIndex > 0) {
          const prevTrack = playlist[currentIndex - 1];
          loadTrack(prevTrack);
        }
      },

      setAudioPlayer: (player: AudioPlayerEngineRef | null) => {
        set({ audioPlayer: player });
      },

      setShowPlayer: (show: boolean) => {
        set({ showPlayer: show });
      },

      setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setDuration: (duration: number) => {
        set({ duration });
      },

      updateCurrentTime: (time: number) => {
        set({ currentTime: time });
      },
    }),
    {
      name: 'audio-player-storage',
      partialize: (state) => ({
        // Only persist these properties
        volume: state.volume,
        isMuted: state.isMuted,
        showPlayer: state.showPlayer,
        currentTrackId: state.currentTrackId,
        playlist: state.playlist,
        currentIndex: state.currentIndex,
      }),
    }
  )
);