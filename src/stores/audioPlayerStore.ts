import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NostrTrack } from '@/hooks/useArtistTracks';

interface AudioPlayerState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  
  // Current track info
  currentTrack: NostrTrack | null;
  currentTrackId: string | null;
  
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
  
  // Audio element reference (not persisted)
  audioElement: HTMLAudioElement | null;
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
  
  // Audio element management
  setAudioElement: (element: HTMLAudioElement | null) => void;
  
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
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playlist: [],
      currentIndex: -1,
      showPlayer: false,
      audioElement: null,

      // Actions
      play: () => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.play().catch(console.error);
          set({ isPlaying: true, isPaused: false });
        }
      },

      pause: () => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.pause();
          set({ isPlaying: false, isPaused: true });
        }
      },

      stop: () => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
          set({ isPlaying: false, isPaused: false, currentTime: 0 });
        }
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
        const { audioElement, setIsLoading } = get();
        
        if (!track.audioUrl) {
          console.error('Track has no audio URL');
          return;
        }

        setIsLoading(true);
        
        if (audioElement) {
          audioElement.src = track.audioUrl;
          audioElement.load();
        }

        set({
          currentTrack: track,
          currentTrackId: track.id,
          currentTime: 0,
          showPlayer: true,
        });

        // Update playlist index if track is in playlist
        const { playlist } = get();
        const index = playlist.findIndex(t => t.id === track.id);
        if (index !== -1) {
          set({ currentIndex: index });
        }
      },

      setCurrentTime: (time: number) => {
        const { audioElement } = get();
        if (audioElement) {
          audioElement.currentTime = time;
          set({ currentTime: time });
        }
      },

      setVolume: (volume: number) => {
        const { audioElement } = get();
        const clampedVolume = Math.max(0, Math.min(1, volume));
        if (audioElement) {
          audioElement.volume = clampedVolume;
        }
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
      },

      toggleMute: () => {
        const { audioElement, isMuted, volume } = get();
        if (audioElement) {
          if (isMuted) {
            audioElement.volume = volume;
            set({ isMuted: false });
          } else {
            audioElement.volume = 0;
            set({ isMuted: true });
          }
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

      setAudioElement: (element: HTMLAudioElement | null) => {
        set({ audioElement: element });
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