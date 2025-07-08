import * as Sentry from "@sentry/react";

export function initializeSentry() {
  // Only initialize Sentry if DSN is provided
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log("Sentry DSN not configured, skipping initialization");
    return;
  }


  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || "development",
    
    // Integrations
    integrations: [
      // Performance monitoring is enabled by default in newer versions
      // BrowserTracing will be auto-included if performance monitoring is enabled
    ],
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || "unknown",
    
    // Privacy and security settings
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object') {
          // Don't send errors that might contain private keys or sensitive data
          const errorString = error.toString().toLowerCase();
          if (errorString.includes('private') || 
              errorString.includes('secret') || 
              errorString.includes('key') ||
              errorString.includes('nsec') ||
              errorString.includes('npub')) {
            return null;
          }
        }
      }
      
      // Filter out request data that might contain sensitive information
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['Authorization'];
        }
        
        // Remove query parameters that might contain sensitive data
        if (event.request.query_string) {
          delete event.request.query_string;
        }
      }
      
      return event;
    },
    
    // Configure what data to send
    beforeBreadcrumb(breadcrumb) {
      // Filter out console logs that might contain sensitive information
      if (breadcrumb.category === 'console') {
        const message = breadcrumb.message?.toLowerCase() || '';
        if (message.includes('private') || 
            message.includes('secret') || 
            message.includes('key') ||
            message.includes('nsec') ||
            message.includes('npub')) {
          return null;
        }
      }
      
      return breadcrumb;
    },
    
    // Error filtering
    ignoreErrors: [
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors that are not actionable
      'Network request failed',
      'Failed to fetch',
      // Common bot/crawler errors
      'ChunkLoadError',
      'Loading chunk',
    ],
    
    // User context
    initialScope: {
      tags: {
        component: "wavlake-web",
      },
    },
  });
}

// Helper function to set user context when available
export function setSentryUserContext(user: {
  id?: string;
  username?: string;
  email?: string;
  pubkey?: string;
  nip05?: string;
}) {
  Sentry.setUser({
    id: user.id || user.pubkey,
    username: user.username,
    email: user.email,
    // Add Nostr-specific user context
    pubkey: user.pubkey ? user.pubkey.slice(0, 8) + '...' : undefined, // Only first 8 chars for privacy
    nip05: user.nip05,
  });
}

// Helper function to add context to errors
export function addSentryContext(key: string, value: Record<string, unknown>) {
  Sentry.setContext(key, value);
}

// Helper function to capture exceptions manually
export function captureException(error: Error, context?: Record<string, string | number | boolean>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach((key) => {
        scope.setTag(key, String(context[key]));
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}