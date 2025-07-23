# Wavlake Live Streaming Enhancement Plan

## 📈 Post-MVP Feature Roadmap

This document outlines advanced features to implement after the MVP proves the core streaming concept. These enhancements transform the basic streaming service into a comprehensive, production-ready platform.

## 🎯 Enhancement Phases

### Phase 1: Private Streams & Access Control (Months 1-2)

#### **🔐 Strfry Relay Plugin Implementation**

**Core Private Stream Authentication:**

```javascript
// Enhanced wavlake-private-stream-plugin.js with full features
class WavlakeStreamPlugin {
  constructor() {
    this.streamCache = new Map();
    this.rateLimits = new Map();
    this.moderationActions = new Set();
  }

  async processEvent(input) {
    const { event, sourceType, receivedAt } = input;
    
    try {
      switch (event.kind) {
        case 30311: // Stream events
          return this.handleStreamEvent(event);
        case 1311: // Chat events  
          return this.handleChatEvent(event);
        case 5: // Deletion events
          return this.handleModerationEvent(event);
        case 1984: // Report events
          return this.handleReportEvent(event);
        default:
          return { id: event.id, action: "accept" };
      }
    } catch (error) {
      return { id: event.id, action: "reject", msg: "Plugin processing error" };
    }
  }

  handleChatEvent(event) {
    // Rate limiting check
    if (!this.checkRateLimit(event.pubkey)) {
      return { 
        id: event.id, 
        action: "reject", 
        msg: "Rate limit exceeded" 
      };
    }

    // Private stream authorization
    const streamAuth = this.getStreamAuthorization(event);
    if (streamAuth && !this.isAuthorizedForChat(event.pubkey, streamAuth)) {
      return { 
        id: event.id, 
        action: "reject", 
        msg: "Not authorized for private stream chat" 
      };
    }

    return { id: event.id, action: "accept" };
  }

  checkRateLimit(pubkey) {
    const rateLimitKey = pubkey;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxMessages = 20; // 20 messages per minute
    
    const userLimits = this.rateLimits.get(rateLimitKey) || [];
    const recentMessages = userLimits.filter(time => now - time < windowMs);
    
    if (recentMessages.length >= maxMessages) {
      return false;
    }
    
    recentMessages.push(now);
    this.rateLimits.set(rateLimitKey, recentMessages);
    return true;
  }
}
```

**Enhanced Private Stream Event Structure:**

```json
{
  "kind": 30311,
  "tags": [
    ["d", "stream-vip-session"],
    ["title", "VIP Acoustic Session"],  
    ["visibility", "private"],
    ["access_type", "whitelist"],
    ["authorized", "pubkey1", "pubkey2", "pubkey3"],
    ["p", "pubkey1", "", "moderate"],
    ["p", "pubkey2", "", "view"],
    ["p", "pubkey3", "", "interact"],
    ["chat_restricted", "true"],
    ["max_viewers", "50"],
    ["expires", "1676269323"],
    ["streaming", "https://protected.wavlake.com/auth/{stream-id}.m3u8"]
  ],
  "content": "Private session for VIP supporters only",
  "pubkey": "{streamer-pubkey}"
}
```

#### **Advanced Access Control Features**

**Permission Management UI:**
```tsx
export function StreamAccessManager({ streamId }: { streamId: string }) {
  const { data: authorizations } = useStreamAuthorizations(streamId);
  const { mutate: updatePermissions } = useUpdateStreamPermissions();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Access Control</CardTitle>
        <CardDescription>Manage who can view and interact with your stream</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authorizations?.map(auth => (
          <div key={auth.pubkey} className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={auth.avatar} />
                <AvatarFallback>{auth.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{auth.displayName || formatPubkey(auth.pubkey)}</div>
                <div className="text-sm text-muted-foreground">
                  {auth.permission_level} • Added {formatDate(auth.granted_at)}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updatePermissions({
                  streamId, 
                  pubkey: auth.pubkey, 
                  level: 'moderate'
                })}>
                  Make Moderator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updatePermissions({
                  streamId, 
                  pubkey: auth.pubkey, 
                  level: 'view'
                })}>
                  View Only
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => revokeAccess(auth.pubkey)}
                >
                  Revoke Access
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button onClick={() => setShowAddViewer(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Authorized Viewer
        </Button>
      </CardContent>
    </Card>
  );
}
```

