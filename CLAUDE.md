# Project Overview

This project is a Nostr client application built with React 18.x, TailwindCSS 3.x, Vite, shadcn/ui, and Nostrify.

## Technology Stack

- **React 18.x**: Stable version of React with hooks, concurrent rendering, and improved performance
- **TailwindCSS 3.x**: Utility-first CSS framework for styling
- **Vite**: Fast build tool and development server
- **shadcn/ui**: Unstyled, accessible UI components built with Radix UI and Tailwind
- **Nostrify**: Nostr protocol framework for Deno and web
- **React Router**: For client-side routing
- **TanStack Query**: For data fetching, caching, and state management
- **TypeScript**: For type-safe JavaScript development

## Project Structure

- `/src/components/`: UI components including NostrProvider for Nostr integration
- `/src/hooks/`: Custom hooks including `useNostr` and `useNostrQuery`
- `/src/pages/`: Page components used by React Router
- `/src/lib/`: Utility functions and shared logic
- `/public/`: Static assets

## UI Components

The project uses shadcn/ui components located in `@/components/ui`. These are unstyled, accessible components built with Radix UI and styled with Tailwind CSS. Available components include:

- **Accordion**: Vertically collapsing content panels
- **Alert**: Displays important messages to users
- **AlertDialog**: Modal dialog for critical actions requiring confirmation
- **AspectRatio**: Maintains consistent width-to-height ratio
- **Avatar**: User profile pictures with fallback support
- **Badge**: Small status descriptors for UI elements
- **Breadcrumb**: Navigation aid showing current location in hierarchy
- **Button**: Customizable button with multiple variants and sizes
- **Calendar**: Date picker component 
- **Card**: Container with header, content, and footer sections
- **Carousel**: Slideshow for cycling through elements
- **Chart**: Data visualization component
- **Checkbox**: Selectable input element
- **Collapsible**: Toggle for showing/hiding content
- **Command**: Command palette for keyboard-first interfaces
- **ContextMenu**: Right-click menu component
- **Dialog**: Modal window overlay
- **Drawer**: Side-sliding panel
- **DropdownMenu**: Menu that appears from a trigger element
- **Form**: Form validation and submission handling
- **HoverCard**: Card that appears when hovering over an element
- **InputOTP**: One-time password input field
- **Input**: Text input field
- **Label**: Accessible form labels
- **Menubar**: Horizontal menu with dropdowns
- **NavigationMenu**: Accessible navigation component
- **Pagination**: Controls for navigating between pages
- **Popover**: Floating content triggered by a button
- **Progress**: Progress indicator
- **RadioGroup**: Group of radio inputs
- **Resizable**: Resizable panels and interfaces
- **ScrollArea**: Scrollable container with custom scrollbars
- **Select**: Dropdown selection component
- **Separator**: Visual divider between content
- **Sheet**: Side-anchored dialog component
- **Sidebar**: Navigation sidebar component
- **Skeleton**: Loading placeholder
- **Slider**: Input for selecting a value from a range
- **Sonner**: Toast notification manager
- **Switch**: Toggle switch control
- **Table**: Data table with headers and rows
- **Tabs**: Tabbed interface component
- **Textarea**: Multi-line text input
- **Toast**: Toast notification component
- **ToggleGroup**: Group of toggle buttons
- **Toggle**: Two-state button
- **Tooltip**: Informational text that appears on hover

These components follow a consistent pattern using React's `forwardRef` and use the `cn()` utility for class name merging. Many are built on Radix UI primitives for accessibility and customized with Tailwind CSS.

## Nostr Protocol Integration

This project comes with custom hooks for querying and publishing events on the Nostr network.

### The `useNostr` Hook

The `useNostr` hook returns an object containing a `nostr` property, with `.query()` and `.event()` methods for querying and publishing Nostr events respectively.

```typescript
import { useNostr } from '@nostrify/react';

function useCustomHook() {
  const { nostr } = useNostr();

  // ...
}
```

