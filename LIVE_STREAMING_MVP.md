# Live Streaming Service MVP Architecture

## 📋 Executive Summary

This document outlines the **MVP architecture** for implementing a **NIP-53 compliant live streaming service** within the Wavlake web application. This MVP focuses on core public streaming functionality with basic chat, establishing the foundation for future enhancements.

## 🎯 MVP Feature Overview

### Core MVP Functionality
- **Streamer Experience**: Login → "Go Live" → Configure Stream → Connect OBS → Start Broadcasting
- **Viewer Experience**: Discover live streams → Watch streams → Participate in public chat
- **NIP-53 Compliance**: Basic support for Live Events (kind:30311) and Live Chat (kind:1311)
- **Decentralized Metadata**: Stream information persisted across Nostr relays
- **Real-time Public Chat**: Live chat interactions via Nostr events

### Key Technologies
- **Frontend**: React 18, TailwindCSS, shadcn/ui, HLS.js
- **Streaming**: OBS Studio, RTMP ingestion, HLS delivery
- **Protocol**: Nostr NIP-53 for metadata, WebSocket for real-time updates
- **Backend**: Go API extensions for stream management
- **Infrastructure**: Basic CDN for video delivery, relay network for metadata

## 💰 MVP Cost & Infrastructure Planning

### Expected Infrastructure Costs

For an MVP supporting **100-500 concurrent viewers**:

**Total Monthly Cost: $650-1,300**

| Component | Cost Range | Specs | Notes |
|-----------|------------|-------|-------|
| **Transcoding Server** | $300-500/month | 8-16 vCPUs, 32-64GB RAM | Auto-scaling based on load |
| **Nostr Relays (3x)** | $150-250/month | 2 vCPUs, 4GB RAM each | Redundancy for reliability |
| **CDN (Basic)** | $100-300/month | 1-5TB bandwidth | Regional deployment (US-East) |
| **Storage** | $50-150/month | 500GB-2TB | Stream keys, metadata, logs |

### Bandwidth Planning

**Per-Stream Requirements:**
- **Single Quality (720p)**: 2-3 Mbps per viewer
- **100 concurrent viewers**: ~250 Mbps peak bandwidth
- **500 concurrent viewers**: ~1.25 Gbps peak bandwidth

**Monthly Bandwidth Estimates:**
- **100 concurrent viewers**: ~3-5TB/month
- **500 concurrent viewers**: ~15-25TB/month

### Scaling Thresholds

| Metric | MVP Limit | Scale Up Trigger |
|--------|-----------|------------------|
| Concurrent Streams | 20 | 15+ active streams |
| Concurrent Viewers | 500 | 400+ total viewers |
| Monthly Bandwidth | 5TB | 4TB+ usage |
| Server CPU | 80% | 70%+ sustained |

### Regional Strategy

**MVP Deployment**: Single region (US-East-1)
- Covers 70% of initial user base
- Latency: <100ms for US users
- Future expansion to US-West, EU-West based on adoption

## 🔐 Critical Security Model: Client-Side Event Signing

### ⚠️ Important: API Cannot Sign User Events

**The Go backend API cannot and must not sign Nostr events on behalf of users.** This would violate Nostr's core security model where only users control their private keys. All NIP-53 events must be signed client-side by the user's browser/extension.

### Correct Event Signing Flow

```
❌ WRONG: API signs events with user's pubkey
✅ CORRECT: Client signs events, API provides infrastructure
```

## 🏗️ MVP NIP-53 Implementation

### Basic Live Event Management (Kind:30311)

MVP live events structure for **public streams only**:

