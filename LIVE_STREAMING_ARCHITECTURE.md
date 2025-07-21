# Live Streaming Service Architecture Plan

## 📋 Executive Summary

This document outlines the comprehensive architecture for implementing a **NIP-53 compliant live streaming service** within the Wavlake web application. The solution integrates video/audio streaming with Nostr relays for decentralized metadata persistence, supporting OBS streaming workflows and real-time viewer interaction.

## 🎯 Feature Overview

### Core Functionality
- **Streamer Experience**: Login → "Go Live" → Configure Stream → Connect OBS → Start Broadcasting
- **Viewer Experience**: Discover live streams → Watch streams → Participate in chat
- **NIP-53 Compliance**: Full support for Live Events (kind:30311) and Live Chat (kind:1311)
- **Decentralized Metadata**: Stream information persisted across Nostr relays
- **Real-time Interaction**: Live chat, reactions, and viewer presence

### Key Technologies
- **Frontend**: React 18, TailwindCSS, shadcn/ui, WebRTC, HLS.js
- **Streaming**: OBS Studio, RTMP ingestion, HLS delivery
- **Protocol**: Nostr NIP-53 for metadata, WebSocket for real-time updates
- **Backend**: Go API extensions for stream management
- **Infrastructure**: CDN for video delivery, relay network for metadata

## 🏗️ NIP-53 Implementation Architecture

### Live Event Management (Kind:30311)

Based on NIP-53 specification, live events are addressable events with the following structure:

```json
{
  "kind": 30311,
  "tags": [
    ["d", "stream-{timestamp}-{pubkey}"],
    ["title", "Live Music Session"],
    ["summary", "Acoustic guitar performance"],
    ["image", "https://cdn.wavlake.com/stream-preview.jpg"],
    ["streaming", "https://stream.wavlake.com/live/{stream-id}.m3u8"],
    ["starts", "1676262123"],
    ["ends", "1676269323"],
    ["status", "live"],
    ["current_participants", "47"],
    ["total_participants", "152"],
    ["p", "{streamer-pubkey}", "wss://relay.wavlake.com", "Host"],
    ["t", "music"],
    ["t", "live"],
    ["relays", "wss://relay1.com", "wss://relay2.com"],
    ["streaming_type", "video"],
    ["quality_options", "720p,480p,360p"]
  ],
  "content": "Join me for an acoustic guitar session! Taking requests in chat.",
  "pubkey": "{streamer-pubkey}",
  "created_at": 1676262123,
  "sig": "..."
}
```

### Live Chat Implementation (Kind:1311)

Real-time chat messages reference the live event:

```json
{
  "kind": 1311,
  "tags": [
    ["a", "30311:{streamer-pubkey}:{stream-id}", "wss://relay.wavlake.com", "root"],
    ["p", "{streamer-pubkey}", "wss://relay.wavlake.com"]
  ],
  "content": "Great song! 🎵",
  "pubkey": "{viewer-pubkey}",
  "created_at": 1676262456,
  "sig": "..."
}
```

## 🎭 User Experience Flow

### Streamer Journey

#### 1. Pre-Stream Setup
```
User Dashboard → "Go Live" Button → Stream Setup Modal
                                 ↓
Stream Configuration Form:
- Title (required)
- Description 
- Category (Music, Talk, Gaming, etc.)
- Visibility (Public/Private)
- Enable Chat (yes/no)
- Stream Quality Settings
```

#### 2. Stream Connection
```
Setup Complete → Generate Stream Key → Display Connection Instructions
                                    ↓
OBS Configuration Panel:
- RTMP Server: rtmp://ingest.wavlake.com/live
- Stream Key: wlk_live_{unique-key}
- Encoder Settings: 1080p30, 2500kbps recommended
- Audio: 48kHz, 128kbps AAC
```

#### 3. Live Broadcasting
```
OBS Connected → "Start Streaming" Button → NIP-53 Event Published
                                        ↓
Live Stream Dashboard:
- Real-time viewer count
- Live chat messages
- Stream quality metrics
- Moderation controls
- Stream management (pause/stop)
```

#### 4. Post-Stream
```
Stream Ends → NIP-53 Event Updated → Optional Recording Save
                                   ↓
Stream Analytics:
- Total viewers
- Peak concurrent viewers  
- Chat engagement
- Stream duration
- Recording availability
```

### Viewer Journey

