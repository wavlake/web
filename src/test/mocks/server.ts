import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// API Mocks for Legacy Wavlake API
const legacyApiHandlers = [
  // Authentication endpoints
  http.post('*/v1/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-firebase-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    })
  }),

  http.post('*/v1/auth/link-pubkey', () => {
    return HttpResponse.json({
      success: true,
      message: 'Pubkey linked successfully',
    })
  }),

  http.post('*/v1/auth/unlink-pubkey', () => {
    return HttpResponse.json({
      success: true,
      message: 'Pubkey unlinked successfully',
    })
  }),

  // Legacy API endpoints
  http.get('*/v1/legacy/metadata', () => {
    return HttpResponse.json({
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      artists: [],
      albums: [],
      tracks: [],
    })
  }),

  http.get('*/v1/legacy/tracks', () => {
    return HttpResponse.json({
      tracks: [
        {
          id: 'track-1',
          title: 'Test Track',
          artist: 'Test Artist',
          duration: 180,
        },
      ],
    })
  }),

  // Account linking status
  http.get('*/v1/auth/linking-status', () => {
    return HttpResponse.json({
      isLinked: false,
      linkedPubkeys: [],
    })
  }),
]

// Firebase API mocks
const firebaseHandlers = [
  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', () => {
    return HttpResponse.json({
      idToken: 'mock-firebase-id-token',
      email: 'test@example.com',
      refreshToken: 'mock-refresh-token',
      expiresIn: '3600',
      localId: 'mock-local-id',
    })
  }),

  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signUp', () => {
    return HttpResponse.json({
      idToken: 'mock-firebase-id-token',
      email: 'test@example.com',
      refreshToken: 'mock-refresh-token',
      expiresIn: '3600',
      localId: 'mock-local-id',
    })
  }),
]

// Setup MSW server
export const server = setupServer(...legacyApiHandlers, ...firebaseHandlers)