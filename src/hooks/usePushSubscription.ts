import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// VAPID public key - this would come from environment variables in production
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HycWcqUeMgocvu80aw5iH8KxKCXKxGOKWOW4XRQDhGHZN8PBiKk3YgWo8w';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  subscription: PushSubscription | null;
  error: string | null;
}

interface SubscriptionData {
  id?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: null,
    subscription: null,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
    
    setState(prev => ({ 
      ...prev, 
      isSupported,
      permission: isSupported ? Notification.permission : null 
    }));
  }, []);

  // Listen for service worker messages (notification updates)
  useEffect(() => {
    if (!state.isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_NOTIFICATION') {
        // Refresh notifications when SW receives a push
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else if (event.data?.type === 'NAVIGATE_TO') {
        // Handle navigation from notification clicks
        window.location.href = event.data.url;
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [state.isSupported, queryClient]);

  // Get current subscription status
  const checkSubscription = useCallback(async () => {
    if (!state.isSupported || !user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        subscription,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to check subscription'
      }));
    }
  }, [state.isSupported, user]);

  // Check subscription on mount and user change
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Fetch user's subscriptions from server
  const { data: serverSubscriptions = [] } = useQuery({
    queryKey: ['push-subscriptions', user?.pubkey],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        const response = await fetch('/api/catalog/push/subscriptions', {
          headers: {
            'X-Nostr-Pubkey': user.pubkey,
          },
        });

        if (!response.ok) {
          return [];
        }

        return await response.json();
      } catch (error) {
        console.warn('Failed to fetch subscriptions:', error);
        return [];
      }
    },
    enabled: !!user && state.isSupported,
  });

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async (): Promise<SubscriptionData> => {
      if (!state.isSupported) {
        throw new Error('Push notifications are not supported');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker and get push subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionData: SubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || '',
          auth: subscription.toJSON().keys?.auth || '',
        }
      };

      // Send subscription to server - using catalog API
      const response = await fetch('/api/catalog/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nostr-Pubkey': user?.pubkey || '',
        },
        body: JSON.stringify({
          ...subscriptionData,
          nostrPubkey: user?.pubkey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      const result = await response.json();
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
        permission: 'granted',
        error: null
      }));

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId?: string) => {
      if (!state.subscription) {
        throw new Error('No active subscription found');
      }

      // Unsubscribe from browser
      await state.subscription.unsubscribe();

      // Remove from server
      try {
        const response = await fetch('/api/catalog/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Nostr-Pubkey': user?.pubkey || '',
          },
          body: JSON.stringify({
            endpoint: state.subscription.endpoint,
            nostrPubkey: user?.pubkey,
          }),
        });

        if (!response.ok) {
          console.warn('Failed to remove subscription from server');
        }
      } catch (error) {
        console.warn('Failed to remove subscription from server:', error);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
        error: null
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    },
  });

  return {
    ...state,
    serverSubscriptions,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    checkSubscription,
  };
}

// Hook for sending test notifications
export function useTestPushNotification() {
  const { user } = useCurrentUser();
  
  return useMutation({
    mutationFn: async (testData: { title: string; body: string }) => {
      if (!user) {
        throw new Error('Must be logged in to send test notification');
      }

      const response = await fetch('/api/catalog/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nostr-Pubkey': user.pubkey,
        },
        body: JSON.stringify({
          ...testData,
          nostrPubkey: user.pubkey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server returned ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return {
        ...result,
        timestamp: Date.now(), // Add timestamp for user feedback
      };
    },
  });
}