**CDN Authentication Integration:**
```go
// Enhanced CDN access validation
func (api *API) ValidateStreamAccess(w http.ResponseWriter, r *http.Request) {
    streamId := r.URL.Query().Get("stream_id")
    pubkey := r.URL.Query().Get("pubkey")
    signature := r.URL.Query().Get("signature")
    timestamp := r.URL.Query().Get("timestamp")
    
    // Verify signature freshness (within 5 minutes)
    if !verifyTimestamp(timestamp, 300) {
        w.WriteHeader(403)
        return
    }
    
    // Verify signature authenticity
    message := fmt.Sprintf("stream-access:%s:%s", streamId, timestamp)
    if !verifySignature(pubkey, signature, message) {
        w.WriteHeader(403)
        return
    }
    
    // Query relay plugin for authorization
    authorized := api.queryRelayPlugin(streamId, pubkey)
    
    if authorized {
        // Generate short-lived CDN token
        token := generateCDNToken(streamId, pubkey, 30*time.Minute)
        w.Header().Set("X-Stream-Token", token)
        w.WriteHeader(200)
    } else {
        w.WriteHeader(403)
    }
}
```

### Phase 2: Stream Quality & Reliability (Months 2-3)

#### **Adaptive Bitrate Streaming**

**Multi-Quality Transcoding Pipeline:**
```yaml
# Enhanced RTMP server with multiple outputs
nginx-rtmp-server:
  rtmp:
    server:
      listen: 1935
      application_live:
        live: on
        
        # Multiple quality transcoding
        exec_push:
          # 1080p (Source quality)
          - ffmpeg -i rtmp://localhost/live/$name 
                   -c:v libx264 -preset fast -tune zerolatency
                   -b:v 4500k -maxrate 4500k -bufsize 9000k
                   -s 1920x1080 -r 30 -g 60 -keyint_min 60
                   -c:a aac -b:a 128k -ar 48000
                   -f hls -hls_time 2 -hls_list_size 5
                   -hls_flags delete_segments+append_list
                   /var/hls/live/$name/1080p.m3u8
          
          # 720p  
          - ffmpeg -i rtmp://localhost/live/$name
                   -c:v libx264 -preset fast -tune zerolatency  
                   -b:v 2500k -maxrate 2500k -bufsize 5000k
                   -s 1280x720 -r 30 -g 60 -keyint_min 60
                   -c:a aac -b:a 128k -ar 48000
                   -f hls -hls_time 2 -hls_list_size 5
                   -hls_flags delete_segments+append_list
                   /var/hls/live/$name/720p.m3u8
          
          # 480p
          - ffmpeg -i rtmp://localhost/live/$name
                   -c:v libx264 -preset fast -tune zerolatency
                   -b:v 1000k -maxrate 1000k -bufsize 2000k  
                   -s 854x480 -r 30 -g 60 -keyint_min 60
                   -c:a aac -b:a 96k -ar 48000
                   -f hls -hls_time 2 -hls_list_size 5
                   -hls_flags delete_segments+append_list
                   /var/hls/live/$name/480p.m3u8
          
          # 360p (Mobile)
          - ffmpeg -i rtmp://localhost/live/$name
                   -c:v libx264 -preset fast -tune zerolatency
                   -b:v 600k -maxrate 600k -bufsize 1200k
                   -s 640x360 -r 30 -g 60 -keyint_min 60  
                   -c:a aac -b:a 64k -ar 48000
                   -f hls -hls_time 2 -hls_list_size 5
                   -hls_flags delete_segments+append_list
                   /var/hls/live/$name/360p.m3u8

        # Generate master playlist
        on_publish: /usr/local/bin/generate-master-playlist.sh
```

