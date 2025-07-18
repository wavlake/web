import { vi } from 'vitest'
import type { NostrEvent } from '@nostrify/nostrify'

// Mock Nostr event for testing
export const createMockNostrEvent = (overrides?: Partial<NostrEvent>): NostrEvent => ({
  id: 'mock-event-id',
  pubkey: 'mock-pubkey-hex',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  content: 'Mock event content',
  tags: [],
  sig: 'mock-signature',
  ...overrides,
})

// Mock Nostr signer
export const mockNostrSigner = {
  signEvent: vi.fn().mockImplementation(async (event: NostrEvent) => ({
    ...event,
    id: 'signed-' + event.id,
    sig: 'mock-signature-' + event.id,
  })),
  getPublicKey: vi.fn().mockResolvedValue('mock-pubkey-hex'),
  nip04: {
    encrypt: vi.fn().mockResolvedValue('encrypted-content'),
    decrypt: vi.fn().mockResolvedValue('decrypted-content'),
  },
  nip44: {
    encrypt: vi.fn().mockResolvedValue('encrypted-content-nip44'),
    decrypt: vi.fn().mockResolvedValue('decrypted-content-nip44'),
  },
}

// Mock Nostr service
export const mockNostr = {
  query: vi.fn().mockResolvedValue([]),
  req: vi.fn().mockReturnValue({
    on: vi.fn(),
    close: vi.fn(),
  }),
  publish: vi.fn().mockResolvedValue(undefined),
  event: vi.fn().mockResolvedValue(undefined),
}

// Mock window.nostr
export const mockWindowNostr = {
  getPublicKey: vi.fn().mockResolvedValue('mock-pubkey-hex'),
  signEvent: vi.fn().mockImplementation(async (event: NostrEvent) => ({
    ...event,
    id: 'signed-' + event.id,
    sig: 'mock-signature-' + event.id,
  })),
  getRelays: vi.fn().mockResolvedValue({}),
  nip04: {
    encrypt: vi.fn().mockResolvedValue('encrypted-content'),
    decrypt: vi.fn().mockResolvedValue('decrypted-content'),
  },
  nip44: {
    encrypt: vi.fn().mockResolvedValue('encrypted-content-nip44'),
    decrypt: vi.fn().mockResolvedValue('decrypted-content-nip44'),
  },
}

// Helper to setup window.nostr mock
export const setupWindowNostrMock = () => {
  Object.defineProperty(window, 'nostr', {
    writable: true,
    value: mockWindowNostr,
  })
}