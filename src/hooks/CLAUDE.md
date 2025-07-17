# Wavlake Hooks Documentation

## Overview

This directory contains the **comprehensive custom hooks system** for Wavlake, a Nostr-based music platform. The hooks implement patterns for Nostr protocol integration, authentication, data fetching, and state management. They provide a clean abstraction layer between React components and the underlying Nostr and legacy API systems.

## 🏗️ Architecture Overview

### Hook Categories
The hooks are organized into several categories:
- **Core Nostr Hooks**: Direct Nostr protocol integration (`useCurrentUser`, `useNostr`, `useNostrPublish`)
- **Authentication System**: Sophisticated state machine-based auth flows (`/auth` directory)
- **Legacy API Integration**: Dual authentication with Firebase and Nostr (`useLegacyApi`)
- **Data Fetching**: Nostr event queries with caching (`useAuthor`, `useGroup`)
- **Cashu Integration**: Bitcoin ecash wallet management (`useCashuWallet`)
- **UI & Utilities**: Toast notifications, file uploads, and utility functions

```
🎯 React Components → 🔄 Custom Hooks → 📡 Nostr/APIs → 💾 TanStack Query Cache
```

## 📁 Directory Structure

```
/src/hooks/
├── auth/                           # Authentication system (see auth/CLAUDE.md)
│   ├── flows/                     # Flow orchestration hooks
│   ├── machines/                  # State machine implementations  
│   ├── utils/                     # Auth utilities and helpers
│   └── CLAUDE.md                  # Detailed auth documentation
├── Core Nostr Hooks
│   ├── useCurrentUser.ts          ✅ Current user and authentication state
│   ├── useNostr.ts                ✅ Re-export from @nostrify/react
│   ├── useNostrPublish.ts         ✅ Event publishing with auto-invalidation
│   ├── useAuthor.ts               ✅ User profile metadata fetching
│   └── useGroup.ts                ✅ Community/group data fetching
├── Legacy API Integration  
│   ├── useLegacyApi.ts            ✅ Dual auth API integration
│   ├── useLegacyProfile.ts        ✅ Legacy user profile data
│   └── useAccountLinkingStatus.ts ✅ Firebase/Nostr linking status
├── Data Fetching & State
│   ├── useFollowList.ts           ✅ Nostr follow relationships
│   ├── useLikes.ts                ✅ Reaction/like management
│   ├── useReplies.ts              ✅ Comment/reply fetching
│   ├── useNotifications.ts        ✅ User notifications
│   └── usePinnedGroups.ts         ✅ User's pinned communities
├── Group/Community Management
│   ├── useGroupMembership.ts      ✅ Community membership status
│   ├── useGroupModeration.ts      ✅ Moderation actions and reports
│   ├── useApprovedMembers.ts      ✅ Community member management
│   ├── useBannedUsers.ts          ✅ Community ban management
│   └── useGroupStats.ts           ✅ Community statistics
├── Music & Content
│   ├── useMusicPublish.ts         ✅ Music track publishing
│   ├── useUploadFile.ts           ✅ File uploads with Blossom
│   ├── useUploadAudio.ts          ✅ Audio file handling
│   └── useArtistAlbums.ts         ✅ Artist album management
├── Cashu/Bitcoin Integration
│   ├── useCashuWallet.ts          ✅ Cashu ecash wallet management
│   ├── useNutzaps.ts              ✅ Bitcoin zap sending/receiving
│   ├── useSendNutzap.ts           ✅ Send Bitcoin payments
│   └── useBitcoinPrice.ts         ✅ Bitcoin price fetching
├── UI & Utilities
│   ├── useToast.ts                ✅ Toast notification system
│   ├── useTheme.ts                ✅ Theme management
│   ├── useIsMobile.tsx            ✅ Mobile detection
│   └── usePWA.ts                  ✅ Progressive Web App features
└── Specialized Hooks
    ├── useExtractUrls.ts          ✅ URL extraction from content
    ├── useMarkdown.ts             ✅ Markdown rendering
    └── useSystemTheme.ts          ✅ System theme detection
```