#### 1. Stream Discovery
```
Homepage/Dashboard → Live Streams Section → Stream Cards
                                         ↓
Stream Card Display:
- Stream thumbnail/preview
- Streamer profile info
- Current viewer count
- Stream category/tags
- "LIVE" indicator
```

#### 2. Stream Viewing
```
Click Stream → Stream Player Page → Video Player + Chat
                                 ↓
Player Interface:
- HLS video player (HLS.js)
- Quality selector (auto/720p/480p/360p)
- Fullscreen support
- Volume controls
- Chat panel (collapsible)
```

#### 3. Stream Interaction
```
Chat Interface → Real-time Messages → Nostr Event Publishing
              ↓
Interaction Features:
- Live chat messaging (kind:1311)
- Emoji reactions
- Viewer presence indicators
- Moderation (report/block)
```

## 🔧 Technical Architecture

### Frontend Components Structure

```
/src/
├── components/
│   └── streaming/
│       ├── setup/
│       │   ├── StreamSetupModal.tsx      # Stream configuration form
│       │   ├── OBSConnectionGuide.tsx    # OBS setup instructions
│       │   └── StreamingKeyDisplay.tsx   # Secure key display
│       ├── player/
│       │   ├── LiveStreamPlayer.tsx      # HLS video player
│       │   ├── StreamControls.tsx        # Player controls
│       │   └── QualitySelector.tsx       # Quality options
│       ├── dashboard/
│       │   ├── LiveStreamDashboard.tsx   # Streamer control panel
│       │   ├── StreamMetrics.tsx         # Real-time analytics
│       │   └── StreamModeration.tsx      # Chat moderation
│       ├── chat/
│       │   ├── LiveChatPanel.tsx         # Chat interface
│       │   ├── ChatMessage.tsx           # Individual messages
│       │   └── ChatInput.tsx             # Message input
│       └── discovery/
│           ├── LiveStreamGrid.tsx        # Stream discovery grid
│           ├── StreamCard.tsx            # Stream preview card
│           └── StreamFilters.tsx         # Category filters
├── hooks/
│   └── streaming/
│       ├── useLiveStream.ts              # Stream management
│       ├── useStreamPlayer.ts            # Video player state
│       ├── useLiveChat.ts                # Chat functionality
│       └── useStreamingKey.ts            # Secure key management
└── pages/
    ├── LiveStreaming.tsx                 # Main streaming page
    ├── StreamView.tsx                    # Individual stream view
    └── StreamDashboard.tsx               # Streamer dashboard
```

### Backend API Extensions (Go)

#### New API Endpoints

**Stream Management:**
```go
// POST /api/v1/streams/create
// Generate new stream key and prepare infrastructure
type CreateStreamRequest struct {
    Title       string   `json:"title" validate:"required,max=100"`
    Description string   `json:"description" validate:"max=500"`
    Category    string   `json:"category" validate:"required"`
    Tags        []string `json:"tags" validate:"dive,max=50"`
    Visibility  string   `json:"visibility" validate:"oneof=public private"`
    EnableChat  bool     `json:"enable_chat"`
}

type CreateStreamResponse struct {
    StreamID    string `json:"stream_id"`
    StreamKey   string `json:"stream_key"`
    RTMPIngest  string `json:"rtmp_ingest"`
    HLSPlayback string `json:"hls_playback"`
}
```

**Stream Status Management:**
```go
// POST /api/v1/streams/{stream_id}/start
// Mark stream as live and publish NIP-53 event

// POST /api/v1/streams/{stream_id}/stop  
// End stream and update NIP-53 event

// GET /api/v1/streams/{stream_id}/status
// Get current stream status and metrics
```

**Stream Discovery:**
```go
// GET /api/v1/streams/live
// List currently live streams with filters
type LiveStreamsResponse struct {
    Streams []LiveStreamInfo `json:"streams"`
    Total   int             `json:"total"`
}

// GET /api/v1/streams/user/{pubkey}
// Get user's streaming history and current status
```

#### Database Schema Extensions

