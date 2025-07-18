import { vi } from 'vitest'

// Mock Firebase User
export const mockFirebaseUser = {
  uid: 'mock-firebase-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-firebase-token',
    claims: {},
  }),
}

// Mock Firebase Auth service
export const mockFirebaseAuth = {
  currentUser: null,
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockFirebaseUser,
    operationType: 'signIn',
  }),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockFirebaseUser,
    operationType: 'signIn',
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  updateEmail: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: vi.fn().mockResolvedValue(undefined),
}

// Mock Firebase Auth Provider
export const createMockFirebaseAuthProvider = (overrides = {}) => ({
  user: null,
  loading: false,
  error: null,
  isConfigured: true,
  getAuthToken: vi.fn().mockResolvedValue('mock-firebase-token'),
  refreshToken: vi.fn().mockResolvedValue('mock-firebase-token'),
  loginWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockFirebaseUser,
  }),
  registerWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: mockFirebaseUser,
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
  isValidEmail: vi.fn().mockReturnValue(true),
  isValidPassword: vi.fn().mockReturnValue(true),
  getPasswordStrength: vi.fn().mockReturnValue('strong'),
  ...overrides,
})

// Helper to setup Firebase mocks
export const setupFirebaseMocks = () => {
  // Mock Firebase config check
  vi.mock('@/lib/firebaseAuth', () => ({
    isFirebaseAuthConfigured: vi.fn().mockReturnValue(true),
    initializeFirebaseAuth: vi.fn().mockReturnValue({
      auth: mockFirebaseAuth,
    }),
  }))
}