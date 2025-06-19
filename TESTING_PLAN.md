# Wavlake Hybrid Authentication Testing Plan

## Overview
This document outlines comprehensive test cases for the Nostr + Firebase hybrid authentication system, covering all user flows, edge cases, and error scenarios.

## Test Environment Setup

### Prerequisites
1. **Web app** running at `http://localhost:5173`
2. **Catalog API** running at `http://localhost:3210`
3. **Test accounts**:
   - Legacy Firebase users (no Nostr linked)
   - Firebase users with Nostr already linked
   - Nostr-only users
   - Users with email recovery enabled
4. **Test tools**:
   - Nostr browser extension (Alby/nos2x)
   - Valid nsec keys for testing
   - Valid bunker URIs
   - Multiple browsers for session testing

### Database Setup
```sql
-- Create test legacy user (no Nostr linked)
INSERT INTO users (firebase_uid, email) VALUES 
  ('test_legacy_user_1', 'legacy1@test.com'),
  ('test_legacy_user_2', 'legacy2@test.com');

-- Create test user with existing Nostr link
INSERT INTO users (firebase_uid, email) VALUES 
  ('test_migrated_user', 'migrated@test.com');
INSERT INTO user_pubkey (user_id, pubkey) VALUES 
  ((SELECT id FROM users WHERE firebase_uid = 'test_migrated_user'), 'test_pubkey_123');
```

## Phase 1: Nostr Publishing Authentication Tests

### 1.1 Read-Only User Flow
**Test**: Ensure read-only users are not affected by Firebase integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Nostr (extension/nsec/bunker) | Success, no Firebase prompts |
| 2 | Browse content, play music | All features work normally |
| 3 | Check localStorage | No Firebase tokens present |
| 4 | Check network tab | No Firebase SDK loaded |
| 5 | Navigate to settings | No publishing options shown |

### 1.2 Publishing User Flow
**Test**: Publishing features require authentication

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Nostr | Success |
| 2 | Click "Enable Publishing" | Publishing auth dialog appears |
| 3 | Complete auth flow | Firebase token obtained |
| 4 | Try to upload audio | Upload succeeds with token |
| 5 | Check localStorage | Firebase token present |
| 6 | Refresh page | Publishing state persists |

### 1.3 Token Expiration
**Test**: Handle expired Firebase tokens gracefully

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable publishing | Success |
| 2 | Manually expire token in localStorage | - |
| 3 | Attempt to upload | Prompted to re-authenticate |
| 4 | Re-authenticate | New token obtained |
| 5 | Upload retry | Success with new token |

## Phase 2: Legacy Firebase User Migration Tests

### 2.1 First-Time Migration - Quick Setup
**Test**: Legacy user using recommended flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Sign in" → "Login to Existing Account" | Firebase login form appears |
| 2 | Enter valid credentials | Loading state shown |
| 3 | Submit | "Set Up Nostr Identity" screen |
| 4 | Click "Create New Nostr Identity" | Account creation starts |
| 5 | Wait for completion | Success screen with green checkmarks |
| 6 | Click "Continue to App" | Logged in with both systems |
| 7 | Check localStorage | Both Firebase and Nostr logins present |
| 8 | Check settings page | Shows npub and nsec |

### 2.2 First-Time Migration - Extension
**Test**: Legacy user with existing Nostr identity in extension

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Firebase credentials | "Set Up Nostr Identity" screen |
| 2 | Click "Extension" tab | Extension option shown |
| 3 | Click "Link Extension Identity" | Extension prompt appears |
| 4 | Approve in extension | "Linking accounts..." shown |
| 5 | Complete linking | Success screen |
| 6 | Verify in settings | Shows linked identities |

### 2.3 First-Time Migration - Import nsec
**Test**: Legacy user importing existing nsec

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Firebase credentials | "Set Up Nostr Identity" screen |
| 2 | Click "Nsec" tab | Nsec input shown |
| 3 | Enter invalid nsec | Error on submit |
| 4 | Enter valid nsec | Linking starts |
| 5 | Complete | Success, nsec saved locally |