### Query Nostr Data with `useNostr` and Tanstack Query

When querying Nostr, the best practice is to create custom hooks that combine `useNostr` and `useQuery` to get the required data.

```typescript
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/query';

function usePosts() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['posts'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      const events = await nostr.query([{ kinds: [1], limit: 20 }], { signal });
      return events; // these events could be transformed into another format
    },
  });
}
```

The data may be transformed into a more appropriate format if needed, and multiple calls to `nostr.query()` may be made in a single queryFn.

### The `useAuthor` Hook

To display profile data for a user by their Nostr pubkey (such as an event author), use the `useAuthor` hook.

```tsx
import { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';

function Post({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name || event.pubkey.slice(0, 8);
  const profileImage = metadata?.picture;

  // ...render elements with this data
}
```

#### `NostrMetadata` type

```ts
/** Kind 0 metadata. */
interface NostrMetadata {
  /** A short description of the user. */
  about?: string;
  /** A URL to a wide (~1024x768) picture to be optionally displayed in the background of a profile screen. */
  banner?: string;
  /** A boolean to clarify that the content is entirely or partially the result of automation, such as with chatbots or newsfeeds. */
  bot?: boolean;
  /** An alternative, bigger name with richer characters than `name`. `name` should always be set regardless of the presence of `display_name` in the metadata. */
  display_name?: string;
  /** A bech32 lightning address according to NIP-57 and LNURL specifications. */
  lud06?: string;
  /** An email-like lightning address according to NIP-57 and LNURL specifications. */
  lud16?: string;
  /** A short name to be displayed for the user. */
  name?: string;
  /** An email-like Nostr address according to NIP-05. */
  nip05?: string;
  /** A URL to the user's avatar. */
  picture?: string;
  /** A web URL related in any way to the event author. */
  website?: string;
}
```

### The `useNostrPublish` Hook

To publish events, use the `useNostrPublish` hook in this project.

```tsx
import { useState } from 'react';

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from '@/hooks/useNostrPublish';

export function MyComponent() {
  const [ data, setData] = useState<Record<string, string>>({});

  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();

  const handleSubmit = () => {
    createEvent({ kind: 1, content: data.content });
  };

  if (!user) {
    return <span>You must be logged in to use this form.</span>;
  }

  return (
    <form onSubmit={handleSubmit} disabled={!user}>
      {/* ...some input fields */}
    </form>
  );
}
```

The `useCurrentUser` hook should be used to ensure that the user is logged in before they are able to publish Nostr events.

### Nostr Login

To enable login with Nostr, simply use the `LoginArea` component already included in this project.

```tsx
import { LoginArea } from "@/components/auth/LoginArea";

function MyComponent() {
  return (
    <div>
      {/* other components ... */}

      <LoginArea />
    </div>
  );
}
```

The `LoginArea` component displays a "Log in" button when the user is logged out, and changes to an account switcher once the user is logged in. It handles all the login-related UI and interactions internally, including displaying login dialogs and switching between accounts. It should not be wrapped in any conditional logic.

### `npub`, `naddr`, and other Nostr addresses

Nostr defines a set identifiers in NIP-19. Their prefixes:

- `npub`: public keys
- `nsec`: private keys
- `note`: note ids
- `nprofile`: a nostr profile
- `nevent`: a nostr event
- `naddr`: a nostr replaceable event coordinate
- `nrelay`: a nostr relay (deprecated)

NIP-19 identifiers include a prefix, the number "1", then a base32-encoded data string.

#### Use in Filters

The base Nostr protocol uses hex string identifiers when filtering by event IDs and pubkeys. Nostr filters only accept hex strings.

```ts
// ❌ Wrong: naddr is not decoded
const events = await nostr.query(
  [{ ids: [naddr] }],
  { signal }
);
```

Corrected example:

