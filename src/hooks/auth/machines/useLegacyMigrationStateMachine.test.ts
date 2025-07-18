import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLegacyMigrationStateMachine, type LegacyMigrationStateMachineDependencies } from './useLegacyMigrationStateMachine';

// Mock the external dependencies
vi.mock('@/hooks/useLinkedPubkeys', () => ({
  makeLinkedPubkeysRequest: vi.fn(),
}));

vi.mock('@/hooks/auth/useLinkAccount', () => ({
  makeLinkAccountRequest: vi.fn(),
}));

// Import the mocked functions
import { makeLinkedPubkeysRequest } from '@/hooks/useLinkedPubkeys';
import { makeLinkAccountRequest } from '@/hooks/auth/useLinkAccount';

// Mock dependencies factory
function createMockLegacyMigrationDependencies(): LegacyMigrationStateMachineDependencies {
  return {
    firebaseAuth: vi.fn().mockResolvedValue({
      uid: 'firebase-uid-123',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('firebase-token-123'),
    }),
    authenticateNostr: vi.fn().mockResolvedValue({
      pubkey: 'test-pubkey-123',
      signer: {
        signEvent: vi.fn().mockResolvedValue({}),
        getPublicKey: vi.fn().mockResolvedValue('test-pubkey-123'),
      },
      profile: {
        name: 'Test User',
      },
    }),
    createAccount: vi.fn().mockResolvedValue({
      login: {
        pubkey: 'generated-pubkey-123',
        signEvent: vi.fn().mockResolvedValue({}),
      },
      generatedName: 'TestUser123',
    }),
    addLogin: vi.fn(),
    setupAccount: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useLegacyMigrationStateMachine', () => {
  let mockDependencies: LegacyMigrationStateMachineDependencies;

  beforeEach(() => {
    mockDependencies = createMockLegacyMigrationDependencies();
    vi.clearAllMocks();
    
    // Reset mocks to default behaviors
    (makeLinkedPubkeysRequest as any).mockResolvedValue([]);
    (makeLinkAccountRequest as any).mockResolvedValue({ success: true });
  });

  describe('Initial State', () => {
    it('should initialize with firebase-auth step', () => {
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      expect(result.current.step).toBe('firebase-auth');
      expect(result.current.firebaseUser).toBe(null);
      expect(result.current.linkedPubkeys).toEqual([]);
      expect(result.current.canGoBack).toBe(false);
      expect(result.current.isLoading('any')).toBe(false);
    });
  });

  describe('Firebase Authentication', () => {
    it('should authenticate with Firebase and check for linked accounts', async () => {
      // Mock linked pubkeys API response (empty array)
      (makeLinkedPubkeysRequest as any).mockResolvedValue([]);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(mockDependencies.firebaseAuth).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.firebaseUser).toBeTruthy();
      expect(result.current.step).toBe('account-choice'); // Should go to account-choice since no linked accounts
      expect(result.current.canGoBack).toBe(true);
    });

    it('should handle Firebase authentication errors', async () => {
      (mockDependencies.firebaseAuth as any).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'wrongpassword');
      });

      expect(result.current.getError('authenticateWithFirebase')).toBeDefined();
      expect(result.current.step).toBe('firebase-auth');
    });
  });

  describe('Account Linking Flow - With Existing Links', () => {
    it('should navigate to linked-nostr-auth when linked accounts exist', async () => {
      // Mock linked pubkeys response
      (makeLinkedPubkeysRequest as any).mockResolvedValue([
        { pubkey: 'existing-pubkey-123', profile: { name: 'Existing User' } },
      ]);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.step).toBe('linked-nostr-auth');
      expect(result.current.linkedPubkeys).toHaveLength(1);
      expect(result.current.expectedPubkey).toBe('existing-pubkey-123');
    });

    it('should authenticate with linked Nostr account and complete', async () => {
      // Mock linked pubkeys response
      (makeLinkedPubkeysRequest as any).mockResolvedValue([
        { pubkey: 'existing-pubkey-123', profile: { name: 'Existing User' } },
      ]);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // First authenticate with Firebase
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      // Then authenticate with linked Nostr account
      await act(async () => {
        await result.current.actions.authenticateWithLinkedNostr({ method: 'extension' });
      });

      expect(mockDependencies.authenticateNostr).toHaveBeenCalledWith('extension', { method: 'extension' });
      expect(result.current.step).toBe('complete');
    });

    it('should handle Nostr authentication errors for linked accounts', async () => {
      // Mock linked pubkeys response to ensure we go to linked-nostr-auth step
      (makeLinkedPubkeysRequest as any).mockResolvedValue([
        { pubkey: 'existing-pubkey-123', profile: { name: 'Existing User' } },
      ]);
      (mockDependencies.authenticateNostr as any).mockRejectedValue(new Error('Extension not available'));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.authenticateWithLinkedNostr({ method: 'extension' });
      });

      expect(result.current.getError('authenticateWithLinkedNostr')).toBeDefined();
      expect(result.current.step).toBe('linked-nostr-auth');
    });
  });

  describe('Account Linking Flow - No Existing Links', () => {
    beforeEach(() => {
      // Mock empty linked pubkeys response
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));
    });

    it('should navigate to account-choice when no linked accounts exist', async () => {
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.step).toBe('account-choice');
      expect(result.current.linkedPubkeys).toHaveLength(0);
      expect(result.current.expectedPubkey).toBe(null);
    });

    it('should handle account generation flow', async () => {
      // Mock account linking API
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Complete Firebase auth to reach account-choice
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      // Generate new account
      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      expect(mockDependencies.createAccount).toHaveBeenCalled();
      expect(result.current.step).toBe('complete');
      expect(result.current.createdLogin).toBeTruthy();
      expect(result.current.generatedName).toBeTruthy();
    });

    it('should handle bring own keypair flow', async () => {
      // Mock account linking API
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Complete Firebase auth to reach account-choice
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      // Import existing keypair
      await act(async () => {
        await result.current.actions.bringOwnKeypair({ 
          method: 'nsec', 
          nsec: 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' 
        });
      });

      expect(mockDependencies.authenticateNostr).toHaveBeenCalledWith('nsec', { 
        method: 'nsec', 
        nsec: 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' 
      });
      expect(result.current.step).toBe('complete');
    });

    it('should handle account generation errors', async () => {
      (mockDependencies.createAccount as any).mockRejectedValue(new Error('Account creation failed'));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      expect(result.current.getError('generateNewAccount')).toBeDefined();
      expect(result.current.step).toBe('account-choice');
    });

    it('should handle keypair import errors', async () => {
      (mockDependencies.authenticateNostr as any).mockRejectedValue(new Error('Invalid nsec'));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.bringOwnKeypair({ method: 'nsec', nsec: 'invalid-nsec' });
      });

      expect(result.current.getError('bringOwnKeypair')).toBeDefined();
      expect(result.current.step).toBe('account-choice');
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete login successfully for generated accounts', async () => {
      // Mock all necessary APIs
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Complete full flow
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      await act(async () => {
        await result.current.actions.completeLogin();
      });

      expect(mockDependencies.addLogin).toHaveBeenCalled();
      expect(mockDependencies.setupAccount).toHaveBeenCalled();
      expect(result.current.step).toBe('complete');
    });

    it('should handle complete login errors', async () => {
      (mockDependencies.setupAccount as any).mockRejectedValue(new Error('Setup failed'));

      // Mock all necessary APIs
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      await act(async () => {
        await result.current.actions.completeLogin();
      });

      expect(result.current.getError('completeLogin')).toBeDefined();
    });
  });

  describe('Navigation and State Management', () => {
    it('should handle navigation back through flow', async () => {
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Navigate to account-choice
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.step).toBe('account-choice');
      expect(result.current.canGoBack).toBe(true);

      // Go back to checking-links
      act(() => {
        result.current.goBack();
      });

      expect(result.current.step).toBe('firebase-auth');

      // Already at firebase-auth, cannot go back further
      act(() => {
        result.current.goBack();
      });

      expect(result.current.step).toBe('firebase-auth');
      expect(result.current.canGoBack).toBe(false);
    });

    it('should reset state completely', async () => {
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.step).toBe('account-choice');
      expect(result.current.firebaseUser).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('firebase-auth');
      expect(result.current.firebaseUser).toBe(null);
      expect(result.current.linkedPubkeys).toEqual([]);
      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Loading State Management', () => {
    it('should track loading states for all async operations', async () => {
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Start Firebase auth operation
      act(() => {
        result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.isLoading('authenticateWithFirebase')).toBe(true);

      await act(async () => {
        // Wait for completion
      });

      expect(result.current.isLoading('authenticateWithFirebase')).toBe(false);
    });

    it('should clear loading state on error', async () => {
      (mockDependencies.firebaseAuth as any).mockRejectedValue(new Error('Test error'));
      
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.isLoading('authenticateWithFirebase')).toBe(false);
      expect(result.current.getError('authenticateWithFirebase')).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle linking API failures gracefully', async () => {
      // Mock linking API failure
      (makeLinkAccountRequest as any).mockRejectedValue(new Error('Linking API failed'));
      (makeLinkedPubkeysRequest as any).mockResolvedValue([]);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      expect(result.current.getError('generateNewAccount')).toBeDefined();
      // TODO: This should ideally go back to 'account-choice' for better UX
      // Currently goes to 'profile-setup' because ACCOUNT_GENERATED is dispatched before linking
      expect(result.current.step).toBe('profile-setup');
    });

    it('should handle Firebase token generation failures', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockRejectedValue(new Error('Token generation failed')),
      };
      (mockDependencies.firebaseAuth as any).mockResolvedValue(mockFirebaseUser);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.getError('authenticateWithFirebase')).toBeDefined();
    });

    it('should clear previous errors when retrying operations', async () => {
      // First attempt fails
      (mockDependencies.firebaseAuth as any).mockRejectedValueOnce(new Error('First error'));
      
      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.getError('authenticateWithFirebase')).toBeDefined();

      // Second attempt succeeds
      (mockDependencies.firebaseAuth as any).mockResolvedValueOnce({
        uid: 'test-uid',
        getIdToken: vi.fn().mockResolvedValue('token'),
      });
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      expect(result.current.getError('authenticateWithFirebase')).toBe(null);
      expect(result.current.step).toBe('account-choice');
    });

    // HTTP Error Response Tests (disabled for now as requested)
    it.skip('should handle HTTP 400 Bad Request during Firebase auth', async () => {
      const httpError = new Error('HTTP 400: Bad Request - Invalid email format');
      httpError.name = 'HTTPError';
      (httpError as any).status = 400;
      (mockDependencies.firebaseAuth as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('invalid-email', 'password');
      });

      expect(result.current.getError('authenticateWithFirebase')?.message).toContain('400');
    });

    it.skip('should handle HTTP 401 Unauthorized during account linking', async () => {
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockRejectedValue(
          Object.assign(new Error('HTTP 401: Unauthorized - Invalid token'), { status: 401 })
        ),
      }));
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.generateNewAccount();
      });

      expect(result.current.getError('generateNewAccount')?.message).toContain('401');
    });

    it.skip('should handle HTTP 500 Internal Server Error during Nostr auth', async () => {
      const httpError = new Error('HTTP 500: Internal Server Error');
      httpError.name = 'HTTPError';
      (httpError as any).status = 500;
      (mockDependencies.authenticateNostr as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });

      await act(async () => {
        await result.current.actions.bringOwnKeypair({ method: 'nsec', nsec: 'test-nsec' });
      });

      expect(result.current.getError('bringOwnKeypair')?.message).toContain('500');
    });
  });

  describe('Authentication Method Specific Tests', () => {
    describe('Extension Authentication', () => {
      it('should handle extension authentication for linked accounts', async () => {
        vi.doMock('@/hooks/useLinkedPubkeys', () => ({
          makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([
            { pubkey: 'test-pubkey-123' },
          ]),
        }));

        const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
        });

        await act(async () => {
          await result.current.actions.authenticateWithLinkedNostr({ method: 'extension' });
        });

        expect(mockDependencies.authenticateNostr).toHaveBeenCalledWith('extension', { method: 'extension' });
        expect(result.current.step).toBe('complete');
      });

      it('should handle extension user rejection', async () => {
        const rejectionError = new Error('User rejected request');
        rejectionError.name = 'UserRejectedError';
        (mockDependencies.authenticateNostr as any).mockRejectedValue(rejectionError);

        vi.doMock('@/hooks/useLinkedPubkeys', () => ({
          makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([
            { pubkey: 'test-pubkey-123' },
          ]),
        }));

        const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
        });

        await act(async () => {
          await result.current.actions.authenticateWithLinkedNostr({ method: 'extension' });
        });

        expect(result.current.getError('authenticateWithLinkedNostr')?.message).toContain('rejected');
      });
    });

    describe('nsec Authentication', () => {
      it('should handle nsec authentication for importing keys', async () => {
        vi.doMock('@/hooks/useLinkedPubkeys', () => ({
          makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
        }));
        vi.doMock('@/hooks/auth/useLinkAccount', () => ({
          makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
        }));

        const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
        });

        await act(async () => {
          await result.current.actions.bringOwnKeypair({ 
            method: 'nsec', 
            nsec: 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' 
          });
        });

        expect(mockDependencies.authenticateNostr).toHaveBeenCalledWith('nsec', { 
          method: 'nsec', 
          nsec: 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' 
        });
        expect(result.current.step).toBe('complete');
      });

      it('should handle malformed nsec keys', async () => {
        const malformedError = new Error('Malformed private key');
        (mockDependencies.authenticateNostr as any).mockRejectedValue(malformedError);

        vi.doMock('@/hooks/useLinkedPubkeys', () => ({
          makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
        }));

        const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
        });

        await act(async () => {
          await result.current.actions.bringOwnKeypair({ method: 'nsec', nsec: 'invalid-nsec' });
        });

        expect(result.current.getError('bringOwnKeypair')?.message).toContain('Malformed');
      });
    });
  });

  describe('Complete Flow Integration', () => {
    it('should execute complete migration flow with account generation', async () => {
      // Mock all APIs for success
      vi.doMock('@/hooks/useLinkedPubkeys', () => ({
        makeLinkedPubkeysRequest: vi.fn().mockResolvedValue([]),
      }));
      vi.doMock('@/hooks/auth/useLinkAccount', () => ({
        makeLinkAccountRequest: vi.fn().mockResolvedValue({ success: true }),
      }));

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Verify initial state
      expect(result.current.step).toBe('firebase-auth');
      
      // Execute Firebase authentication
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });
      
      expect(result.current.step).toBe('account-choice');
      
      // Generate new account
      await act(async () => {
        await result.current.actions.generateNewAccount();
      });
      
      // Complete login
      await act(async () => {
        await result.current.actions.completeLogin();
      });

      // Verify completion
      expect(result.current.step).toBe('complete');
      expect(result.current.canGoBack).toBe(false);
      
      // Verify all dependencies were called
      expect(mockDependencies.firebaseAuth).toHaveBeenCalled();
      expect(mockDependencies.createAccount).toHaveBeenCalled();
      expect(mockDependencies.addLogin).toHaveBeenCalled();
      expect(mockDependencies.setupAccount).toHaveBeenCalled();
      
      // Verify no errors
      expect(result.current.getError('authenticateWithFirebase')).toBe(null);
      expect(result.current.getError('generateNewAccount')).toBe(null);
      expect(result.current.getError('completeLogin')).toBe(null);
    });

    it('should maintain consistent state throughout flow', async () => {
      (makeLinkedPubkeysRequest as any).mockResolvedValue([
        { pubkey: 'existing-pubkey-123' },
      ]);

      const { result } = renderHook(() => useLegacyMigrationStateMachine(mockDependencies));
      
      // Track state changes
      const stateChanges: string[] = [];
      
      // Initial state
      stateChanges.push(result.current.step);
      
      await act(async () => {
        await result.current.actions.authenticateWithFirebase('test@example.com', 'password123');
      });
      
      stateChanges.push(result.current.step);
      
      await act(async () => {
        await result.current.actions.authenticateWithLinkedNostr({ method: 'extension' });
      });
      
      // Final state
      stateChanges.push(result.current.step);
      
      expect(stateChanges).toEqual(['firebase-auth', 'linked-nostr-auth', 'complete']);
    });
  });
});