**HLS Master Playlist Generation:**
```bash
#!/bin/bash
# generate-master-playlist.sh

STREAM_NAME=$1
HLS_PATH="/var/hls/live/$STREAM_NAME"

cat > "$HLS_PATH/master.m3u8" << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"  
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,CODECS="avc1.64001e,mp4a.40.2"
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360,CODECS="avc1.64001e,mp4a.40.2"
360p.m3u8
EOF
```

**Enhanced Video Player:**
```tsx
export function AdaptiveStreamPlayer({ streamId, streamUrl }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<Quality[]>([]);
  const [bandwidthEstimate, setBandwidthEstimate] = useState<number>(0);

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        abrEwmaFastLive: 3.0,
        abrEwmaSlowLive: 9.0,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      // Quality level management
      hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
        const qualities = data.levels.map((level, index) => ({
          id: index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: `${level.height}p`
        }));
        
        setAvailableQualities([
          { id: -1, label: 'Auto', bitrate: 0, height: 0, width: 0 },
          ...qualities
        ]);
      });

      // Bandwidth monitoring
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        setBandwidthEstimate(level.bitrate);
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }
  }, [streamUrl]);

  const switchQuality = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId === -1 ? 'auto' : `${qualityId}`);
    }
  };

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        muted
        playsInline
      />
      
      {/* Quality selector */}
      <div className="absolute bottom-16 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              {currentQuality === 'auto' ? 'Auto' : `${availableQualities.find(q => q.id.toString() === currentQuality)?.label}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableQualities.map(quality => (
              <DropdownMenuItem 
                key={quality.id}
                onClick={() => switchQuality(quality.id)}
                className={currentQuality === quality.id.toString() || (currentQuality === 'auto' && quality.id === -1) ? 'bg-accent' : ''}
              >
                {quality.label}
                {quality.bitrate > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {Math.round(quality.bitrate / 1000)}k
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Network info */}
      {bandwidthEstimate > 0 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {Math.round(bandwidthEstimate / 1000)}k
        </div>
      )}
    </div>
  );
}
```

#### **Stream Health Monitoring**

**Real-time Health Metrics:**
```go
type StreamHealth struct {
    StreamID      string    `json:"stream_id"`
    Bitrate       int       `json:"bitrate"`        // Current bitrate
    FrameRate     float64   `json:"frame_rate"`     // Current fps
    PacketLoss    float64   `json:"packet_loss"`    // Percentage
    BufferHealth  float64   `json:"buffer_health"`  // Percentage
    AudioLevel    float64   `json:"audio_level"`    // dB
    IsHealthy     bool      `json:"is_healthy"`
    Issues        []string  `json:"issues"`
    LastCheck     time.Time `json:"last_check"`
    UptimeSeconds int64     `json:"uptime_seconds"`
}

