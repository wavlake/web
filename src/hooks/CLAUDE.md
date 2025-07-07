# Nostr Hooks & Integration Guide

This directory contains custom hooks for Nostr protocol integration.

## Core Nostr Hooks

### `useNostr()`
Returns an object with a `nostr` property containing `.query()` and `.event()` methods.

```typescript
import { useNostr } from '@nostrify/react';

function useCustomHook() {
  const { nostr } = useNostr();
  // Use nostr.query() for fetching events
  // Use nostr.event() for publishing
}
```

### `useNostrPublish()`
Publishes Nostr events with automatic authentication.

```tsx
const { user } = useCurrentUser();
const { mutate: createEvent } = useNostrPublish();

const handleSubmit = () => {
  createEvent({ kind: 1, content: data.content });
};
```

### `useAuthor(pubkey)`
Fetches and caches user profile metadata (kind 0 events).

```tsx
const author = useAuthor(event.pubkey);
const metadata = author.data?.metadata;
const displayName = metadata?.name || event.pubkey.slice(0, 8);
```

### `useCurrentUser()`
Returns the current authenticated user and signer.

```tsx
const { user } = useCurrentUser();
if (!user) return <span>Please log in</span>;
```

## Data Fetching Pattern

Combine `useNostr` with TanStack Query:

```typescript
function usePosts() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['posts'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      const events = await nostr.query([{ kinds: [1], limit: 20 }], { signal });
      return events;
    },
  });
}
```

## NIP-19 Identifiers

When working with Nostr identifiers:
- `npub`: public keys
- `nsec`: private keys  
- `note`: note ids
- `naddr`: replaceable event coordinate
- `nevent`: nostr event

**Important**: Decode NIP-19 identifiers before using in filters:

```ts
import { nip19 } from 'nostr-tools';

const decoded = nip19.decode(naddr);
const events = await nostr.query([{
  kinds: [decoded.data.kind],
  authors: [decoded.data.pubkey],
  '#d': [decoded.data.identifier],
}]);
```

## File Uploads

Use `useUploadFile()` for NIP-94 compatible uploads:

```tsx
const { mutateAsync: uploadFile } = useUploadFile();

const handleUpload = async (file: File) => {
  const [[_, url]] = await uploadFile(file);
  // Use the URL in your event
};
```

## Encryption (NIP-44)

```ts
const { user } = useCurrentUser();

if (!user.signer.nip44) {
  throw new Error("NIP-44 encryption not supported");
}

const encrypted = await user.signer.nip44.encrypt(recipientPubkey, message);
const decrypted = await user.signer.nip44.decrypt(senderPubkey, encrypted);
```

## Authentication

Use NIP-98 for authenticated API requests:

```ts
import { createNip98AuthHeader } from '@/lib/nip98Auth';

const authHeader = await createNip98AuthHeader(url, method, body, user.signer);
```