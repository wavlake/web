import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNostrLoginStateMachine, type NostrLoginStateMachineDependencies } from './useNostrLoginStateMachine';
import { createMockNostrLoginDependencies } from '../../../test/factories/authFactories';

describe('useNostrLoginStateMachine', () => {
  let mockDependencies: NostrLoginStateMachineDependencies;

  beforeEach(() => {
    mockDependencies = createMockNostrLoginDependencies();
  });

  describe('Initial State', () => {
    it('should initialize with auth step', () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      expect(result.current.step).toBe('auth');
      expect(result.current.canGoBack).toBe(false);
      expect(result.current.isLoading('any')).toBe(false);
    });
  });

  describe('Nostr Authentication', () => {
    it('should authenticate with extension and complete', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.step).toBe('complete');
      expect(mockDependencies.authenticate).toHaveBeenCalledWith('extension', { method: 'extension' });
      expect(mockDependencies.syncProfile).toHaveBeenCalled();
    });

    it('should authenticate with nsec and complete', async () => {
      const mockNsec = 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: mockNsec });
      });

      expect(result.current.step).toBe('complete');
      expect(mockDependencies.authenticate).toHaveBeenCalledWith('nsec', { method: 'nsec', nsec: mockNsec });
      expect(mockDependencies.syncProfile).toHaveBeenCalled();
    });

    it('should authenticate with bunker and complete', async () => {
      const mockBunkerUri = 'bunker://pubkey@relay.damus.io';
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('bunker', { method: 'bunker', bunkerUri: mockBunkerUri });
      });

      expect(result.current.step).toBe('complete');
      expect(mockDependencies.authenticate).toHaveBeenCalledWith('bunker', { method: 'bunker', bunkerUri: mockBunkerUri });
      expect(mockDependencies.syncProfile).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      (mockDependencies.authenticate as any).mockRejectedValue(new Error('Extension not available'));

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')).toBeDefined();
      expect(result.current.step).toBe('auth'); // Should remain on auth step
    });

    it('should handle profile sync errors gracefully', async () => {
      (mockDependencies.syncProfile as any).mockRejectedValue(new Error('Profile sync failed'));

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')).toBeDefined();
      expect(result.current.step).toBe('auth');
    });
  });

  describe('Loading State Management', () => {
    it('should track loading state during authentication', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      act(() => {
        result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.isLoading('authenticateWithNostr')).toBe(true);

      await act(async () => {
        // Wait for completion
      });

      expect(result.current.isLoading('authenticateWithNostr')).toBe(false);
    });

    it('should clear loading state on error', async () => {
      (mockDependencies.authenticate as any).mockRejectedValue(new Error('Test error'));
      
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.isLoading('authenticateWithNostr')).toBe(false);
      expect(result.current.getError('authenticateWithNostr')).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should reset state completely', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.step).toBe('complete');

      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('auth');
      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle extension not available error', async () => {
      const extError = new Error('Extension not available');
      extError.name = 'ExtensionNotAvailableError';
      (mockDependencies.authenticate as any).mockRejectedValue(extError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('Extension not available');
      expect(result.current.step).toBe('auth');
    });

    it('should handle invalid nsec error', async () => {
      const nsecError = new Error('Invalid nsec format');
      nsecError.name = 'InvalidNsecError';
      (mockDependencies.authenticate as any).mockRejectedValue(nsecError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: 'invalid-nsec' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('Invalid nsec');
      expect(result.current.step).toBe('auth');
    });

    it('should handle bunker connection failure', async () => {
      const bunkerError = new Error('Failed to connect to bunker');
      bunkerError.name = 'BunkerConnectionError';
      (mockDependencies.authenticate as any).mockRejectedValue(bunkerError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('bunker', { method: 'bunker', bunkerUri: 'bunker://invalid' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('Failed to connect');
      expect(result.current.step).toBe('auth');
    });

    it('should clear previous errors when retrying authentication', async () => {
      // First attempt fails
      (mockDependencies.authenticate as any).mockRejectedValueOnce(new Error('First error'));
      
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')).toBeDefined();

      // Second attempt succeeds
      (mockDependencies.authenticate as any).mockResolvedValueOnce({ success: true });
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')).toBe(null);
      expect(result.current.step).toBe('complete');
    });

    // Edge case tests (disabled for now as requested)
    it.skip('should handle concurrent authentication attempts', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      // Simulate rapid clicking with different methods
      const promises = [
        result.current.actions.authenticateWithNostr('extension', { method: 'extension' }),
        result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: 'nsec1test' }),
        result.current.actions.authenticateWithNostr('bunker', { method: 'bunker', bunkerUri: 'bunker://test' })
      ];

      await act(async () => {
        await Promise.allSettled(promises);
      });

      // Should end up in a consistent state
      expect(['auth', 'complete']).toContain(result.current.step);
    });

    it.skip('should handle timeout during authentication', async () => {
      const timeoutError = new Error('Authentication timeout');
      timeoutError.name = 'TimeoutError';
      (mockDependencies.authenticate as any).mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('timeout');
    });

    it.skip('should handle malformed authentication response', async () => {
      (mockDependencies.authenticate as any).mockResolvedValue(null);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      // Should handle gracefully even with malformed response
      expect(result.current.step).toBe('complete');
    });

    it.skip('should handle HTTP non-200 responses during sync', async () => {
      const httpError = new Error('HTTP 500: Internal Server Error');
      httpError.name = 'HTTPError';
      (mockDependencies.syncProfile as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('500');
    });

    // HTTP Error Response Tests (disabled for now as requested)
    it.skip('should handle HTTP 400 Bad Request during authentication', async () => {
      const httpError = new Error('HTTP 400: Bad Request - Invalid credentials');
      httpError.name = 'HTTPError';
      (httpError as any).status = 400;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('400');
    });

    it.skip('should handle HTTP 401 Unauthorized during authentication', async () => {
      const httpError = new Error('HTTP 401: Unauthorized - Invalid auth token');
      httpError.name = 'HTTPError';
      (httpError as any).status = 401;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: 'nsec1test' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('401');
    });

    it.skip('should handle HTTP 403 Forbidden during profile sync', async () => {
      const httpError = new Error('HTTP 403: Forbidden - Insufficient permissions');
      httpError.name = 'HTTPError';
      (httpError as any).status = 403;
      (mockDependencies.syncProfile as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('403');
    });

    it.skip('should handle HTTP 429 Rate Limited during authentication', async () => {
      const httpError = new Error('HTTP 429: Too Many Requests - Rate limit exceeded');
      httpError.name = 'HTTPError';
      (httpError as any).status = 429;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('bunker', { method: 'bunker', bunkerUri: 'bunker://test' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('429');
    });

    it.skip('should handle HTTP 500 Internal Server Error during authentication', async () => {
      const httpError = new Error('HTTP 500: Internal Server Error - Server error');
      httpError.name = 'HTTPError';
      (httpError as any).status = 500;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('500');
    });

    it.skip('should handle HTTP 502 Bad Gateway during relay communication', async () => {
      const httpError = new Error('HTTP 502: Bad Gateway - Relay error');
      httpError.name = 'HTTPError';
      (httpError as any).status = 502;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('bunker', { method: 'bunker', bunkerUri: 'bunker://test' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('502');
    });

    it.skip('should handle HTTP 503 Service Unavailable during peak load', async () => {
      const httpError = new Error('HTTP 503: Service Unavailable - Service temporarily unavailable');
      httpError.name = 'HTTPError';
      (httpError as any).status = 503;
      (mockDependencies.syncProfile as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('503');
    });

    it.skip('should handle HTTP 504 Gateway Timeout during slow operations', async () => {
      const httpError = new Error('HTTP 504: Gateway Timeout - Request timeout');
      httpError.name = 'HTTPError';
      (httpError as any).status = 504;
      (mockDependencies.authenticate as any).mockRejectedValue(httpError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: 'nsec1test' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('504');
    });
  });

  describe('Authentication Method Specific Tests', () => {
    describe('Extension Authentication', () => {
      it('should handle extension user rejection', async () => {
        const rejectionError = new Error('User rejected request');
        rejectionError.name = 'UserRejectedError';
        (mockDependencies.authenticate as any).mockRejectedValue(rejectionError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('rejected');
        expect(result.current.step).toBe('auth');
      });

      it('should handle extension permission denied', async () => {
        const permissionError = new Error('Permission denied');
        permissionError.name = 'PermissionDeniedError';
        (mockDependencies.authenticate as any).mockRejectedValue(permissionError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('Permission denied');
      });
    });

    describe('nsec Authentication', () => {
      it('should handle malformed nsec keys', async () => {
        const malformedError = new Error('Malformed private key');
        (mockDependencies.authenticate as any).mockRejectedValue(malformedError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('nsec', { method: 'nsec', nsec: 'not-an-nsec' });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('Malformed');
      });

      it('should handle nsec key derivation failures', async () => {
        const derivationError = new Error('Key derivation failed');
        (mockDependencies.authenticate as any).mockRejectedValue(derivationError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('nsec', { 
            method: 'nsec',
            nsec: 'nsec1invalidkeyfortestingpurposes' 
          });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('derivation failed');
      });
    });

    describe('Bunker Authentication', () => {
      it('should handle invalid bunker URI format', async () => {
        const uriError = new Error('Invalid bunker URI format');
        (mockDependencies.authenticate as any).mockRejectedValue(uriError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('bunker', { 
            method: 'bunker',
            bunkerUri: 'not-a-valid-uri' 
          });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('Invalid bunker URI');
      });

      it('should handle bunker relay connection failures', async () => {
        const relayError = new Error('Relay connection failed');
        relayError.name = 'RelayConnectionError';
        (mockDependencies.authenticate as any).mockRejectedValue(relayError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('bunker', { 
            method: 'bunker',
            bunkerUri: 'bunker://pubkey@unreachable-relay.com' 
          });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('Relay connection failed');
      });

      it('should handle bunker authentication timeout', async () => {
        const timeoutError = new Error('Bunker authentication timeout');
        timeoutError.name = 'BunkerTimeoutError';
        (mockDependencies.authenticate as any).mockRejectedValue(timeoutError);

        const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
        
        await act(async () => {
          await result.current.actions.authenticateWithNostr('bunker', { 
            method: 'bunker',
            bunkerUri: 'bunker://pubkey@slow-relay.com' 
          });
        });

        expect(result.current.getError('authenticateWithNostr')?.message).toContain('timeout');
      });
    });
  });

  describe('Profile Sync Edge Cases', () => {
    it('should handle profile sync network errors', async () => {
      const networkError = new Error('Network error during profile sync');
      networkError.name = 'NetworkError';
      (mockDependencies.syncProfile as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('Network error');
      expect(result.current.step).toBe('auth');
    });

    it('should handle profile sync API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      (mockDependencies.syncProfile as any).mockRejectedValue(rateLimitError);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.getError('authenticateWithNostr')?.message).toContain('Rate limit');
    });

    it('should handle missing profile data gracefully', async () => {
      // Mock successful auth but profile sync that returns no data
      (mockDependencies.syncProfile as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      expect(result.current.step).toBe('complete');
      expect(mockDependencies.authenticate).toHaveBeenCalled();
      expect(mockDependencies.syncProfile).toHaveBeenCalled();
    });
  });

  describe('Complete Flow Integration', () => {
    it('should execute complete authentication flow with all steps', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      // Verify initial state
      expect(result.current.step).toBe('auth');
      
      // Execute authentication
      await act(async () => {
        await result.current.actions.authenticateWithNostr('extension', { method: 'extension' });
      });

      // Verify completion
      expect(result.current.step).toBe('complete');
      expect(result.current.canGoBack).toBe(false);
      
      // Verify all dependencies were called
      expect(mockDependencies.authenticate).toHaveBeenCalledWith('extension', { method: 'extension' });
      expect(mockDependencies.syncProfile).toHaveBeenCalled();
      
      // Verify no errors
      expect(result.current.getError('authenticateWithNostr')).toBe(null);
    });

    it('should maintain consistent state throughout flow', async () => {
      const { result } = renderHook(() => useNostrLoginStateMachine(mockDependencies));
      
      // Track state changes
      const stateChanges: string[] = [];
      
      // Initial state
      stateChanges.push(result.current.step);
      
      await act(async () => {
        await result.current.actions.authenticateWithNostr('nsec', { 
          method: 'nsec',
          nsec: 'nsec1mockaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' 
        });
      });
      
      // Final state
      stateChanges.push(result.current.step);
      
      expect(stateChanges).toEqual(['auth', 'complete']);
    });
  });
});