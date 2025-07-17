/**
 * Simple Auth Flow State Logger
 *
 * Logs current step and relevant context for debugging during development.
 * Zero impact in production builds.
 */

// Only log in development
const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Log current auth flow state with context
 */
export function logAuthState(
  step: string,
  context: Record<string, unknown> = {}
) {
  if (!IS_DEV) return;

  const timestamp = new Date().toLocaleTimeString();

  console.log(`🔵 [AUTH FLOW] ${timestamp} | Step: ${step}`, context);
}