## 🎯 Core Nostr Hooks

### `useCurrentUser()`
Central hook for managing the current authenticated user and authentication state.

```tsx
import { useCurrentUser } from '@/hooks/useCurrentUser';

function UserProfile() {
  const { 
    user,                    // Current NUser object
    metadata,               // User profile metadata
    isAuthenticated,        // Authentication status
    logout,                 // Logout function
    loginWithNsec,          // Login with secret key
    loginWithExtension,     // Login with browser extension
    loginWithBunker         // Login with NIP-46 bunker
  } = useCurrentUser();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <img src={metadata?.picture} alt={metadata?.display_name} />
      <h1>{metadata?.display_name || user.pubkey.slice(0, 8)}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Key Features:**
- **Multi-Login Support**: Extension, nsec, and bunker authentication methods
- **Profile Integration**: Automatic metadata fetching with `useAuthor`
- **Dual Logout**: Logs out both Nostr and Firebase sessions
- **Error Handling**: Graceful handling of invalid login attempts

### `useNostrPublish()`
Sophisticated event publishing hook with automatic query invalidation.

```tsx
import { useNostrPublish } from '@/hooks/useNostrPublish';

function CreatePost() {
  const { mutate: publishEvent, isPending } = useNostrPublish({
    invalidateQueries: [
      { queryKey: ['posts', communityId] },
      { queryKey: ['user-posts', user.pubkey] }
    ],
    onSuccessCallback: () => {
      navigate('/posts');
    }
  });

  const handleSubmit = () => {
    publishEvent({
      kind: 9802, // Group post
      content: postContent,
      tags: [
        ['a', `34550:${pubkey}:${communityId}`],
        ['client', 'wavlake']
      ]
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={postContent} onChange={setPostContent} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Publishing...' : 'Publish Post'}
      </button>
    </form>
  );
}
```

**Auto-Invalidation Features:**
- **Smart Query Invalidation**: Automatically invalidates relevant queries based on event kind
- **Community Awareness**: Handles community-scoped invalidations
- **Batch Processing**: Prevents cascade re-renders with batched invalidations
- **Event Tagging**: Automatically adds client and expiration tags

### `useAuthor(pubkey)`
Fetches and caches user profile metadata (kind 0 events).

```tsx
import { useAuthor } from '@/hooks/useAuthor';

function UserCard({ pubkey }: { pubkey: string }) {
  const { data: author, isLoading, error } = useAuthor(pubkey);
  
  if (isLoading) return <Skeleton />;
  if (error) return <div>Profile not found</div>;

  const { metadata, event } = author || {};
  const displayName = metadata?.display_name || metadata?.name || pubkey.slice(0, 8);
  
  return (
    <div className="user-card">
      <img src={metadata?.picture} alt={displayName} />
      <h3>{displayName}</h3>
      <p>{metadata?.about}</p>
    </div>
  );
}
```

**Features:**
- **Metadata Parsing**: Safe JSON parsing with fallback to raw event
- **Caching**: TanStack Query caching with 3 retry attempts
- **Timeout Protection**: 1.5 second timeout for responsive UI
- **Error Boundaries**: Graceful handling of missing or invalid profiles

### `useGroup(groupId)`
Fetches community/group data using Nostr replaceable events.

```tsx
import { useGroup } from '@/hooks/useGroup';

function CommunityHeader({ groupId }: { groupId: string }) {
  const { data: group, isLoading, error } = useGroup(groupId);
  
  if (isLoading) return <HeaderSkeleton />;
  if (error) return <div>Community not found</div>;

  const groupData = JSON.parse(group.content);
  
  return (
    <header>
      <img src={groupData.picture} alt={groupData.name} />
      <h1>{groupData.name}</h1>
      <p>{groupData.about}</p>
    </header>
  );
}
```

**Features:**
- **Address Parsing**: Handles NIP-19 `naddr` address parsing
- **Replaceable Events**: Queries kind 34550 community definition events
- **Content Parsing**: Safe JSON parsing of community metadata
- **Error Handling**: Comprehensive error handling for invalid addresses

## 🔗 Legacy API Integration

### `useLegacyApi()`
Implements dual authentication system for legacy Wavlake API integration.

```tsx
// Exported hooks from useLegacyApi.ts:
import { 
  useLegacyMetadata,      // Complete user metadata
  useLegacyTracks,        // User's music tracks
  useLegacyArtists,       // User's artist profiles
  useLegacyAlbums,        // User's albums
  useLegacyArtistTracks,  // Tracks for specific artist
  useLegacyAlbumTracks    // Tracks for specific album
} from '@/hooks/useLegacyApi';

function ArtistDashboard() {
  const { data: metadata, isLoading: metadataLoading } = useLegacyMetadata();
  const { data: tracks, isLoading: tracksLoading } = useLegacyTracks();
  const { data: artists } = useLegacyArtists();
  
  if (metadataLoading || tracksLoading) return <Loading />;
  
  return (
    <div>
      <UserProfile user={metadata?.user} />
      <TrackList tracks={tracks?.tracks} />
      <ArtistList artists={artists?.artists} />
    </div>
  );
}
```

**Dual Authentication Logic:**
```typescript
// Automatic auth method selection
async function fetchLegacyApi<T>(endpoint: string, signer: unknown, getAuthToken?: () => Promise<string | null>): Promise<T> {
  let authHeader: string;
  
  // 1. Try Firebase auth token first (preferred)
  if (getAuthToken) {
    try {
      const firebaseToken = await getAuthToken();
      if (firebaseToken) {
        authHeader = `Bearer ${firebaseToken}`;
      } else {
        throw new Error("Firebase token not available");
      }
    } catch (error) {
      // 2. Fall back to NIP-98 if Firebase auth fails
      authHeader = await createNip98AuthHeader(url, method, {}, signer);
    }
  } else {
    // 3. No Firebase auth available, use NIP-98
    authHeader = await createNip98AuthHeader(url, method, {}, signer);
  }
  
  return fetch(url, { headers: { Authorization: authHeader } }).then(res => res.json());
}
```

**Features:**
- **Authentication Priority**: Firebase tokens preferred, NIP-98 fallback
- **Comprehensive Data**: User profiles, tracks, albums, and artist information
- **Caching Strategy**: 5-minute cache with background refetching
- **Error Recovery**: Graceful fallback between authentication methods

### `useAccountLinkingStatus()`
Monitors Firebase and Nostr account linking status.

```tsx
import { useAccountLinkingStatus } from '@/hooks/useAccountLinkingStatus';

function AccountStatus() {
  const { isLinked, isLoading, linkingData } = useAccountLinkingStatus();
  
  if (isLoading) return <StatusSkeleton />;
  
  return (
    <div className="account-status">
      <Status 
        linked={isLinked} 
        firebase={linkingData?.firebase}
        nostr={linkingData?.nostr}
      />
      {!isLinked && <LinkAccountButton />}
    </div>
  );
}
```

## 🪙 Cashu Integration

### `useCashuWallet()`
Comprehensive Bitcoin ecash wallet management using NIP-60.

```tsx
import { useCashuWallet } from '@/hooks/useCashuWallet';

function WalletDashboard() {
  const { 
    wallet,           // Wallet configuration
    tokens,           // Token events array
    isLoading,        // Loading state
    createWallet,     // Create/update wallet
    updateProofs     // Update proof state
  } = useCashuWallet();

  const handleCreateWallet = () => {
    createWallet({
      privkey: generatePrivateKey(),
      mints: ['https://mint.minibits.cash/Bitcoin']
    });
  };

  if (!wallet) {
    return <button onClick={handleCreateWallet}>Create Wallet</button>;
  }

  return (
    <div className="wallet-dashboard">
      <WalletBalance tokens={tokens} />
      <MintList mints={wallet.mints} />
      <TokenHistory tokens={tokens} />
    </div>
  );
}
```

**Key Features:**
- **NIP-60 Compliance**: Full NIP-60 implementation for Cashu wallets
- **Encrypted Storage**: NIP-44 encryption for wallet data
- **Multi-Mint Support**: Support for multiple Cashu mints
- **Proof Management**: Comprehensive proof state management
- **Auto-Activation**: Automatic mint activation and key fetching

### `useNutzaps()` and `useSendNutzap()`
Bitcoin lightning payments integrated with Nostr events.

```tsx
import { useSendNutzap } from '@/hooks/useSendNutzap';
import { useNutzaps } from '@/hooks/useNutzaps';

function PostActions({ eventId }: { eventId: string }) {
  const { data: nutzaps } = useNutzaps(eventId);
  const { mutate: sendNutzap, isPending } = useSendNutzap();

  const handleZap = () => {
    sendNutzap({
      amount: 1000, // 1000 sats
      recipientPubkey: authorPubkey,
      eventId: eventId,
      comment: "Great post!"
    });
  };

  const totalSats = nutzaps?.reduce((sum, zap) => sum + zap.amount, 0) || 0;

  return (
    <div className="post-actions">
      <button onClick={handleZap} disabled={isPending}>
        ⚡ Zap {totalSats > 0 && `(${totalSats} sats)`}
      </button>
    </div>
  );
}
```

## 🎵 Music & Content Hooks

### `useMusicPublish()`
Specialized hook for publishing music tracks with metadata.

```tsx
import { useMusicPublish } from '@/hooks/useMusicPublish';

function UploadTrack() {
  const { mutate: publishTrack, isPending } = useMusicPublish();

  const handlePublish = async () => {
    const audioTags = await uploadAudio(audioFile);
    
    publishTrack({
      title: "My Song",
      audioUrl: audioTags[0][1], // URL from upload
      duration: 180,
      genre: "Electronic",
      tags: ["music", "electronic"]
    });
  };

  return (
    <form onSubmit={handlePublish}>
      <input type="file" accept="audio/*" onChange={setAudioFile} />
      <input value={title} onChange={setTitle} placeholder="Track title" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Publishing...' : 'Publish Track'}
      </button>
    </form>
  );
}
```

### `useUploadFile()`
NIP-94 compatible file uploads using Blossom protocol.

```tsx
import { useUploadFile } from '@/hooks/useUploadFile';

function FileUploader() {
  const { mutateAsync: uploadFile } = useUploadFile();

  const handleUpload = async (file: File) => {
    try {
      const tags = await uploadFile(file);
      const [[_, url], [__, mimeType]] = tags;
      
      // Use the uploaded file
      console.log(`Uploaded ${mimeType} file: ${url}`);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <input 
      type="file" 
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  );
}
```

**Features:**
- **Blossom Integration**: Uses Blossom servers for decentralized file storage
- **Mime Type Correction**: Fixes mime type issues for audio files
- **Authentication**: Automatic authentication using current user's signer
- **Progress Tracking**: Upload progress and error handling

## 🏘️ Group Management Hooks

### `useGroupMembership()` and `useGroupModeration()`
Comprehensive community management functionality.

```tsx
import { useGroupMembership } from '@/hooks/useGroupMembership';
import { useGroupModeration } from '@/hooks/useGroupModeration';

function CommunityManagement({ communityId }: { communityId: string }) {
  const { data: membership } = useGroupMembership(communityId);
  const { 
    approveMember, 
    banUser, 
    removePost,
    isPending 
  } = useGroupModeration(communityId);

  if (membership?.role !== 'owner') {
    return <div>Insufficient permissions</div>;
  }

  return (
    <div className="moderation-panel">
      <MemberList 
        members={membership.members}
        onApprove={approveMember}
        onBan={banUser}
      />
      <PendingPosts 
        onApprove={approvePost}
        onRemove={removePost}
      />
    </div>
  );
}
```

### Group-Related Hooks
- **`useApprovedMembers()`**: Community member lists and approval status
- **`useBannedUsers()`**: Banned user management and enforcement
- **`useGroupStats()`**: Community statistics and metrics
- **`usePendingJoinRequests()`**: Join request management
- **`useReportActions()`**: Content moderation and reporting

## 🎨 UI & Utility Hooks

### `useToast()`
Centralized toast notification system with queue management.

```tsx
import { useToast } from '@/hooks/useToast';

function ActionButton() {
  const { toast } = useToast();

  const handleAction = async () => {
    try {
      await performAction();
      toast({
        title: "Success",
        description: "Action completed successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Action failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return <button onClick={handleAction}>Perform Action</button>;
}
```

**Features:**
- **Queue Management**: Single toast limit with automatic replacement
- **Variant Support**: Success, error, warning, and info variants
- **Auto-Dismiss**: Configurable auto-dismiss timing
- **Action Support**: Optional action buttons in toasts

### `useTheme()` and `useSystemTheme()`
Theme management with system preference detection.

```tsx
import { useTheme } from '@/hooks/useTheme';
import { useSystemTheme } from '@/hooks/useSystemTheme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const systemTheme = useSystemTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '☀️' : '🌙'} 
      {theme} (system: {systemTheme})
    </button>
  );
}
```

### `useIsMobile()`
Responsive design hook for mobile detection.

```tsx
import { useIsMobile } from '@/hooks/useIsMobile';

function ResponsiveComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {isMobile ? <MobileNav /> : <DesktopNav />}
      <MainContent />
    </div>
  );
}
```

## 🔧 Data Fetching Patterns

### TanStack Query Integration
All data fetching hooks use TanStack Query for caching and state management.

```tsx
// Standard pattern for Nostr event queries
export function useExample(param: string) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['example', param],
    queryFn: async ({ signal }) => {
      const events = await nostr.query([{
        kinds: [KINDS.EXAMPLE],
        limit: 20
      }], { 
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) 
      });
      
      return events;
    },
    enabled: !!param,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
```

### Error Handling Pattern
```tsx
// Consistent error handling across hooks
export function useDataWithErrorHandling() {
  return useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      try {
        return await fetchData();
      } catch (error) {
        console.error('Data fetch failed:', error);
        throw new Error('Failed to fetch data. Please try again.');
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('auth')) return false;
      return failureCount < 3;
    },
  });
}
```

### Mutation Pattern
```tsx
// Standard mutation pattern with optimistic updates
export function useUpdateData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateData) => {
      return await updateDataAPI(data);
    },
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['data'] });
      const previousData = queryClient.getQueryData(['data']);
      queryClient.setQueryData(['data'], newData);
      return { previousData };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(['data'], context?.previousData);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['data'] });
    },
  });
}
```

## 🎯 Advanced Patterns

### Event Aggregation
```tsx
// Aggregating multiple event types for complex views
export function useActivityFeed(pubkey: string) {
  const { nostr } = useNostr();
  
  return useQuery({
    queryKey: ['activity-feed', pubkey],
    queryFn: async ({ signal }) => {
      const [posts, reactions, replies] = await Promise.all([
        nostr.query([{ kinds: [KINDS.GROUP_POST], authors: [pubkey] }], { signal }),
        nostr.query([{ kinds: [KINDS.REACTION], authors: [pubkey] }], { signal }),
        nostr.query([{ kinds: [KINDS.GROUP_POST_REPLY], authors: [pubkey] }], { signal }),
      ]);
      
      // Combine and sort by timestamp
      const allEvents = [...posts, ...reactions, ...replies]
        .sort((a, b) => b.created_at - a.created_at);
      
      return allEvents;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time feel
  });
}
```

### Infinite Queries
```tsx
// Infinite scrolling for large datasets
export function useInfinitePosts(communityId: string) {
  const { nostr } = useNostr();
  
  return useInfiniteQuery({
    queryKey: ['posts', communityId],
    queryFn: async ({ pageParam, signal }) => {
      const filter = {
        kinds: [KINDS.GROUP_POST],
        '#a': [`34550:${pubkey}:${communityId}`],
        limit: 20,
      };
      
      if (pageParam) {
        filter.until = pageParam;
      }
      
      const events = await nostr.query([filter], { signal });
      return events;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
  });
}
```

### Real-time Subscriptions
```tsx
// Real-time event subscriptions
export function useRealtimeNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!user) return;
    
    const subscription = nostr.req([{
      kinds: [KINDS.NOTIFICATION],
      '#p': [user.pubkey],
      since: Math.floor(Date.now() / 1000) - 60, // Last minute
    }]);
    
    subscription.on('event', (event) => {
      // Add to notifications cache
      queryClient.setQueryData(['notifications', user.pubkey], (old: any[]) => 
        [event, ...(old || [])].slice(0, 100) // Keep last 100
      );
    });
    
    return () => subscription.close();
  }, [user?.pubkey, nostr, queryClient]);
}
```

## 🛡️ Security Considerations

### Authentication Security
```tsx
// Secure authentication pattern
export function useSecureAction() {
  const { user } = useCurrentUser();
  
  const performSecureAction = async (data: ActionData) => {
    if (!user?.signer) {
      throw new Error('Authentication required');
    }
    
    // Verify user has permission
    const hasPermission = await checkPermission(user.pubkey, data.action);
    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }
    
    // Sign and submit action
    const event = await user.signer.signEvent({
      kind: KINDS.SECURE_ACTION,
      content: JSON.stringify(data),
      tags: [['action', data.action]],
      created_at: Math.floor(Date.now() / 1000),
    });
    
    return await submitAction(event);
  };
  
  return { performSecureAction };
}
```

### Data Validation
```tsx
// Input validation and sanitization
export function useValidatedInput<T>(schema: z.ZodSchema<T>) {
  return useMutation({
    mutationFn: async (input: unknown) => {
      // Validate input
      const validatedData = schema.parse(input);
      
      // Sanitize content
      const sanitizedData = sanitizeContent(validatedData);
      
      return await processInput(sanitizedData);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid input data');
      }
      throw error;
    },
  });
}
```

## 📊 Performance Optimization

### Query Optimization
```tsx
// Selective query enabling and background refetching
export function useOptimizedData(condition: boolean) {
  return useQuery({
    queryKey: ['optimized-data'],
    queryFn: fetchData,
    enabled: condition, // Only fetch when needed
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false,
    retry: false, // Prevent retry storms
  });
}
```

### Memory Management
```tsx
// Cleanup subscriptions and prevent memory leaks
export function useMemoryEfficientSubscription() {
  const { nostr } = useNostr();
  
  useEffect(() => {
    const abortController = new AbortController();
    
    const subscription = nostr.req([{
      kinds: [KINDS.EXAMPLE],
      limit: 10,
    }], { signal: abortController.signal });
    
    return () => {
      abortController.abort();
      subscription.close();
    };
  }, [nostr]);
}
```

## 🚀 Development Guidelines

### Hook Creation Standards

#### New Hook Checklist
- [ ] Uses TanStack Query for data fetching and caching
- [ ] Implements proper error handling and retry logic
- [ ] Includes TypeScript interfaces for all data types
- [ ] Uses AbortSignal.timeout() for request timeouts
- [ ] Follows consistent naming conventions
- [ ] Includes JSDoc comments for complex logic
- [ ] Implements proper loading and error states
- [ ] Uses appropriate staleTime and cache invalidation

#### Testing Strategies
```tsx
// Mock Nostr queries for testing
jest.mock('@nostrify/react', () => ({
  useNostr: () => ({
    nostr: {
      query: jest.fn().mockResolvedValue([mockEvent]),
      event: jest.fn().mockResolvedValue(undefined),
    }
  })
}));