```sql
-- Streams table
CREATE TABLE streams (
    id VARCHAR(36) PRIMARY KEY,
    pubkey VARCHAR(64) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    visibility VARCHAR(10) DEFAULT 'public',
    enable_chat BOOLEAN DEFAULT true,
    stream_key VARCHAR(64) UNIQUE NOT NULL,
    rtmp_ingest_url VARCHAR(255) NOT NULL,
    hls_playback_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'created', -- created, live, ended, error
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    max_viewers INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pubkey (pubkey),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_started_at (started_at)
);

-- Stream tags table
CREATE TABLE stream_tags (
    stream_id VARCHAR(36) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (stream_id, tag),
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
);

-- Stream metrics table (for analytics)
CREATE TABLE stream_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concurrent_viewers INTEGER NOT NULL,
    total_viewers INTEGER NOT NULL,
    chat_messages INTEGER NOT NULL,
    bitrate INTEGER,
    
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    INDEX idx_stream_timestamp (stream_id, timestamp)
);
```

### Infrastructure Requirements

#### Streaming Infrastructure

**RTMP Ingestion:**
```yaml
nginx-rtmp-server:
  rtmp:
    server:
      listen: 1935
      application_live:
        live: on
        allow_publish: 127.0.0.1  # Restrict to backend API
        on_publish: http://api.wavlake.com/api/v1/streams/auth
        on_play: http://api.wavlake.com/api/v1/streams/play-auth
        
        # HLS output configuration
        hls: on
        hls_path: /var/hls/live
        hls_fragment: 2s
        hls_playlist_length: 10s
        hls_continuous: on
        hls_cleanup: on
        hls_nested: on
        
        # Multiple quality outputs
        exec_push:
          - ffmpeg -i rtmp://localhost/live/$name 
                   -c:v libx264 -b:v 2500k -s 1280x720 -preset fast
                   -c:a aac -b:a 128k 
                   -f hls -hls_time 2 -hls_list_size 5
                   /var/hls/live/$name/720p.m3u8
          
          - ffmpeg -i rtmp://localhost/live/$name
                   -c:v libx264 -b:v 1000k -s 854x480 -preset fast  
                   -c:a aac -b:a 96k
                   -f hls -hls_time 2 -hls_list_size 5
                   /var/hls/live/$name/480p.m3u8
```

**CDN Configuration:**
```yaml
cdn_config:
  origin_server: stream.wavlake.com
  cache_policy:
    hls_segments: 10s TTL
    hls_playlists: 2s TTL
  geo_distribution:
    - us-east-1
    - us-west-2  
    - eu-west-1
    - ap-southeast-1
```

## 🎛️ Integration with Existing Wavlake Architecture

### Authentication Integration

**Leverage Existing Auth System:**
```tsx
// Use existing authentication hooks
const { user, isAuthenticated } = useCurrentUser();
const { mutate: publishEvent } = useNostrPublish();

// Stream creation with Nostr auth
const useLiveStreamCreate = () => {
  return useMutation({
    mutationFn: async (streamConfig: StreamConfig) => {
      // Create stream via Go API
      const stream = await createStream(streamConfig);
      
      // Publish NIP-53 live event
      await publishEvent({
        kind: 30311,
        content: streamConfig.description,
        tags: [
          ['d', stream.streamId],
          ['title', streamConfig.title],
          ['streaming', stream.hlsPlaybackUrl],
          ['status', 'planned'],
          // ... other NIP-53 tags
        ]
      });
      
      return stream;
    }
  });
};
```

### UI Component Integration

**Leverage shadcn/ui Components:**
```tsx
// Stream setup modal using existing design system
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export function StreamSetupModal() {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Up Your Live Stream</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Stream title" />
          <Select>
            <SelectValue placeholder="Category" />
            <SelectContent>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="talk">Talk</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full">Create Stream</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Layout System Integration

**Follow GlobalLayout Pattern:**
```tsx
// Stream pages automatically inherit layout
// /stream/setup -> Standard layout with header/footer
// /stream/{id} -> Full-width layout for video player
// /dashboard/streams -> Standard layout for management

