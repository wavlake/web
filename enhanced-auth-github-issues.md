# Enhanced Authentication GitHub Issues

This document contains the GitHub issues for implementing enhanced authentication in Wavlake, organized by phase and ready for the `/issues` command.

## Phase 1: Enhanced Login Flow Foundation

### Issue 1: Create CompositeLoginDialog component
Create CompositeLoginDialog.tsx - Main orchestrator for enhanced login flows that combines Firebase and Nostr authentication paths with automatic pubkey linking. This component will replace the current simple login flow with a multi-step process that can handle legacy users with existing accounts.

**Labels:** enhancement, authentication, frontend

---

### Issue 2: Create LoginChoiceStep component  
Create LoginChoiceStep.tsx - Three-option landing page component that presents users with "Get Started", "I have a Wavlake account", and "I have a Nostr account" options. This replaces the current binary choice with a clearer user experience that guides different user types to appropriate flows.

**Labels:** enhancement, authentication, frontend, UX

---

### Issue 3: Create NostrAuthStep component
Create NostrAuthStep.tsx - Enhanced Nostr authentication component with auto-linking capabilities. This component handles Nostr key authentication and automatically links the pubkey to Firebase accounts when appropriate, supporting extension logins, nsec input, and NIP-46 bunker connections.

**Labels:** enhancement, authentication, frontend, nostr

---

### Issue 4: Create ProfileSelectionStep component
Create ProfileSelectionStep.tsx - Component for displaying and selecting linked pubkeys when a Firebase user has multiple associated Nostr accounts. Shows profile information for each linked account to help users choose the correct identity.

**Labels:** enhancement, authentication, frontend, profile

---

### Issue 5: Create useAutoLinkPubkey hook
Create useAutoLinkPubkey.ts hook - Handle automatic pubkey linking between Firebase accounts and Nostr identities. This hook manages the API calls and state for linking pubkeys when users authenticate, with proper error handling for failed linking attempts.

**Labels:** enhancement, authentication, frontend, hooks

---

### Issue 6: Create useLinkedPubkeys hook
Create useLinkedPubkeys.ts hook - Fetch and manage linked pubkeys for Firebase accounts, including associated profile data. This hook provides the data needed for profile selection and account discovery flows.

**Labels:** enhancement, authentication, frontend, hooks

---

### Issue 7: Test enhanced login flows integration
Comprehensive testing of Phase 1 enhanced login components including email/password authentication flow, three-option landing page navigation, pubkey auto-linking functionality, profile selection for multiple accounts, and verification that existing functionality remains intact.

**Labels:** enhancement, authentication, testing

---

## Phase 2: Enhanced Landing Page & Login Flows

### Issue 8: Update Index.tsx for enhanced login flow
Update Index.tsx - Add enhanced login flow option to main landing page, allowing users to access the new three-option authentication experience while maintaining backward compatibility with existing flows.

**Labels:** enhancement, authentication, frontend

---

### Issue 9: Update LoginArea.tsx component
Update LoginArea.tsx - Support both enhanced and legacy authentication flows with proper feature flagging or user preference detection. This allows gradual rollout of the enhanced experience.

**Labels:** enhancement, authentication, frontend

---

### Issue 10: Create useLegacyProfile hook
Create useLegacyProfile.ts hook - Fetch Wavlake profile data for legacy users to populate new Nostr accounts. This hook retrieves existing user data (name, bio, avatar, etc.) to provide continuity when linking accounts.

**Labels:** enhancement, authentication, frontend, hooks, legacy

---

### Issue 11: Create generateNostrAccountWithProfile utility
Create generateNostrAccountWithProfile.ts - Account generation utility that creates new Nostr accounts pre-populated with legacy Wavlake profile data. Ensures seamless transition for existing users creating their first Nostr identity.

**Labels:** enhancement, authentication, frontend, nostr, legacy

---

### Issue 12: Implement auto-linking error handling
Implement graceful error handling for auto-linking failures - Ensure authentication flows continue even when pubkey linking fails, with appropriate user feedback and retry mechanisms. Non-blocking linking is critical for user experience.

**Labels:** enhancement, authentication, frontend, error-handling

---

### Issue 13: Add linking success/failure notifications
Add success/failure toast notifications - Provide clear user feedback when account linking succeeds or fails, with actionable next steps. Users should understand the status of their account linking without blocking their authentication flow.

**Labels:** enhancement, authentication, frontend, UX, notifications

---

## Phase 3: Upload Flow Integration

### Issue 14: Create UploadRequiredDialog component
Create UploadRequiredDialog.tsx - Lightweight dialog that prompts users to link their accounts when attempting to upload content. This provides just-in-time linking with clear value proposition and easy cancellation.

**Labels:** enhancement, authentication, frontend, upload

---

### Issue 15: Update upload components for linking detection
Update upload components - Add linking detection before uploads and integrate with UploadRequiredDialog to ensure only linked accounts can upload content. Maintain smooth user experience with clear guidance.