```ts
// Import nip19 from nostr-tools
import { nip19 } from 'nostr-tools';

// Decode a NIP-19 identifier
const decoded = nip19.decode(value);

// Optional: guard certain types (depending on the use-case)
if (decoded.type !== 'naddr') {
  throw new Error('Unsupported Nostr identifier');
}

// Get the addr object
const naddr = decoded.data;

// ✅ Correct: naddr is expanded into the correct filter
const events = await nostr.query(
  [{
    kinds: [naddr.kind],
    authors: [naddr.pubkey],
    '#d': [naddr.identifier],
  }],
  { signal }
);
```

### Nostr Edit Profile

To include an Edit Profile form, place the `EditProfileForm` component in the project:

```tsx
import { EditProfileForm } from "@/components/EditProfileForm";

function EditProfilePage() {
  return (
    <div>
      {/* you may want to wrap this in a layout or include other components depending on the project ... */}

      <EditProfileForm />
    </div>
  );
}
```

The `EditProfileForm` component displays just the form. It requires no props, and will "just work" automatically.

### Uploading Files on Nostr

Use the `useUploadFile` hook to upload files.

```tsx
import { useUploadFile } from "@/hooks/useUploadFile";

function MyComponent() {
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  const handleUpload = async (file: File) => {
    try {
      // Provides an array of NIP-94 compatible tags
      // The first tag in the array contains the URL
      const [[_, url]] = await uploadFile(file);
      // ...use the url
    } catch (error) {
      // ...handle errors
    }
  };

  // ...rest of component
}
```

To attach files to kind 1 events, each file's URL should be appended to the event's `content`, and an `imeta` tag should be added for each file. For kind 0 events, the URL by itself can be used in relevant fields of the JSON content.

### Nostr Encryption and Decryption

The logged-in user has a `signer` object (matching the NIP-07 signer interface) that can be used for encryption and decryption.

```ts
// Get the current user
const { user } = useCurrentUser();

// Optional guard to check that nip44 is available
if (!user.signer.nip44) {
  throw new Error("Please upgrade your signer extension to a version that supports NIP-44 encryption");
}

// Encrypt message to self
const encrypted = await user.signer.nip44.encrypt(user.pubkey, "hello world");
// Decrypt message to self
const decrypted = await user.signer.nip44.decrypt(user.pubkey, encrypted) // "hello world"
```

## Development Practices

- Uses React Query for data fetching and caching
- Follows shadcn/ui component patterns
- Implements Path Aliases with `@/` prefix for cleaner imports
- Uses Vite for fast development and production builds
- Component-based architecture with React hooks
- Default connection to multiple Nostr relays for network redundancy

## Build & Deployment

- Build for production: `npm run build`
- Development build: `npm run build:dev`

## Testing Your Changes

Whenever you modify code, you should test your changes after you're finished by running:

```bash
npm run ci
```

This command will typecheck the code and attempt to build it.

Your task is not considered finished until this test passes without errors.

## Authentication Architecture

Wavlake implements a hybrid authentication system combining **Nostr** for identity and **Firebase** for legacy business operations. This dual approach provides:

- **Nostr**: Primary identity layer supporting Extension (NIP-07), Nsec, and Bunker (NIP-46) authentication
- **Firebase**: Legacy integration for group ownership features and business operations

### Nostr Authentication System

#### Core Implementation Components

**NostrLoginProvider** (`@/components/auth/NostrLoginProvider.tsx`):
- Manages Nostr session state and persistence
- Handles automatic reconnection and session recovery
- Provides context for authentication status throughout the app
- Integrates with TanStack Query for efficient state management

**Authentication Methods**:

1. **Extension/NIP-07**: Browser extension-based authentication
   - Uses `window.nostr` interface for signing operations
   - Most secure method as private keys never leave the extension
   - Supports Alby, nos2x, and other NIP-07 compatible extensions