// Add route exclusions for full-width stream view
const STREAMING_EXCLUDED_ROUTES = [
  '/stream/*/fullscreen'  // Fullscreen player
];
```

### Data Management Integration

**Extend Existing Hooks Pattern:**
```tsx
// Follow established TanStack Query patterns
export function useLiveStreams(category?: string) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['live-streams', category],
    queryFn: async ({ signal }) => {
      // Query NIP-53 live events
      const events = await nostr.query([{
        kinds: [30311],
        '#status': ['live'],
        '#t': category ? [category] : undefined,
        limit: 50
      }], { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) });
      
      return events.map(parseNIP53Event);
    },
    staleTime: 30 * 1000, // 30 seconds for live data
    refetchInterval: 30 * 1000
  });
}
```

## 🔄 Real-time Features Implementation

### WebSocket Integration for Live Chat

**Chat Hook Implementation:**
```tsx
export function useLiveChat(streamId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Subscribe to live chat events
  useEffect(() => {
    if (!streamId) return;
    
    const subscription = nostr.req([{
      kinds: [1311],
      '#a': [`30311:${streamId}`],
      since: Math.floor(Date.now() / 1000) - 60 // Last minute
    }]);
    
    subscription.on('event', (event) => {
      const message = parseChatMessage(event);
      setMessages(prev => [message, ...prev].slice(0, 100));
    });
    
    return () => subscription.close();
  }, [streamId, nostr]);
  
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.signer) throw new Error('Not authenticated');
      
      const event = await user.signer.signEvent({
        kind: 1311,
        content,
        tags: [
          ['a', `30311:${streamId}`, '', 'root']
        ],
        created_at: Math.floor(Date.now() / 1000)
      });
      
      await nostr.event(event);
    }
  });
  
  return { messages, sendMessage: sendMessage.mutate };
}
```

### Stream Status Management

**Real-time Stream Updates:**
```tsx
export function useStreamStatus(streamId: string) {
  const queryClient = useQueryClient();
  
  // WebSocket connection to Go backend for stream metrics
  useEffect(() => {
    const ws = new WebSocket(`wss://api.wavlake.com/streams/${streamId}/ws`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      // Update stream status in cache
      queryClient.setQueryData(['stream', streamId], (old: any) => ({
        ...old,
        ...update
      }));
      
      // Update NIP-53 event if status changed
      if (update.status && update.status !== old?.status) {
        updateNIP53Event(streamId, update.status);
      }
    };
    
    return () => ws.close();
  }, [streamId, queryClient]);
}
```

## 📱 Mobile Responsiveness

### Mobile-First Stream Player

**Responsive Player Design:**
```tsx
export function LiveStreamPlayer({ streamUrl }: { streamUrl: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      "relative bg-black rounded-lg overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "aspect-video w-full max-w-4xl mx-auto"
    )}>
      {/* HLS Video Player */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls={!isMobile} // Hide controls on mobile, use custom overlay
        autoPlay
        muted
        playsInline
      />
      
      {/* Mobile Controls Overlay */}
      {isMobile && (
        <div className="absolute inset-0 flex items-center justify-center">
          <MobilePlayerControls 
            onFullscreen={() => setIsFullscreen(!isFullscreen)}
            onQuality={handleQualityChange}
          />
        </div>
      )}
      
      {/* Chat Panel - Slide up on mobile */}
      {isMobile ? (
        <MobileChatDrawer streamId={streamId} />
      ) : (
        <div className="absolute right-0 top-0 w-80 h-full">
          <LiveChatPanel streamId={streamId} />
        </div>
      )}
    </div>
  );
}
```

## 🛡️ Security Considerations

### Stream Key Security

**Secure Key Management:**
```go
// Go backend stream key generation
func GenerateStreamKey(pubkey string) (string, error) {
    // Generate cryptographically secure random key
    keyBytes := make([]byte, 32)
    if _, err := rand.Read(keyBytes); err != nil {
        return "", err
    }
    
    // Prefix with identifier for easy recognition
    streamKey := fmt.Sprintf("wlk_live_%s", hex.EncodeToString(keyBytes)[:32])
    
    // Store key hash in database, not plaintext
    keyHash := sha256.Sum256([]byte(streamKey))
    
    return streamKey, storeStreamKey(pubkey, hex.EncodeToString(keyHash[:]))
}