### 2.4 Already Migrated User
**Test**: User who already completed migration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Firebase credentials | Loading state |
| 2 | Migration check completes | "Welcome Back!" screen immediately |
| 3 | Click "Continue to App" | Logged in normally |
| 4 | No Nostr setup required | Can access all features |

### 2.5 Migration Interruption
**Test**: User interrupts migration process

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start Firebase login | Login form |
| 2 | Click back button | Returns to main login |
| 3 | Start again | Process resumes normally |
| 4 | During Nostr setup, refresh page | Returns to login (not partial state) |
| 5 | Login again | Resumes at Nostr setup |

## Phase 3: Bidirectional Authentication Tests

### 3.1 Nostr → Firebase (Add Email Recovery)
**Test**: Nostr user adding email recovery

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with Nostr only | Success |
| 2 | Go to Settings → Account Recovery | Shows "Not configured" |
| 3 | Click "Add" | Email form appears |
| 4 | Enter email already in use | Error: "Email already registered" |
| 5 | Enter new email + password | Processing state |
| 6 | Complete | Shows "Active" with email |
| 7 | Logout and login with email | Can access same account |

### 3.2 Firebase → Nostr (Legacy with Multiple Pubkeys)
**Test**: Legacy user who loses access to first pubkey

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete initial migration | Has 1 linked pubkey |
| 2 | "Lose" the nsec (clear localStorage) | Cannot sign with Nostr |
| 3 | Login with Firebase email | Success |
| 4 | Prompted to select pubkey | Shows existing pubkey as unavailable |
| 5 | Choose to add new pubkey | Can link second pubkey |
| 6 | Verify in database | 2 pubkeys linked to same Firebase user |

### 3.3 Email Recovery Removal
**Test**: Remove email recovery option

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Have active email recovery | Shows in settings |
| 2 | Click "Remove" | Confirmation dialog |
| 3 | Confirm | Processing state |
| 4 | Complete | Shows "Not configured" |
| 5 | Try to login with email | Fails - account not found |
| 6 | Login with Nostr | Still works normally |

## Error Cases & Edge Scenarios

### 4.1 Network Errors
**Test**: Handle API failures gracefully

| Scenario | Expected Behavior |
|----------|-------------------|
| Catalog API down during migration | Show error, allow retry |
| Firebase auth service unavailable | Show specific error message |
| Timeout during linking | Show timeout error, maintain state |
| Network disconnection mid-flow | Can resume after reconnection |

### 4.2 Invalid Input Handling
**Test**: Validate all user inputs

| Input | Validation | Error Message |
|-------|------------|---------------|
| Email: "notanemail" | Invalid format | "Invalid email address" |
| Password: "123" | Too short | "Password must be at least 6 characters" |
| Nsec: "nsec1invalid" | Invalid format | "Invalid nsec format" |
| Bunker: "http://..." | Wrong protocol | "URI must start with bunker://" |
| Mismatched passwords | Don't match | "Passwords do not match" |

### 4.3 Concurrent Session Handling
**Test**: Multiple tabs/browsers

| Scenario | Expected Behavior |
|----------|-------------------|
| Login in tab A, open tab B | Tab B recognizes login |
| Enable publishing in tab A | Tab B shows publishing enabled |
| Logout in tab A | Tab B redirects to login |
| Different browsers | Independent sessions |

### 4.4 Storage & Persistence
**Test**: Local storage edge cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Clear localStorage mid-session | Graceful logout |
| Corrupted localStorage data | Handle parsing errors |
| Storage quota exceeded | Show appropriate error |
| Private/incognito mode | Warn about limited persistence |

### 4.5 Account State Conflicts
**Test**: Conflicting account states

| Scenario | Expected Behavior |
|----------|-------------------|
| Nostr pubkey already linked to different Firebase | Error: "Pubkey already associated" |
| Firebase account disabled | Show account disabled message |
| Email changed externally | Reflect new email in UI |
| Pubkey revoked/compromised | Allow unlinking and relinking |

