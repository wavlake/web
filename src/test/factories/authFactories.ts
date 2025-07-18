import { vi } from 'vitest'
import type { NUser, NLoginType } from '@nostrify/react/login'
import type { 
  SignupState, 
  LegacyMigrationState, 
  NostrLoginState,
  LinkedPubkey,
  NostrAccount 
} from '@/hooks/auth/machines/types'
import type { ProfileData } from '@/types/profile'
import { mockNostrSigner } from '../__mocks__/nostr'

// Factory for creating mock NUser instances
export const createMockUser = (overrides?: Partial<NUser>): NUser => {
  const mockUser = {
    pubkey: 'mock-pubkey-hex-' + Math.random().toString(36).substring(7),
    signer: mockNostrSigner,
    ...overrides,
  } as NUser

  return mockUser
}

// Factory for creating mock login instances
export const createMockLogin = (type: 'nsec' | 'extension' | 'bunker' = 'extension'): NLoginType => {
  const baseLogin = {
    id: 'mock-login-id-' + Math.random().toString(36).substring(7),
    pubkey: 'mock-pubkey-' + Math.random().toString(36).substring(7),
    createdAt: new Date().toISOString(),
  }

  switch (type) {
    case 'nsec':
      return {
        ...baseLogin,
        type: 'nsec',
        data: { nsec: ('nsec1mock' + 'a'.repeat(58)) as `nsec1${string}` },
      } as NLoginType

    case 'bunker':
      return {
        ...baseLogin,
        type: 'bunker',
        data: {
          bunkerPubkey: 'mock-bunker-pubkey',
          clientNsec: ('nsec1mock' + 'a'.repeat(58)) as `nsec1${string}`,
          relays: ['wss://localhost:8080'],
        },
      } as NLoginType

    case 'extension':
    default:
      return {
        ...baseLogin,
        type: 'extension',
        data: null,
      } as NLoginType
  }
}

// Factory for creating mock profile data
export const createMockProfileData = (overrides?: Partial<ProfileData>): ProfileData => ({
  display_name: 'Test Artist',
  name: 'testartist',
  about: 'A test artist for testing purposes',
  picture: 'https://example.com/avatar.jpg',
  banner: 'https://example.com/banner.jpg',
  website: 'https://testartist.com',
  lud16: 'testartist@getalby.com',
  nip05: 'testartist@example.com',
  ...overrides,
})

// Factory for creating mock signup state
export const createMockSignupState = (overrides?: Partial<SignupState>): SignupState => ({
  step: 'user-type',
  isArtist: false,
  isSoloArtist: true,
  isLoading: {},
  errors: {},
  canGoBack: false,
  account: null,
  createdLogin: null,
  generatedName: null,
  profileData: null,
  firebaseUser: null,
  ...overrides,
})

// Factory for creating mock legacy migration state
export const createMockLegacyMigrationState = (overrides?: Partial<LegacyMigrationState>): LegacyMigrationState => ({
  step: 'firebase-auth',
  firebaseUser: null,
  linkedPubkeys: [],
  expectedPubkey: null,
  generatedAccount: null,
  createdLogin: null,
  generatedName: null,
  profileData: null,
  isLoading: {},
  errors: {},
  canGoBack: false,
  ...overrides,
})

// Factory for creating mock Nostr login state
export const createMockNostrLoginState = (overrides?: Partial<NostrLoginState>): NostrLoginState => ({
  step: 'auth',
  isLoading: {},
  errors: {},
  canGoBack: false,
  ...overrides,
})

// Factory for creating mock linked pubkeys
export const createMockLinkedPubkey = (overrides?: Partial<LinkedPubkey>): LinkedPubkey => ({
  pubkey: 'mock-linked-pubkey-' + Math.random().toString(36).substring(7),
  profile: {
    name: 'linkeduser',
    display_name: 'Linked User',
    picture: 'https://example.com/linked-avatar.jpg',
  },
  isPrimary: false,
  linkedAt: Date.now(),
  isMostRecentlyLinked: false,
  ...overrides,
})

// Factory for creating mock Nostr account
export const createMockNostrAccount = (overrides?: Partial<NostrAccount>): NostrAccount => ({
  pubkey: 'mock-account-pubkey-' + Math.random().toString(36).substring(7),
  privateKey: 'mock-private-key-' + Math.random().toString(36).substring(7),
  signer: mockNostrSigner,
  profile: {
    name: 'mockuser',
    display_name: 'Mock User',
    picture: 'https://example.com/mock-avatar.jpg',
    about: 'A mock user for testing',
  },
  ...overrides,
})

// Factory for creating mock authentication flow results
export const createMockAuthResult = (success = true, overrides = {}) => ({
  success,
  data: success ? { message: 'Authentication successful' } : null,
  error: success ? null : 'Authentication failed',
  ...overrides,
})

// Factory for creating mock state machine dependencies
export const createMockSignupDependencies = () => ({
  createAccount: vi.fn().mockResolvedValue({
    login: createMockLogin(),
    generatedName: 'Generated Name',
  }),
  saveProfile: vi.fn().mockResolvedValue(undefined),
  createFirebaseAccount: vi.fn().mockResolvedValue({
    uid: 'mock-firebase-uid',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
  }),
  addLogin: vi.fn(),
  setupAccount: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockReturnValue({
    pubkey: 'mock-pubkey-123',
    signer: {
      signEvent: vi.fn().mockResolvedValue({}),
      getPublicKey: vi.fn().mockResolvedValue('mock-pubkey-123'),
    },
  }),
})

export const createMockLegacyMigrationDependencies = () => ({
  firebaseAuth: vi.fn().mockResolvedValue({
    uid: 'mock-firebase-uid',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
  }),
  authenticateNostr: vi.fn().mockResolvedValue(createMockNostrAccount()),
  createAccount: vi.fn().mockResolvedValue({
    login: createMockLogin(),
    generatedName: 'Generated Name',
  }),
  addLogin: vi.fn(),
  setupAccount: vi.fn().mockResolvedValue(undefined),
})

export const createMockNostrLoginDependencies = () => ({
  authenticate: vi.fn().mockResolvedValue(createMockNostrAccount()),
  syncProfile: vi.fn().mockResolvedValue(undefined),
})