import * as Sentry from "@sentry/react";

/**
 * Checks if a string contains Nostr secret keys that must never be transmitted
 * @param text The text to check
 * @returns true if the text contains nsec keys (bech32 or hex format)
 */
function containsNostrSecretKey(text: string): boolean {
  if (!text) return false;

  // Case-insensitive nsec detection (correct length)
  if (/nsec1[a-z0-9]{58}/i.test(text)) {
    return true;
  }

  // Context-aware hex detection (reduce false positives)
  if (/(?:priv|private|secret|key).*?[a-f0-9]{64}/i.test(text)) {
    return true;
  }

  // More specific nsec context check
  if (/\bnsec1\b/i.test(text)) {
    return true;
  }

  return false;
}

export async function initializeSentry() {
  // Only initialize Sentry if DSN is provided
  if (!import.meta.env.VITE_SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.warn("⚠️ Sentry DSN not configured - error monitoring disabled");
    }
    return;
  }

  // Initialize Sentry asynchronously to avoid blocking First Contentful Paint
  await new Promise((resolve) => setTimeout(resolve, 0));

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
      // Filter out errors that might contain Nostr secret keys
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === "object") {
          const errorString = error.toString();
          if (containsNostrSecretKey(errorString)) {
            console.warn(
              "Blocked Sentry error report containing potential secret key"
            );
            return null;
          }
        }
      }

      // Check error message and stack traces
      if (event.message && containsNostrSecretKey(event.message)) {
        console.warn("Blocked Sentry message containing potential secret key");
        return null;
      }

      // Check exception values
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value && containsNostrSecretKey(exception.value)) {
            console.warn(
              "Blocked Sentry exception containing potential secret key"
            );
            return null;
          }
          if (exception.stacktrace?.frames) {
            for (const frame of exception.stacktrace.frames) {
              if (frame.vars && JSON.stringify(frame.vars).includes("nsec")) {
                console.warn(
                  "Blocked Sentry frame vars containing potential secret key"
                );
                return null;
              }
            }
          }
        }
      }

      // Filter out request data that might contain sensitive information
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["Authorization"];
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
      // Filter out console logs that might contain Nostr secret keys
      if (breadcrumb.category === "console" && breadcrumb.message) {
        if (containsNostrSecretKey(breadcrumb.message)) {
          console.warn(
            "Blocked Sentry breadcrumb containing potential secret key"
          );
          return null;
        }
      }

      // Filter out breadcrumbs with sensitive data in other categories
      if (breadcrumb.data && JSON.stringify(breadcrumb.data).includes("nsec")) {
        console.warn(
          "Blocked Sentry breadcrumb data containing potential secret key"
        );
        return null;
      }

      return breadcrumb;
    },

    // Error filtering
    ignoreErrors: [
      // Browser extension errors
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      // Network errors that are not actionable
      "Network request failed",
      "Failed to fetch",
      // Common bot/crawler errors
      "ChunkLoadError",
      "Loading chunk",
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
    pubkey: user.pubkey ? user.pubkey.slice(0, 8) + "..." : undefined, // Only first 8 chars for privacy
    nip05: user.nip05,
  });
}

// Helper function to add context to errors
export function addSentryContext(key: string, value: Record<string, unknown>) {
  Sentry.setContext(key, value);
}

/**
 * Helper function to capture exceptions manually with optional context
 *
 * @example
 * ```tsx
 * try {
 *   // risky operation
 * } catch (error) {
 *   captureException(error, {
 *     userId: user.id,
 *     feature: 'payment-processing',
 *     action: 'create-invoice'
 *   });
 * }
 * ```
 *
 * @param error The error to capture
 * @param context Optional context tags to add to the error report
 */
export function captureException(
  error: Error,
  context?: Record<string, string | number | boolean>
) {
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
