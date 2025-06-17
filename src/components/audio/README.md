# Audio Player System

This directory contains the audio player system for the Wavlake web application. The system is designed with a modular architecture that allows for easy swapping of the underlying audio playback engine.

## Architecture

The audio player system consists of several key components:

### 1. AudioPlayerEngine (`AudioPlayerEngine.tsx`)
A wrapper component that abstracts the underlying audio player implementation (currently react-player). This component provides a consistent interface regardless of the underlying audio library.

**Key Features:**
- Consistent API across different audio player implementations
- Hidden/invisible audio player for global playback
- Support for various audio formats through react-player
- Event handling for play, pause, error, progress, etc.

### 2. GlobalAudioPlayer (`GlobalAudioPlayer.tsx`)
A singleton component that manages the global audio playback for the entire application. This should be placed once at the root level of the app.

**Responsibilities:**
- Manages the lifecycle of the audio player
- Connects the AudioPlayerEngine with the audio player store
- Provides centralized audio playback across all pages

### 3. Audio Player Store (`/stores/audioPlayerStore.ts`)
A Zustand store that manages the global audio state including:
- Current track information
- Playback state (playing, paused, loading)
- Volume and mute controls
- Playlist management
- Current time and duration

### 4. useAudioPlayer Hook (`/hooks/useAudioPlayer.ts`)
A custom hook that bridges the audio player store with the AudioPlayerEngine component.

**Features:**
- Event handling for audio player events
- State synchronization between store and player
- Progress tracking and duration management

## Usage

### Basic Setup
The GlobalAudioPlayer is already included in the main App.tsx file, so no additional setup is required.

### Playing Audio
```typescript
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

function MyComponent() {
  const { loadTrack, play, pause, isPlaying } = useAudioPlayerStore();

  const handlePlayTrack = (track: NostrTrack) => {
    loadTrack(track); // This will automatically start playing
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <button onClick={handleTogglePlay}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
  );
}
```

### Accessing Player State
```typescript
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

function PlayerControls() {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration,
    volume,
    setVolume 
  } = useAudioPlayerStore();

  return (
    <div>
      <h3>{currentTrack?.title}</h3>
      <p>{currentTime} / {duration}</p>
      <input 
        type="range" 
        value={volume} 
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        min="0" 
        max="1" 
        step="0.1" 
      />
    </div>
  );
}
```

## Swapping Audio Engines

To swap out react-player for a different audio library:

1. **Update AudioPlayerEngine.tsx**: Replace the ReactPlayer component with your preferred audio library while maintaining the same interface.

2. **Update the props**: Modify the component props to match your new audio library's requirements.

3. **Update event handlers**: Adjust the event handling to work with your new library's event system.

4. **Test thoroughly**: Ensure all functionality (play, pause, seek, volume, etc.) works correctly.

The rest of the application will continue to work without changes since the interface remains consistent.

## Supported Audio Formats

Currently supports all formats that react-player supports:
- MP3
- WAV
- OGG
- M4A
- FLAC
- And many more through the browser's native audio support

## Notes

- The audio player is invisible and controlled entirely through the store
- Only one audio track can play at a time (global singleton)
- The player automatically advances to the next track in the playlist when a track ends
- All audio state is persisted except for the current playback position
- The system is designed to work across page navigation without interrupting playback