```json
{
  "kind": 30311,
  "tags": [
    ["d", "stream-{timestamp}-{pubkey}"],
    ["title", "Live Music Session"],
    ["summary", "Acoustic guitar performance"],
    ["image", "https://cdn.wavlake.com/stream-thumbnail.jpg"],
    ["streaming", "https://stream.wavlake.com/live/{stream-id}.m3u8"],
    ["recording", "https://wavlake.com/vod/{stream-id}"],
    ["starts", "1676262123"],
    ["status", "live"],
    ["current_participants", "47"],
    ["p", "{streamer-pubkey}", "wss://relay.wavlake.com", "Host"],
    ["t", "music"],
    ["t", "live"],
    ["relays", "wss://relay.wavlake.com", "wss://relay.damus.io", "wss://nos.lol"],
    ["goal", "500 sats"]
  ],
  "content": "Join me for an acoustic guitar session! Taking requests in chat.",
  "pubkey": "{streamer-pubkey}",
  "created_at": 1676262123,
  "sig": "..."
}
```

### Basic Live Chat Implementation (Kind:1311)

Simple public chat messages:

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

## 🎭 MVP User Experience Flow

### Streamers (MVP)

#### 1. Basic Stream Setup
```
User Dashboard → "Go Live" Button → Simple Setup Modal
                                 ↓
MVP Configuration Form:
- Title (required)
- Description 
- Category (Music, Talk, Gaming, etc.)
- Enable Chat (yes/no)
```

#### 2. OBS Connection
```
Setup Complete → Generate Stream Key → Display Connection Instructions
                                    ↓
OBS Configuration Panel:
- RTMP Server: rtmp://ingest.wavlake.com/live
- Stream Key: wlk_live_{unique-key}
- Basic encoder settings guidance
```

#### 3. Live Broadcasting
```
OBS Connected → "Start Streaming" Button → NIP-53 Event Published
                                        ↓
Simple Live Dashboard:
- Real-time viewer count
- Live chat messages
- Stream status
- Stop stream button
```

### Viewers (MVP)

#### 1. Stream Discovery
```
Homepage/Dashboard → Live Streams Section → Stream Cards
                                         ↓
Basic Stream Card Display:
- Stream title
- Streamer name
- Current viewer count
- "LIVE" indicator
```

#### 2. Stream Viewing
```
Click Stream → Stream Player Page → Video Player + Chat
                                 ↓
MVP Player Interface:
- Basic HLS video player
- Simple chat panel
- Volume controls
- Basic fullscreen support
```

## 🔧 MVP Technical Architecture

### Frontend Components Structure (MVP)

```
/src/
├── components/
│   └── streaming/
│       ├── setup/
│       │   ├── StreamSetupModal.tsx      # Basic configuration form
│       │   └── StreamingKeyDisplay.tsx   # Simple key display
│       ├── player/
│       │   ├── LiveStreamPlayer.tsx      # Basic HLS video player
│       │   └── StreamControls.tsx        # Simple player controls
│       ├── chat/
│       │   ├── LiveChatPanel.tsx         # Basic chat interface
│       │   ├── ChatMessage.tsx           # Individual messages
│       │   └── ChatInput.tsx             # Message input
│       └── discovery/
│           ├── LiveStreamGrid.tsx        # Stream discovery grid
│           └── StreamCard.tsx            # Stream preview card
├── hooks/
│   └── streaming/
│       ├── useLiveStream.ts              # Basic stream management
│       ├── useLiveChat.ts                # Chat functionality
│       └── useStreamingKey.ts            # Key management
└── pages/
    ├── LiveStreaming.tsx                 # Main streaming page
    └── StreamView.tsx                    # Individual stream view
```

### MVP Backend API (Go)

#### Essential API Endpoints

**Stream Management:**
```go
// POST /api/v1/streams/create
type CreateStreamRequest struct {
    Title       string `json:"title" validate:"required,max=100"`
    Description string `json:"description" validate:"max=500"`
    Category    string `json:"category" validate:"required"`
    EnableChat  bool   `json:"enable_chat"`
}

type CreateStreamResponse struct {
    StreamID    string `json:"stream_id"`
    StreamKey   string `json:"stream_key"`
    RTMPIngest  string `json:"rtmp_ingest"`
    HLSPlayback string `json:"hls_playback"`
}
```

**Basic Status Management:**
```go
// GET /api/v1/streams/{stream_id}/status
type StreamStatusResponse struct {
    Status         string `json:"status"`
    CurrentViewers int    `json:"current_viewers"`
    Duration       int    `json:"duration_seconds"`
}

// POST /api/v1/streams/{stream_id}/start
// POST /api/v1/streams/{stream_id}/stop
```

