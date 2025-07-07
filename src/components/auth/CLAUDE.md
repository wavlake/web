# Authentication Architecture

Wavlake uses a hybrid authentication system: **Nostr** for identity and **Firebase** for legacy business operations.

## Nostr Authentication

### Primary Authentication Methods

1. **Extension (NIP-07)**: Browser extensions like Alby, nos2x
   - Most secure - private keys never leave extension
   - Uses `window.nostr` interface

2. **Nsec**: Direct private key input
   - Fallback when extensions unavailable
   - Stored securely in browser storage

3. **Bunker (NIP-46)**: Remote signer
   - Signing from different devices/services
   - Uses nostr-tools bunker functionality

### Key Components

**NostrLoginProvider** (`NostrLoginProvider.tsx`)
- Manages session state and persistence
- Handles automatic reconnection
- Provides auth context throughout app

**LoginArea** (`LoginArea.tsx`)
- Single component for login/account switching
- Don't wrap in conditional logic
- Handles all login UI internally

### Usage

```tsx
// Check authentication
const { user } = useCurrentUser();
if (!user) return <span>Please log in</span>;

// Display login UI
import { LoginArea } from "@/components/auth/LoginArea";
<LoginArea />
```

## Firebase Integration

### Purpose
Firebase is **only for group owners** who need:
- Revenue analytics
- Advanced community management
- Payment system integration
- Legacy data access

**Note**: Moderators and regular users don't need Firebase.

### Implementation

**FirebaseOwnerGuard** (`FirebaseOwnerGuard.tsx`)
- Redirects to `/link-firebase` when needed
- Non-blocking for basic functionality
- Only enforces for owner features

### Account Linking Flow
1. User logs in with Nostr
2. System detects owner role
3. When accessing owner features → redirect to `/link-firebase`
4. One-time linking process
5. Association persists

## Authentication Flow

```
1. Nostr Login (Extension/Nsec/Bunker)
   ↓
2. Profile Sync & Cache
   ↓
3. Role Detection (listener/moderator/owner)
   ↓
4. Firebase Prompt (owners only, when needed)
   ↓
5. Full Feature Access
```

## Development Guidelines

### Do's
- Use `useCurrentUser()` for auth state
- Wrap owner features with `FirebaseOwnerGuard`
- Use NIP-98 for authenticated API requests
- Handle auth failures gracefully

### Don'ts
- Don't re-introduce Firebase to login flow
- Don't bypass auth guards
- Don't mix Firebase into Nostr login

## Security Notes

**Nostr Security**
- Private keys never exposed in code
- Extension signing = maximum security
- NIP-98 prevents request tampering
- Auto session timeout

**Firebase Security**  
- Minimal scope - business ops only
- Secure account linking
- Token-based with auto-refresh
- Separated from main auth flow