2. **Nsec**: Direct private key authentication
   - Allows users to input nsec (private key) directly
   - Private key is stored securely in browser storage
   - Provides fallback when extensions aren't available

3. **Bunker/NIP-46**: Remote signer authentication
   - Connects to remote signing services
   - Enables signing from different devices/services
   - Uses nostr-tools bunker functionality for communication

**Session Management**:
- **Automatic Persistence**: User sessions persist across browser sessions
- **Multi-Account Support**: Built-in account switcher for managing multiple identities
- **Profile Synchronization**: Automatically syncs and caches user profile metadata (kind 0 events)
- **Secure Storage**: Uses browser localStorage with proper encryption for sensitive data

#### Technical Implementation

**NIP-98 Authentication** (`@/lib/nip98Auth.ts`):
- Creates HTTP authorization headers using Nostr event signing
- Enables authenticated API requests to backend services
- Integrates with the user's signer for secure request signing
- Handles both object and string payloads automatically

**Hook Integration**:
- `useCurrentUser()`: Access current authenticated user and signer
- `useNostrPublish()`: Publish events with automatic authentication
- `useAuthor()`: Fetch and cache user profile information

### Firebase Authentication System

#### Purpose and Scope

Firebase authentication is **only required for group owners** who need access to business features like:
- Revenue analytics and reporting
- Advanced community management tools
- Integration with payment systems
- Legacy user data management

**Important**: Moderators and regular users do not require Firebase authentication.

#### Implementation Components

**FirebaseOwnerGuard** (`@/components/auth/FirebaseOwnerGuard.tsx`):
- Protects owner-specific features and routes
- **Redirect-based approach**: Automatically redirects to `/link-firebase` when linking is needed
- Non-blocking: Doesn't prevent basic functionality for unlinked accounts
- Role-aware: Only enforces linking for users with owner privileges

**Account Linking System**:
- **Dedicated Flow**: Separate `/link-firebase` page for account linking
- **One-time Process**: Once linked, the association persists
- **Secure Integration**: Links Nostr pubkey with Firebase UID securely
- **Fallback UI**: Clear messaging and guidance for users who need to link accounts

#### Firebase Legacy Components

The project maintains Firebase legacy authentication components for potential migration scenarios:

- **Migration Types** (`@/components/auth/firebase-legacy/types.ts`): Type definitions for legacy migration flows
- **Legacy Login Components**: Complete multi-step authentication flow (currently unused)
- **Account Linking Logic**: Handles linking multiple Nostr pubkeys to Firebase accounts

### Authentication Flow Integration

#### User Journey Flow

1. **Initial Authentication**: User logs in via Nostr (Extension/Nsec/Bunker)
2. **Identity Establishment**: Profile metadata synced and cached
3. **Role Detection**: System determines user role (listener/moderator/owner)
4. **Conditional Firebase**: Only owners are prompted for Firebase linking when accessing protected features
5. **Feature Access**: Full platform functionality based on authentication state

#### Technical Integration Points

**Routing Integration** (`@/components/auth/WelcomeRedirect.tsx`):
- Welcome flow based on group associations, not authentication state
- Automatic redirection for new users without group memberships
- Smart routing that adapts to user's role and associations

**Context Providers**:
- **NostrLoginProvider**: Primary authentication context
- **CommunityContext**: Manages community-specific state and permissions
- Integration between both contexts for role-based access control

#### API Authentication

**Hybrid Request Pattern**:
```typescript
// Nostr-authenticated requests use NIP-98
const authHeader = await createNip98AuthHeader(url, method, body, user.signer);

// Firebase-authenticated requests use traditional tokens
const firebaseToken = await user.getIdToken();
```

**Permission Layers**:
- **Nostr Layer**: Identity verification and basic permissions
- **Firebase Layer**: Business operations and legacy system integration
- **Role Layer**: Community-specific permissions (owner/moderator/member)

### Security Considerations