#### Enhanced MVP Database Schema

```sql
-- Enhanced streams table with future Lightning support
CREATE TABLE streams (
    id VARCHAR(36) PRIMARY KEY,
    pubkey VARCHAR(64) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    enable_chat BOOLEAN DEFAULT true,
    stream_key_hash VARCHAR(64) UNIQUE NOT NULL, -- Store hash, not plaintext
    rtmp_ingest_url VARCHAR(255) NOT NULL,
    hls_playback_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'created', -- created, live, ended, error, reconnecting
    connection_state VARCHAR(20) DEFAULT 'disconnected', -- connecting, connected, reconnecting, failed
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    current_viewers INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMP NULL,
    
    -- Future Lightning integration preparation
    payment_required BOOLEAN DEFAULT false,
    price_sats INTEGER DEFAULT 0,
    lightning_address VARCHAR(255),
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP NULL,
    
    -- Stream retention (24 hours post-end)
    expires_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pubkey (pubkey),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_connection_state (connection_state),
    INDEX idx_expires_at (expires_at),
    INDEX idx_started_at (started_at)
);

-- Enhanced metrics with error tracking
CREATE TABLE stream_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concurrent_viewers INTEGER NOT NULL,
    chat_messages INTEGER DEFAULT 0,
    bitrate INTEGER DEFAULT 0,
    frame_rate FLOAT DEFAULT 0,
    packet_loss FLOAT DEFAULT 0,
    connection_state VARCHAR(20),
    error_events INTEGER DEFAULT 0,
    
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    INDEX idx_stream_timestamp (stream_id, timestamp),
    INDEX idx_timestamp (timestamp)
);

-- Chat rate limiting tracking
CREATE TABLE chat_rate_limits (
    pubkey VARCHAR(64) NOT NULL,
    stream_id VARCHAR(36) NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (pubkey, stream_id),
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    INDEX idx_window_cleanup (window_start)
);

-- Error tracking for debugging
CREATE TABLE stream_errors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    error_type VARCHAR(50) NOT NULL, -- rtmp_disconnect, hls_generation, relay_failure, etc.
    error_message TEXT,
    error_details JSON,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    INDEX idx_stream_errors (stream_id, created_at),
    INDEX idx_error_type (error_type),
    INDEX idx_unresolved (resolved_at)
);

-- Future: Lightning payments preparation
CREATE TABLE stream_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stream_id VARCHAR(36) NOT NULL,
    payer_pubkey VARCHAR(64),
    amount_sats INTEGER NOT NULL,
    payment_hash VARCHAR(64) UNIQUE,
    invoice VARCHAR(2000),
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, expired, failed
    expires_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    INDEX idx_stream_payments (stream_id),
    INDEX idx_payment_hash (payment_hash),
    INDEX idx_status_expires (status, expires_at)
);

-- Cleanup procedures for expired data
DELIMITER //
CREATE PROCEDURE CleanupExpiredStreams()
BEGIN
    -- Remove streams expired more than 24 hours ago
    DELETE FROM streams WHERE expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL 24 HOUR;
    
    -- Clean up old rate limiting data (older than 1 hour)
    DELETE FROM chat_rate_limits WHERE window_start < NOW() - INTERVAL 1 HOUR;
    
    -- Archive old metrics (older than 30 days)
    DELETE FROM stream_metrics WHERE timestamp < NOW() - INTERVAL 30 DAY;
    
    -- Clean up old error logs (older than 7 days)
    DELETE FROM stream_errors WHERE created_at < NOW() - INTERVAL 7 DAY;
END //
DELIMITER ;

-- Schedule cleanup to run every hour
CREATE EVENT CleanupExpiredData
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
DO CALL CleanupExpiredStreams();
```

### MVP Infrastructure