func (s *StreamService) MonitorStreamHealth(streamID string) (*StreamHealth, error) {
    // Get RTMP connection metrics
    rtmpStats, err := s.getRTMPStats(streamID)
    if err != nil {
        return nil, err
    }
    
    // Analyze HLS segment generation
    hlsHealth, err := s.checkHLSGeneration(streamID)  
    if err != nil {
        return nil, err
    }
    
    // Calculate overall health
    health := &StreamHealth{
        StreamID:     streamID,
        Bitrate:      rtmpStats.Bitrate,
        FrameRate:    rtmpStats.FrameRate,
        PacketLoss:   rtmpStats.PacketLoss,
        BufferHealth: hlsHealth.BufferHealth,
        AudioLevel:   rtmpStats.AudioLevel,
        LastCheck:    time.Now(),
        UptimeSeconds: rtmpStats.UptimeSeconds,
    }
    
    // Determine health status and issues
    health.IsHealthy = s.calculateHealthStatus(health)
    health.Issues = s.identifyIssues(health)
    
    return health, nil
}
```

**Health Dashboard UI:**
```tsx
export function StreamHealthDashboard({ streamId }: { streamId: string }) {
  const { data: health } = useStreamHealth(streamId);
  
  if (!health) return <div>Loading health data...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Stream Health</span>
          <Badge variant={health.isHealthy ? "success" : "destructive"}>
            {health.isHealthy ? "Healthy" : "Issues Detected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Bitrate</div>
            <div className="text-2xl font-semibold">
              {Math.round(health.bitrate / 1000)}k
            </div>
            <Progress value={Math.min((health.bitrate / 5000000) * 100, 100)} />
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Frame Rate</div>
            <div className="text-2xl font-semibold">
              {health.frameRate.toFixed(1)} fps
            </div>
            <Progress value={Math.min((health.frameRate / 30) * 100, 100)} />
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Packet Loss</div>
            <div className="text-2xl font-semibold">
              {health.packetLoss.toFixed(2)}%
            </div>
            <Progress 
              value={health.packetLoss} 
              className={health.packetLoss > 5 ? "text-destructive" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Buffer Health</div>
            <div className="text-2xl font-semibold">
              {health.bufferHealth.toFixed(0)}%
            </div>
            <Progress value={health.bufferHealth} />
          </div>
        </div>
        
        {health.issues.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Issues Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {health.issues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

### Phase 3: Analytics & Metrics (Months 3-4)

#### **Advanced Analytics System**

**Service Events for Automated Metrics (Kind: 31337):**
```json
{
  "kind": 31337,
  "pubkey": "wavlake-service-pubkey",
  "content": JSON.stringify({
    "stream_metrics": {
      "current_viewers": 156,
      "total_viewers": 892,
      "peak_viewers": 234,
      "chat_messages": 1247,
      "avg_watch_time": 423,
      "stream_health": "healthy",
      "bitrate": 2500,
      "quality_distribution": {
        "1080p": 45,
        "720p": 78,  
        "480p": 23,
        "360p": 10
      },
      "geographic_distribution": {
        "US": 89,
        "CA": 23,
        "GB": 18,
        "DE": 12,
        "FR": 8,
        "Other": 6
      }
    }
  }),
  "tags": [
    ["a", `30311:${streamerPubkey}:${streamId}`],
    ["service", "wavlake"],
    ["type", "metrics"],
    ["interval", "30"] // Update every 30 seconds
  ],
  "created_at": Math.floor(Date.now() / 1000)
}
```

**Advanced Analytics Dashboard:**
```tsx
export function StreamAnalyticsDashboard({ streamId }: { streamId: string }) {
  const { data: analytics } = useStreamAnalytics(streamId);
  const { data: realtimeMetrics } = useRealtimeMetrics(streamId);
  
  return (
    <div className="space-y-6">
      {/* Real-time overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Live Viewers"
          value={realtimeMetrics?.currentViewers || 0}
          change="+12"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Views"
          value={analytics?.totalViewers || 0}
          change="+156"
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          title="Peak Concurrent"
          value={analytics?.peakViewers || 0}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Chat Messages"
          value={analytics?.chatMessages || 0}
          change="+45"
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </div>

      {/* Viewer timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Viewer Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Line 
                type="monotone" 
                dataKey="viewers" 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={Object.entries(realtimeMetrics?.qualityDistribution || {}).map(([quality, viewers]) => ({
                    name: quality,
                    value: viewers
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(realtimeMetrics?.geographicDistribution || {}).map(([country, viewers]) => (
                <div key={country} className="flex justify-between items-center">
                  <span>{country}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ 
                          width: `${(viewers / realtimeMetrics.currentViewers) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {viewers}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {Math.round(analytics?.averageViewTime || 0 / 60)} min
              </div>
              <div className="text-sm text-muted-foreground">Avg Watch Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {(analytics?.chatEngagement || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Chat Participation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {Math.round((analytics?.peakViewers || 0) / (analytics?.totalViewers || 1) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Peak Concurrency</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 4: Monetization & Revenue Features (Months 4-5)

#### **Lightning Integration for Stream Payments**

**Paid Stream Access:**
```json
{
  "kind": 30311,
  "tags": [
    ["d", "premium-concert"],
    ["title", "Premium Live Concert"],
    ["payment_required", "1000"], // sats
    ["payment_methods", "lightning", "bitcoin"],
    ["price_tiers", "basic:1000", "premium:2500", "vip:5000"],
    ["streaming", "https://paid.wavlake.com/verify/{stream-id}.m3u8"]
  ]
}
```

**Payment Verification Flow:**
```tsx
export function useStreamPayment(streamId: string, priceInSats: number) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  
  const requestAccess = useMutation({
    mutationFn: async () => {
      // Generate Lightning invoice
      const { invoice, paymentHash } = await generateStreamInvoice({
        streamId,
        amount: priceInSats,
        description: `Access to stream ${streamId}`
      });
      
      // Show payment modal
      const paid = await showLightningPayment(invoice);
      
      if (paid) {
        // Verify payment and get access token
        const { accessToken, streamUrl } = await verifyPayment(paymentHash);
        setPaymentStatus('paid');
        return { accessToken, streamUrl };
      } else {
        setPaymentStatus('failed');
        throw new Error('Payment failed');
      }
    }
  });
  
  return { paymentStatus, requestAccess: requestAccess.mutate };
}
```

**Super Chat/Boosts Implementation:**
```tsx
export function SuperChatInput({ streamId }: { streamId: string }) {
  const [amount, setAmount] = useState<number>(100);
  const [message, setMessage] = useState<string>('');
  
  const sendSuperChat = useMutation({
    mutationFn: async ({ amount, message }: { amount: number; message: string }) => {
      // Generate invoice for super chat
      const { invoice, paymentHash } = await generateSuperChatInvoice({
        streamId,
        amount,
        message
      });
      
      // Process payment
      const paid = await processLightningPayment(invoice);
      
      if (paid) {
        // Publish enhanced chat event with payment proof
        await publishEvent({
          kind: 1311,
          content: message,
          tags: [
            ['a', `30311:${streamId}`, '', 'root'],
            ['boost', amount.toString()],
            ['payment_hash', paymentHash],
            ['super_chat', 'true']
          ]
        });
      }
    }
  });
  
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Send Super Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-2">
          <Label htmlFor="amount">Amount (sats)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={10}
            step={10}
            className="w-24"
          />
        </div>
        <Textarea
          placeholder="Your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
        />
        <Button 
          onClick={() => sendSuperChat.mutate({ amount, message })}
          disabled={!message || amount < 10}
          className="w-full bg-yellow-500 hover:bg-yellow-600"
        >
          <Zap className="h-4 w-4 mr-2" />
          Send {amount} sats
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Phase 5: Mobile & Advanced UI (Months 5-6)

#### **Advanced Mobile Features**

**Picture-in-Picture Support:**
```tsx
export function usePictureInPicture(videoRef: RefObject<HTMLVideoElement>) {
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  
  useEffect(() => {
    setIsPiPSupported('pictureInPictureEnabled' in document);
  }, []);
  
  const enterPiP = async () => {
    if (videoRef.current && !document.pictureInPictureElement) {
      try {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      } catch (error) {
        console.error('Failed to enter PiP mode:', error);
      }
    }
  };
  
  const exitPiP = async () => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } catch (error) {
        console.error('Failed to exit PiP mode:', error);
      }
    }
  };
  
  return { isPiPSupported, isPiPActive, enterPiP, exitPiP };
}
```

**Mobile Chat Drawer:**
```tsx
export function MobileChatDrawer({ streamId }: { streamId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage } = useLiveChat(streamId);
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="secondary" 
          size="sm"
          className="fixed bottom-4 right-4 rounded-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
          {messages.length > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs">
              {messages.length > 99 ? '99+' : messages.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Live Chat</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full mt-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-2">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-4 pt-4 border-t">
            <ChatInput 
              onSend={sendMessage}
              placeholder="Type your message..."
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Phase 6: Recording & VOD (Months 6+)

#### **Automated Recording System**

**Recording Configuration:**
```json
{
  "kind": 30311,
  "tags": [
    ["d", "recorded-session"],
    ["title", "Guitar Tutorial"],
    ["recording", "enabled"],
    ["record_quality", "1080p"],
    ["auto_publish", "true"],
    ["chapters", "enabled"]
  ]
}
```

**Recording Backend:**
```go
type RecordingService struct {
    ffmpegPath    string
    storagePath   string
    cdnUploader   *CDNUploader
}

func (r *RecordingService) StartRecording(streamID string, config RecordingConfig) error {
    outputPath := fmt.Sprintf("%s/%s.mp4", r.storagePath, streamID)
    
    cmd := exec.Command(r.ffmpegPath,
        "-i", fmt.Sprintf("rtmp://localhost/live/%s", streamID),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart", // Web optimization
        outputPath,
    )
    
    if err := cmd.Start(); err != nil {
        return fmt.Errorf("failed to start recording: %w", err)
    }
    
    // Track recording process
    r.recordings[streamID] = &RecordingProcess{
        Cmd:       cmd,
        StartTime: time.Now(),
        OutputPath: outputPath,
    }
    
    return nil
}

func (r *RecordingService) StopRecording(streamID string) (*RecordedStream, error) {
    recording, exists := r.recordings[streamID]
    if !exists {
        return nil, errors.New("no active recording found")
    }
    
    // Stop recording
    if err := recording.Cmd.Process.Signal(syscall.SIGTERM); err != nil {
        return nil, fmt.Errorf("failed to stop recording: %w", err)
    }
    
    // Wait for process to finish
    recording.Cmd.Wait()
    
    // Upload to CDN
    vodURL, err := r.cdnUploader.Upload(recording.OutputPath)
    if err != nil {
        return nil, fmt.Errorf("failed to upload recording: %w", err)
    }
    
    return &RecordedStream{
        StreamID:  streamID,
        VODURL:    vodURL,
        Duration:  time.Since(recording.StartTime),
        FileSize:  getFileSize(recording.OutputPath),
    }, nil
}
```

## 🚀 Implementation Strategy

### **Prioritization Framework**
1. **User Impact**: How many users benefit from this feature?
2. **Technical Complexity**: Implementation difficulty and time required
3. **Revenue Potential**: Does it enable monetization or increase engagement?
4. **Competitive Advantage**: Does it differentiate Wavlake in the market?

### **Success Metrics by Phase**

**Phase 1 (Private Streams)**:
- 50% of streamers use private streaming features
- 0 unauthorized access incidents
- <200ms additional latency for private streams

**Phase 2 (Quality/Reliability)**:
- 99.5% stream uptime
- <3s average startup time across all qualities
- 95% of streams maintain stable quality

**Phase 3 (Analytics)**:
- 80% of streamers check analytics weekly
- 10x increase in data granularity
- Real-time updates within 30 seconds

**Phase 4 (Monetization)**:
- 25% of streamers enable paid features
- $10k+ monthly payment volume
- <1% payment failure rate

**Phase 5 (Mobile)**:
- 60% mobile usage for viewing
- 4.5+ mobile app store rating
- 30% mobile streaming adoption

**Phase 6 (Recording)**:
- 70% of streams automatically recorded
- 50% of recordings viewed post-stream
- 99% recording success rate

This comprehensive enhancement plan transforms the basic MVP into a full-featured, competitive live streaming platform while maintaining the core Nostr principles of decentralization and user sovereignty.