describe('useAuthor', () => {
  it('should fetch and parse author metadata', async () => {
    const { result } = renderHook(() => useAuthor('pubkey123'));
    
    await waitFor(() => {
      expect(result.current.data?.metadata?.name).toBe('Test User');
    });
  });
});
```

### Performance Best Practices

#### Query Key Strategy
```tsx
// Hierarchical query keys for efficient invalidation
const queryKeys = {
  all: ['posts'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: string) => [...queryKeys.lists(), { filters }] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
};
```

#### Batch Operations
```tsx
// Batch multiple operations to prevent cascade updates
export function useBatchedUpdates() {
  const queryClient = useQueryClient();
  
  const batchUpdate = async (updates: Update[]) => {
    // Suspend all queries during batch
    queryClient.cancelQueries();
    
    // Apply all updates
    updates.forEach(update => {
      queryClient.setQueryData(update.queryKey, update.data);
    });
    
    // Trigger single re-render
    queryClient.resumePausedMutations();
  };
  
  return { batchUpdate };
}
```

## 📈 Current Implementation Status

### ✅ **Complete & Production Ready**
- **Core Nostr Integration**: Full Nostr protocol support with caching
- **Authentication System**: Sophisticated state machine-based auth flows
- **Legacy API Integration**: Dual authentication with Firebase fallback
- **Data Fetching**: Comprehensive Nostr event queries with TanStack Query
- **Cashu Integration**: Complete Bitcoin ecash wallet implementation
- **UI Utilities**: Toast notifications, theme management, responsive design
- **Music Features**: Track publishing and audio file management
- **Community Management**: Full group moderation and membership features

### 🎯 **Architecture Strengths**
- **Type Safety**: Comprehensive TypeScript implementation
- **Performance**: Optimized caching and query invalidation strategies
- **Error Handling**: Robust error boundaries and retry logic
- **Security**: Proper authentication and data validation
- **Scalability**: Efficient patterns for large-scale data fetching
- **Developer Experience**: Consistent APIs and clear documentation

### 🚧 **Enhancement Opportunities**
- **Real-time Features**: WebSocket subscriptions for live updates
- **Offline Support**: Service worker integration for offline functionality
- **Advanced Caching**: Redis-backed caching for server-side rendering
- **Performance Monitoring**: Detailed analytics and performance tracking

## 🏆 Conclusion

The Wavlake hooks system represents a **comprehensive, production-ready implementation** that successfully abstracts complex Nostr protocol interactions, authentication flows, and data management patterns into reusable, type-safe React hooks.

**Key Achievements:**
- **Protocol Integration**: Seamless Nostr protocol integration with modern React patterns
- **Authentication Excellence**: Sophisticated multi-method authentication with state machines
- **Data Management**: Intelligent caching and query optimization with TanStack Query
- **Bitcoin Integration**: Complete Cashu ecash wallet implementation
- **Developer Experience**: Consistent APIs and comprehensive TypeScript support

**Technical Excellence:**
- **Performance Optimization**: Efficient query patterns and memory management
- **Error Resilience**: Comprehensive error handling and recovery mechanisms
- **Security Focus**: Proper authentication and data validation throughout
- **Scalability**: Patterns that support growth and feature expansion

This hook system serves as a **reference implementation** for building modern, decentralized applications that require complex protocol integration, sophisticated state management, and excellent user experience while maintaining code quality and developer productivity.