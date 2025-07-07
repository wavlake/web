# Wavlake Pages & Routing

## Dashboard Implementation

### Navigation Structure
- `/dashboard` (no params) → Shows group list for multi-group users
- `/dashboard?communityId=X` → Shows full dashboard with sidebar
- Single group users auto-redirect to include communityId

### Dashboard Views

1. **No Groups**: Welcome message with "Create Your Artist Page" CTA
2. **Multiple Groups**: Clean list of owned/moderated communities  
3. **Selected Group**: Full dashboard with tabs:
   - Overview, Music, Updates, Community, Moderation, Wallet, Settings, Support

### Smart Header Buttons
- Single group: "Add another Artist"
- Multi-group: "Return to Dashboard List"

## Welcome Flow

**WelcomeRedirect.tsx**: Auto-redirects based on associations
- 0 groups → `/welcome`
- 1 group → `/dashboard?communityId=X`
- Multiple groups → `/dashboard`

**WelcomePage.tsx**: Role selection for new users
- Artist path → `/dashboard`
- Listener path → `/`

## URL Parameter Management

Uses `communityId` parameter (not `community`):
- Automatic URL updates when selecting communities
- Clean integration with React Router
- Preserved across navigation

## Key Implementation Notes

### Dashboard Navigation
- No dropdown selector in dashboard
- URL parameter-based navigation
- Maintain list view vs full dashboard separation
- Test with 0, 1, and multiple groups

### Authentication Patterns  
- Nostr-only login (no Firebase in login flow)
- FirebaseOwnerGuard redirects to `/link-firebase`
- Simple, streamlined auth experience

### Feature Development
- Follow existing hook patterns
- Use FirebaseOwnerGuard for owner features
- Keep navigation predictable
- Respect GlobalLayout system (no manual headers)

## Route Overview

### Public Routes
- `/` - Landing page (no layout)
- `/welcome` - New user onboarding (no layout)
- `/groups` - Browse communities
- `/trending` - Trending content
- `/profile/:npub` - User profiles

### Authenticated Routes
- `/dashboard` - Artist dashboard
- `/settings` - User settings
- `/cashu-wallet` - Wallet interface

### Group Routes  
- `/group/:naddr` - Group detail page
- `/group/:naddr/posts` - Group posts feed
- `/group/:naddr/guidelines` - Community guidelines