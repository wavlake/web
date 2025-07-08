/* eslint-disable react-refresh/only-export-components */
import React, { ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";

/**
 * Higher-order component that wraps any component with SentryErrorBoundary
 * 
 * This is useful for protecting specific components without modifying their code.
 * 
 * @example
 * ```tsx
 * const ProtectedComponent = withSentryErrorBoundary(MyComponent, <div>Custom fallback</div>);
 * ```
 * 
 * @param Component The component to wrap with error boundary
 * @param fallback Optional custom fallback UI (defaults to built-in error UI)
 * @returns Component wrapped with SentryErrorBoundary
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <SentryErrorBoundary fallback={fallback}>
        <Component {...props} />
      </SentryErrorBoundary>
    );
  };
}

/**
 * Hook-based error boundary using Sentry's built-in implementation
 * 
 * Use this for simpler integration when you don't need custom error UI:
 * 
 * @example
 * ```tsx
 * const MyComponent = SentryErrorBoundaryHook(MyBaseComponent, {
 *   fallback: ({ error }) => <div>Error: {error.message}</div>,
 *   beforeCapture: (scope, error) => {
 *     scope.setTag('section', 'user-profile');
 *   }
 * });
 * ```
 */
export const SentryErrorBoundaryHook = Sentry.withErrorBoundary;