## Security Test Cases

### 5.1 Authentication Security
**Test**: Verify security measures

| Test | Expected Result |
|------|-----------------|
| Inspect network traffic | All API calls use HTTPS |
| Check token storage | Tokens not in cookies or URL |
| XSS attempt in inputs | Inputs properly sanitized |
| CSRF protection | Requests include proper headers |
| Token leakage | Tokens not logged to console |

### 5.2 Authorization Checks
**Test**: Verify proper access control

| Test | Expected Result |
|------|-----------------|
| Access publishing without auth | Rejected with 401 |
| Use expired token | Prompted to re-authenticate |
| Tamper with token | Invalid token error |
| Access other user's data | Properly scoped to user |

## Performance Test Cases

### 6.1 Load Time Impact
**Test**: Measure performance impact

| Metric | Target | Test Method |
|--------|--------|-------------|
| Initial page load | < 3s | Without Firebase SDK |
| Publishing enable | < 2s | Time to load Firebase |
| Migration flow | < 5s | Full legacy migration |
| Token refresh | < 1s | Background refresh |

### 6.2 Resource Usage
**Test**: Monitor resource consumption

| Resource | Limit | Test Method |
|----------|-------|-------------|
| localStorage usage | < 1MB | Check all stored data |
| Memory usage | < 50MB increase | Profile before/after |
| Network requests | Minimal | Count API calls |

## Accessibility Test Cases

### 7.1 Keyboard Navigation
**Test**: Full keyboard accessibility

| Flow | Test | Expected |
|------|------|----------|
| Login forms | Tab through all fields | Logical tab order |
| Button activation | Enter/Space | Triggers action |
| Dialog escape | Esc key | Closes dialog |
| Focus management | After actions | Focus returns appropriately |

### 7.2 Screen Reader Support
**Test**: Screen reader compatibility

| Element | Test | Expected |
|---------|------|----------|
| Form labels | Read by screen reader | Clear descriptions |
| Error messages | Announced | Immediate notification |
| Loading states | Announced | "Loading" indication |
| Success messages | Announced | Clear confirmation |

## Regression Test Suite

### 8.1 Existing Features
**Verify no breaking changes to**:
- [ ] Standard Nostr login (extension)
- [ ] Nsec/bunker login
- [ ] Music playback
- [ ] Wallet functionality  
- [ ] Social features
- [ ] Settings persistence
- [ ] Profile management

### 8.2 Migration Path Testing
**Test upgrade scenarios**:
- [ ] User with only Nostr → adds Firebase
- [ ] User with only Firebase → adds Nostr  
- [ ] User switches between auth methods
- [ ] User on multiple devices

## Test Execution Checklist

### Daily Smoke Tests
- [ ] New user signup with "Get Started"
- [ ] Existing Nostr login
- [ ] Legacy Firebase login
- [ ] Upload audio file
- [ ] Settings page loads

### Release Testing
- [ ] All test cases in this document
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile device testing
- [ ] Performance profiling
- [ ] Security audit
- [ ] Accessibility audit

## Known Limitations & Expected Behaviors

1. **Firebase SDK Loading**: Only loads when publishing features are accessed
2. **Token Expiration**: Firebase tokens expire after 1 hour, automatic refresh implemented  
3. **Multiple Pubkeys**: One Firebase account can have multiple associated pubkeys
4. **Account Recovery**: Email/password is for recovery only, not primary login
5. **CSP Restrictions**: Development uses proxy for localhost API calls

## Monitoring & Metrics

### Key Metrics to Track
- Authentication success rate
- Migration completion rate  
- Time to complete migration
- Error rates by type
- Publishing feature adoption
- Account recovery usage

### Error Tracking
Log and monitor:
- Failed login attempts
- Migration failures
- Token refresh failures
- API errors
- Client-side exceptions