**Labels:** enhancement, authentication, frontend, upload

---

### Issue 16: Create useUploadWithLinking hook
Create useUploadWithLinking.ts hook - Upload flow integration that checks account linking status and guides users through linking process when needed. Handles the coordination between upload attempts and account requirements.

**Labels:** enhancement, authentication, frontend, hooks, upload

---

### Issue 17: Add group creation linking detection
Add linking detection to group creation flows - Ensure group creation requires linked accounts and prompt users for linking when needed. Integrate with existing group creation components smoothly.

**Labels:** enhancement, authentication, frontend, groups

---

## Phase 5: Testing & Quality Assurance

### Issue 18: Test all user authentication flows
Comprehensive testing of all authentication flows: New User ("Get Started"), Legacy User with Linked Pubkey, Legacy User without Linked Pubkey, Existing Nostr User, Upload Attempt flow, and all error scenarios including network failures and invalid data.

**Labels:** enhancement, authentication, testing, QA

---

### Issue 19: Cross-browser and device testing
Test enhanced authentication across Chrome, Firefox, Safari on desktop and mobile browsers (iOS Safari, Android Chrome). Verify PWA functionality if applicable and test email client integrations with Gmail, Outlook, Apple Mail.

**Labels:** enhancement, authentication, testing, cross-browser, mobile

---

### Issue 20: Performance testing for auth flows
Measure authentication flow performance including time to complete each flow, testing with slow network conditions (3G simulation), bundle size optimization for new components, and concurrent user scenarios with rate limiting.

**Labels:** enhancement, authentication, testing, performance

---

## Phase 6: Documentation & Deployment

### Issue 21: Update authentication documentation
Update help documentation for new authentication options, create troubleshooting guide for common issues and solutions, and document account linking benefits for users. Ensure clear guidance for all user types.

**Labels:** enhancement, authentication, documentation

---

### Issue 22: Update developer documentation
Update component documentation for all new components, document any API changes and enhanced functionality, create deployment guide covering Firebase setup and environment variables, and update README with new authentication features.

**Labels:** enhancement, authentication, documentation, developer

---

### Issue 23: Set up authentication monitoring
Deploy to staging environment for full testing, set up monitoring for authentication success rates and error tracking, configure analytics to track authentication method usage patterns, and prepare production deployment with gradual rollout.

**Labels:** enhancement, authentication, deployment, monitoring

---

## Future Phase: Firebase Passwordless Authentication (Deferred)

### Issue 24: Enable Firebase passwordless authentication
Enable "Email link (passwordless sign-in)" option in Firebase Console, configure email templates and authorized domains for production use. This implements the foundation for magic link authentication as documented in FIREBASE_PASSWORDLESS_AUTH_DESIGN.md.

**Labels:** enhancement, authentication, firebase, passwordless, future

---

### Issue 25: Create EmailLinkInputForm component
Create EmailLinkInputForm.tsx - Email input component for magic links with validation, loading states, and error handling. Part of the tabbed interface enhancement to FirebaseAuthDialog for passwordless authentication.

**Labels:** enhancement, authentication, frontend, passwordless, future

---

### Issue 26: Create EmailLinkSentView component
Create EmailLinkSentView.tsx - "Check your email" screen with resend functionality, countdown timer, and clear instructions. Provides excellent UX for users waiting for magic link emails.

**Labels:** enhancement, authentication, frontend, passwordless, UX, future

---

### Issue 27: Create useEmailLinkAuth hook
Create useEmailLinkAuth.ts hook - Handle email link sending and completion with comprehensive error handling, rate limiting, and cross-device support. Core logic for passwordless authentication flow.

**Labels:** enhancement, authentication, frontend, hooks, passwordless, future

---

### Issue 28: Create AuthComplete page and routing
Create AuthComplete.tsx page and add /auth/complete route - Handle magic link completion with loading states, error handling, and proper redirects. Supports cross-device authentication scenarios.

**Labels:** enhancement, authentication, frontend, routing, passwordless, future

---

### Issue 29: Update FirebaseAuthDialog for passwordless
Update FirebaseAuthDialog.tsx - Add tabbed interface supporting both Password and Passwordless authentication methods. Maintains backward compatibility while adding modern authentication options.

**Labels:** enhancement, authentication, frontend, passwordless, future

---

## Instructions for Creating Issues

To create these issues using the `/issues` command, copy each issue section and run:

```
/issues [paste issue content here]
```

For example:
```
/issues Create CompositeLoginDialog.tsx - Main orchestrator for enhanced login flows that combines Firebase and Nostr authentication paths with automatic pubkey linking. This component will replace the current simple login flow with a multi-step process that can handle legacy users with existing accounts.

Labels: enhancement, authentication, frontend
```

Each issue includes:
- Clear title and description
- Relevant labels for organization
- Proper categorization by phase
- Implementation context from the master todo

The issues are designed to be implementable in sequence, with clear dependencies between phases.