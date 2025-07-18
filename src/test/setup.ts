import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Extend Vitest's expect with custom matchers
import './matchers/authMatchers'

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Mock window.nostr for testing
Object.defineProperty(window, 'nostr', {
  writable: true,
  value: {
    getPublicKey: vi.fn(),
    signEvent: vi.fn(),
    getRelays: vi.fn(),
    nip04: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
    nip44: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Silence console errors in tests unless debugging
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('Error:')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})