// RTMP authentication endpoint
func AuthenticateStreamKey(streamKey string) bool {
    keyHash := sha256.Sum256([]byte(streamKey))
    return validateStreamKeyHash(hex.EncodeToString(keyHash[:]))
}
```

### Content Moderation

**Chat Moderation System:**
```tsx
export function useChatModeration(streamId: string) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  
  const reportMessage = async (messageId: string, reason: string) => {
    await publishEvent({
      kind: 1984, // NIP-56 reporting event
      content: reason,
      tags: [
        ['e', messageId],
        ['p', messagePubkey],
        ['report', 'spam'] // or other report types
      ]
    });
  };
  
  const deleteMessage = async (messageId: string) => {
    if (!isStreamOwner(user?.pubkey, streamId)) return;
    
    // NIP-09 deletion event
    await publishEvent({
      kind: 5,
      content: 'Message removed by moderator',
      tags: [['e', messageId]]
    });
  };
  
  return { reportMessage, deleteMessage };
}
```

## 📊 Analytics & Monitoring

### Stream Analytics Dashboard

**Metrics Collection:**
```tsx
export function useStreamAnalytics(streamId: string) {
  return useQuery({
    queryKey: ['stream-analytics', streamId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/streams/${streamId}/analytics`);
      return response.json();
    },
    refetchInterval: 30 * 1000
  });
}

// Analytics data structure
interface StreamAnalytics {
  duration: number;
  peakViewers: number;
  totalViewers: number;
  averageViewTime: number;
  chatMessages: number;
  chatEngagement: number;
  qualityMetrics: {
    averageBitrate: number;
    dropoutEvents: number;
    bufferingEvents: number;
  };
  viewerGeography: { country: string; viewers: number; }[];
  timeline: { timestamp: number; viewers: number; }[];
}
```

## 🚀 Deployment Strategy

### Phase 1: Core Infrastructure (Weeks 1-3)
- [ ] Go backend API endpoints
- [ ] Database schema implementation  
- [ ] RTMP ingestion server setup
- [ ] HLS delivery configuration
- [ ] Basic NIP-53 event publishing

### Phase 2: Streamer Experience (Weeks 4-6)
- [ ] Stream setup UI components
- [ ] OBS integration guide
- [ ] Stream dashboard with metrics
- [ ] Basic moderation tools

### Phase 3: Viewer Experience (Weeks 7-9)
- [ ] Stream discovery interface
- [ ] Video player with quality selection
- [ ] Live chat implementation
- [ ] Mobile responsive design

### Phase 4: Advanced Features (Weeks 10-12)
- [ ] Stream analytics dashboard
- [ ] Advanced moderation features
- [ ] Recording functionality
- [ ] Performance optimizations

## 🔮 Future Enhancements

### Potential Extensions
- **Interactive Features**: Polls, Q&A, viewer reactions
- **Monetization**: Super chats, subscription tiers, tip integration
- **Collaboration**: Multi-host streams, guest invitations
- **Content**: Stream scheduling, recurring events, playlists
- **Integration**: Wavlake music catalog integration, artist showcases
- **Advanced Analytics**: Viewer retention graphs, engagement metrics
- **Recording & VOD**: Stream archives, highlights, clipping

### Scalability Considerations
- **CDN Optimization**: Multi-region delivery, adaptive bitrate
- **Infrastructure**: Auto-scaling ingestion servers, load balancing
- **Database**: Read replicas, caching layer, metrics aggregation
- **Monitoring**: Stream health monitoring, alert systems
- **Cost Management**: Usage-based pricing, resource optimization

---

## 📋 Implementation Checklist

### Frontend Development
- [ ] Create streaming component structure
- [ ] Implement stream setup modal
- [ ] Build live stream player with HLS.js
- [ ] Develop live chat interface
- [ ] Create stream discovery UI
- [ ] Add mobile responsive design
- [ ] Integrate with existing auth system
- [ ] Implement NIP-53 event handling

### Backend Development  
- [ ] Extend Go API with streaming endpoints
- [ ] Implement database schema changes
- [ ] Set up RTMP ingestion server
- [ ] Configure HLS output pipeline
- [ ] Add stream authentication system
- [ ] Implement metrics collection
- [ ] Create WebSocket connections for real-time updates

### Infrastructure Setup
- [ ] Deploy RTMP ingestion servers
- [ ] Configure CDN for HLS delivery
- [ ] Set up monitoring and alerting
- [ ] Implement backup and recovery
- [ ] Configure auto-scaling policies

### Testing & Quality Assurance
- [ ] Unit tests for all components
- [ ] Integration tests for streaming pipeline
- [ ] Load testing for concurrent viewers
- [ ] Mobile device testing
- [ ] Browser compatibility testing
- [ ] Security penetration testing

This architecture provides a comprehensive foundation for implementing a production-ready live streaming service that leverages Nostr's decentralized infrastructure while integrating seamlessly with Wavlake's existing platform architecture.