#### Basic RTMP Ingestion
```yaml
nginx-rtmp-server:
  rtmp:
    server:
      listen: 1935
      application_live:
        live: on
        allow_publish: 127.0.0.1
        
        # Single quality HLS output
        hls: on
        hls_path: /var/hls/live
        hls_fragment: 2s
        hls_playlist_length: 10s
        hls_continuous: on
        hls_cleanup: on
```

#### Basic CDN Configuration
```yaml
cdn_config:
  origin_server: stream.wavlake.com
  cache_policy:
    hls_segments: 10s TTL
    hls_playlists: 2s TTL
  single_region: us-east-1  # MVP: Single region
```

## 🎛️ MVP Integration with Wavlake

### Basic Authentication Integration

```tsx
// MVP: Simple client-side event signing
const { user } = useCurrentUser();
const { mutate: publishEvent } = useNostrPublish();

const useLiveStreamCreate = () => {
  return useMutation({
    mutationFn: async (streamConfig: StreamConfig) => {
      // Step 1: API creates infrastructure
      const { streamId, streamKey, rtmpUrl, hlsUrl } = await createStream({
        title: streamConfig.title,
        description: streamConfig.description,
        category: streamConfig.category,
        enableChat: streamConfig.enableChat
      });
      
      // Step 2: Client signs basic NIP-53 event
      await publishEvent({
        kind: 30311,
        content: streamConfig.description,
        tags: [
          ['d', streamId],
          ['title', streamConfig.title],
          ['streaming', hlsUrl],
          ['status', 'planned'],
          ['starts', Math.floor(Date.now() / 1000).toString()],
          ['t', streamConfig.category],
          ['t', 'live']
        ]
      });
      
      return { streamId, streamKey, rtmpUrl, hlsUrl };
    }
  });
};
```

### Basic UI Component Integration