**Nostr Security**:
- Private keys never exposed in application code
- Extension-based signing provides maximum security
- NIP-98 authentication prevents request tampering
- Automatic session timeout and re-authentication

**Firebase Security**:
- Minimal scope: Only used for necessary business operations
- Secure account linking with proper validation
- Token-based authentication with automatic refresh
- Separated from main authentication flow to reduce attack surface

**Integration Security**:
- No shared secrets between authentication systems
- Principle of least privilege for each system
- Clear separation of concerns between identity and business operations

### Development Guidelines

**When Working with Authentication**:
1. Always use `useCurrentUser()` for Nostr authentication state
2. Wrap owner-only features with `FirebaseOwnerGuard`
3. Never bypass authentication guards in production code
4. Use NIP-98 for authenticated API requests
5. Handle authentication failures gracefully with proper error states

**Testing Authentication Flows**:
1. Test with users having different roles (owner/moderator/listener)
2. Verify Firebase linking redirect behavior for owners
3. Test authentication persistence across browser sessions
4. Validate proper error handling for network failures

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# Wavlake-Specific Implementation Details

## Authentication Changes (vs Chorus)
- **Simplified Login**: Removed Firebase legacy authentication from LoginDialog
- **Pure Nostr-Only**: Only Extension, Nsec, and Bunker authentication methods
- **No Complex Flows**: Eliminated multi-step authentication pathways

## Artist Dashboard Implementation

### Dashboard Navigation Structure
- `/dashboard` (no params) → Shows group list for multi-group users
- `/dashboard?communityId=X` → Shows full dashboard with sidebar navigation
- Auto-redirect for single group users to include communityId parameter

### Dashboard Components
1. **ArtistDashboard.tsx**: Main dashboard component with:
   - Tabbed navigation sidebar (Overview, Music, Updates, Community, Moderation, Wallet, Settings, Support)
   - Conditional rendering based on user's group associations
   - Smart header with context-aware buttons

2. **Dashboard Views**:
   - **No Groups**: Welcome message with "Create Your Artist Page" CTA
   - **Multiple Groups (List View)**: Clean list of owned/moderated communities
   - **Selected Group**: Full dashboard with all features

## User Flow & Routing

### Welcome Flow (New Feature)
1. **WelcomeRedirect.tsx**: Automatically redirects users based on associations
2. **WelcomePage.tsx**: Role selection for users without groups
   - Artist path → `/dashboard`
   - Listener path → `/`

### Smart Routing Rules
- Users with 0 groups → `/welcome`
- Users with 1 group → Auto-redirect to `/dashboard?communityId=X`
- Users with multiple groups → `/dashboard` (list view)

## Firebase Integration Changes

### Separated from Login Flow
- **FirebaseOwnerGuard.tsx**: Redirects to `/link-firebase` instead of blocking
- **LinkFirebase.tsx**: Dedicated page for Firebase account linking
- Only required for group owners, not moderators or listeners

## URL Parameter Management

### CommunityContext Updates
- Changed from `community` to `communityId` parameter
- Automatic URL updates when selecting communities
- Clean integration with React Router

## Key UI/UX Improvements

1. **Removed Community Selector**: No dropdown selector in dashboard
2. **Added Navigation Buttons**:
   - "Add another Artist" (single group users)
   - "Return to Dashboard List" (multi-group users)
3. **Clean Dashboard List**: Professional group selection interface
4. **Role-Based Features**: Different UI for owners vs moderators

## Important Implementation Notes

### When Working on Authentication
- Always maintain Nostr-only approach
- Don't re-introduce Firebase to login flow
- Keep authentication simple and streamlined

### When Working on Dashboard
- Preserve URL parameter-based navigation
- Maintain separation between list view and full dashboard
- Always test with users having 0, 1, and multiple groups

### When Adding Features
- Follow existing patterns for hooks and contexts
- Use FirebaseOwnerGuard for owner-only features
- Keep navigation flows simple and predictable