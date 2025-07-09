/**
 * New Authentication System Entry Point
 * 
 * This replaces the complex 312-line legacy Index.tsx with a clean,
 * state machine-driven authentication flow.
 */

import React from 'react';
import { AuthFlow } from '@/components/auth/v2/AuthFlow';

/**
 * Index Page Component
 * 
 * The main entry point for authentication, now dramatically simplified
 * thanks to the new architecture. This component is now just a wrapper
 * around the AuthFlow component.
 * 
 * Improvements over legacy system:
 * - Reduced from 312 lines to ~20 lines
 * - No scattered state management
 * - No complex conditional rendering
 * - Clean separation of concerns
 * - Predictable state transitions
 * 
 * The legacy system is preserved at /legacy-login for reference.
 */
export default function Index() {
  return <AuthFlow />;
}