```tsx
// MVP: Simple stream setup modal
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export function StreamSetupModal() {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Go Live</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Stream title" required />
          <Input placeholder="Description (optional)" />
          <Select>
            <SelectValue placeholder="Category" />
            <SelectContent>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="talk">Talk</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full">Create Stream</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## 🔄 MVP Real-time Features

### Basic Chat Implementation

```tsx
export function useLiveChat(streamId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Enhanced chat subscription with failover
  useEffect(() => {
    if (!streamId) return;
    
    const subscription = nostr.req([{
      kinds: [1311],
      '#a': [`30311:${streamId}`],
      since: Math.floor(Date.now() / 1000) - 60 // Last minute only
    }]);
    
    subscription.on('event', (event) => {
      const message = parseChatMessage(event);
      setMessages(prev => [message, ...prev].slice(0, 50)); // Limit to 50 messages
      setConnectionState('connected');
    });
    
    subscription.on('disconnect', () => {
      setConnectionState('disconnected');
      // Automatic reconnection after 5 seconds
      setTimeout(() => {
        setConnectionState('connecting');
      }, 5000);
    });
    
    return () => subscription.close();
  }, [streamId, nostr]);
  
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.signer) throw new Error('Not authenticated');
      
      // Rate limiting: 1 second minimum between messages
      const now = Date.now();
      if (lastMessageTime && now - lastMessageTime < 1000) {
        throw new Error('Please wait before sending another message');
      }
      
      // Message length validation
      if (content.length > 500) {
        throw new Error('Message too long (max 500 characters)');
      }
      
      const event = await user.signer.signEvent({
        kind: 1311,
        content: content.trim(),
        tags: [
          ['a', `30311:${streamId}`, '', 'root']
        ],
        created_at: Math.floor(Date.now() / 1000)
      });
      
      await nostr.event(event);
      setLastMessageTime(now);
    }
  });
  
  return { 
    messages, 
    sendMessage: sendMessage.mutate,
    connectionState,
    canSend: connectionState === 'connected' && !sendMessage.isPending
  };
}
```

### Relay Failover Strategy

```tsx
// Enhanced Nostr client with relay redundancy
export function useNostrWithFailover() {
  const relays = [
    'wss://relay.wavlake.com',    // Primary Wavlake relay
    'wss://relay.damus.io',       // Backup relay 1
    'wss://nos.lol',              // Backup relay 2
    'wss://relay.nostr.band',     // Backup relay 3
    'wss://nostr.wine'            // Backup relay 4
  ];
  
  const [activeRelays, setActiveRelays] = useState<string[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, 'connecting' | 'connected' | 'failed'>>({});
  
  useEffect(() => {
    // Connect to multiple relays simultaneously for redundancy
    relays.forEach(relay => {
      setConnectionStates(prev => ({ ...prev, [relay]: 'connecting' }));
      
      // Connection logic here...
      // Update connectionStates based on success/failure
    });
  }, []);
  
  return { activeRelays, connectionStates };
}

// Enhanced stream discovery with relay failover
export function useLiveStreams() {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['live-streams'],
    queryFn: async ({ signal }) => {
      try {
        const events = await nostr.query([{
          kinds: [30311],
          '#status': ['live'],
          limit: 20 // MVP: Limit to 20 streams
        }], { 
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
          // Query from multiple relays for redundancy
          relays: [
            'wss://relay.wavlake.com',
            'wss://relay.damus.io', 
            'wss://nos.lol'
          ]
        });
        
        return events.map(parseNIP53Event);
      } catch (error) {
        console.error('Failed to fetch live streams:', error);
        // Return cached data or empty array as fallback
        return [];
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}
```

## 📱 MVP Mobile Support

### Basic Responsive Design

```tsx
export function LiveStreamPlayer({ streamUrl }: { streamUrl: string }) {
  const isMobile = useIsMobile();
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Basic responsive video player */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          muted
          playsInline
        />
      </div>
      
      {/* Chat panel - stacked on mobile */}
      <div className={cn(
        isMobile ? "mt-4" : "mt-0 absolute right-0 top-0 w-80 h-full"
      )}>
        <LiveChatPanel streamId={streamId} />
      </div>
    </div>
  );
}
```

## 🛡️ MVP Security Considerations

### Enhanced Stream Key Security

```go
// Connection state management for resilience
type StreamConnectionState string

const (
    StreamConnecting   StreamConnectionState = "connecting"
    StreamConnected    StreamConnectionState = "connected"
    StreamReconnecting StreamConnectionState = "reconnecting"
    StreamFailed       StreamConnectionState = "failed"
    StreamEnded        StreamConnectionState = "ended"
)

// Optimized stream key generation (16 bytes - industry standard)
func GenerateStreamKey(pubkey string) (string, error) {
    keyBytes := make([]byte, 16) // 16 bytes sufficient for MVP
    if _, err := rand.Read(keyBytes); err != nil {
        return "", err
    }
    
    streamKey := fmt.Sprintf("wlk_live_%s", hex.EncodeToString(keyBytes))
    keyHash := sha256.Sum256([]byte(streamKey))
    
    return streamKey, storeStreamKey(pubkey, hex.EncodeToString(keyHash[:]))
}

// RTMP authentication with connection state tracking
func AuthenticateStreamKey(streamKey string) (bool, *StreamConnection) {
    keyHash := sha256.Sum256([]byte(streamKey))
    valid := validateStreamKeyHash(hex.EncodeToString(keyHash[:]))
    
    if valid {
        connection := &StreamConnection{
            StreamKey: streamKey,
            State:     StreamConnecting,
            ConnectedAt: time.Now(),
        }
        return true, connection
    }
    
    return false, nil
}
```

### Basic Content Moderation

```tsx
export function useChatModeration(streamId: string) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  
  const reportMessage = async (messageId: string, reason: string) => {
    await publishEvent({
      kind: 1984, // NIP-56 reporting
      content: reason,
      tags: [
        ['e', messageId],
        ['report', 'spam']
      ]
    });
  };
  
  return { reportMessage };
}
```

## 🚀 MVP Deployment Strategy

### MVP Implementation Phases

**Phase 1: Core Infrastructure (Weeks 1-2)**
- [ ] Basic Go API endpoints
- [ ] Simple database schema
- [ ] RTMP ingestion setup
- [ ] Single quality HLS delivery

**Phase 2: Basic UI (Weeks 3-4)**
- [ ] Stream setup modal
- [ ] Simple video player
- [ ] Basic chat interface
- [ ] Stream discovery grid

**Phase 3: Integration & Testing (Week 5)**
- [ ] Nostr event integration
- [ ] End-to-end testing
- [ ] Basic mobile responsive design
- [ ] Performance optimization

**Phase 4: Launch Preparation (Week 6)**
- [ ] Documentation
- [ ] User testing
- [ ] Bug fixes
- [ ] Deployment

### MVP Success Criteria

**Technical Metrics:**
- [ ] Stream starts successfully >95% of the time
- [ ] Chat messages appear within 5 seconds
- [ ] Video latency <10 seconds
- [ ] Supports 10+ concurrent streams

**User Experience:**
- [ ] Streamer can go live in <2 minutes
- [ ] Viewers can discover and watch streams easily
- [ ] Chat works reliably
- [ ] Mobile web experience is usable

## 🔮 MVP Limitations & Future Enhancements

### Explicit MVP Limitations

**Streaming Constraints:**
- **No transcoding initially** - Single quality stream only (720p fixed)
- **Single region deployment** - US-East region only (future: multi-region)
- **Manual moderation** - No automated content filtering in MVP
- **Standard HLS latency** - 10-30 seconds (not low-latency)
- **No recording** - Live streaming only, no VOD capability

**Feature Limitations:**
- **Public streams only** - No private/paid stream access
- **Basic analytics** - Just viewer count, no detailed engagement metrics
- **Simple chat** - No threading, reactions, or moderation tools
- **No monetization** - No Lightning payments or super chats
- **Basic discovery** - Category filtering only, no advanced algorithms

**Technical Limitations:**
- **Single stream quality** - No adaptive bitrate streaming
- **Limited concurrent capacity** - 500 viewers max per MVP deployment
- **Basic error handling** - Minimal automated recovery systems
- **No WebRTC** - HLS only, no ultra-low latency options

### Mobile-Specific Constraints

**MVP Mobile Limitations:**
- **No Picture-in-Picture** - Disabled initially for simplicity
- **Force landscape orientation** - Video player requires landscape mode
- **Simplified touch controls** - Basic play/pause, volume only
- **No mobile streaming** - Viewing only, no mobile broadcast capability
- **Limited offline handling** - Basic connection loss detection only

**Mobile UI Constraints:**
- **Stacked layout** - Chat below video on mobile (not overlay)
- **Simplified quality selector** - Auto-quality only on mobile
- **Basic fullscreen** - No advanced video controls in fullscreen
- **Touch-optimized chat** - Larger touch targets, simplified interactions

### Performance Expectations

**Latency Targets:**
- **Standard HLS**: 10-30 seconds (MVP acceptable range)
- **Chat messages**: <5 seconds delivery
- **Stream discovery**: <3 seconds load time
- **Player startup**: <5 seconds to first frame

**Reliability Targets:**
- **Stream uptime**: >95% (not 99.9% initially)
- **Chat delivery**: >90% message success rate
- **Player stability**: <5% buffer/error rate
- **Concurrent capacity**: 500 viewers max

### Stream Ended Retention

**Post-Stream Behavior:**
- **NIP-53 events retained** - Keep stream metadata for 24 hours after end
- **Chat history preserved** - Last 100 messages available for discovery
- **Analytics snapshot** - Basic metrics saved for streamer review
- **Automatic cleanup** - Remove stale stream data after 24 hours

### Future Enhancement Path

**Immediate Post-MVP (Month 1-2):**
- Private stream authentication with strfry relay plugins
- Multiple video qualities (1080p, 480p, 360p)
- Enhanced mobile experience and controls

**Short-term (Month 3-6):**
- Advanced chat moderation and permissions
- Detailed analytics dashboard
- Stream recording and VOD capability
- Multi-region CDN deployment

**Long-term (Month 6+):**
- Lightning payments and monetization
- WebRTC ultra-low latency streaming
- Mobile broadcasting capability
- Advanced recommendation algorithms

This MVP scope provides a **production-ready foundation** while maintaining manageable complexity and clear expectations for both users and stakeholders.