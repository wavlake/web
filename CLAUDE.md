# Wavlake Project Overview

This is a Nostr client application built with React 18.x, TailwindCSS 3.x, Vite, shadcn/ui, and Nostrify.

## Technology Stack

- **React 18.x**: Modern React with hooks and concurrent rendering
- **TailwindCSS 3.x**: Utility-first CSS framework
- **Vite**: Fast build tool and dev server
- **shadcn/ui**: Accessible UI components with Radix UI
- **Nostrify**: Nostr protocol framework
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and caching
- **TypeScript**: Type-safe development

## Project Structure

- `/src/components/` - React components and layouts
- `/src/hooks/` - Custom hooks and Nostr integration  
- `/src/pages/` - Page components and routing
- `/src/lib/` - Utilities and shared logic
- `/public/` - Static assets

## Documentation

Detailed documentation is located in context-specific CLAUDE.md files:

- **UI Components**: [`src/components/ui/CLAUDE.md`](src/components/ui/CLAUDE.md)
  - shadcn/ui component reference and patterns
  
- **Nostr Integration**: [`src/hooks/CLAUDE.md`](src/hooks/CLAUDE.md)
  - Hooks for querying, publishing, and authentication
  - NIP implementations and best practices
  
- **Authentication**: [`src/components/auth/CLAUDE.md`](src/components/auth/CLAUDE.md)
  - Nostr + Firebase hybrid authentication
  - Login flows and security considerations
  
- **Layout System**: [`src/components/CLAUDE.md`](src/components/CLAUDE.md)
  - GlobalLayout architecture
  - Page development guidelines
  
- **Pages & Routing**: [`src/pages/CLAUDE.md`](src/pages/CLAUDE.md)
  - Dashboard implementation
  - Welcome flow and routing patterns
  - Wavlake-specific features

## Authentication System

### Current Status (Production Ready)
The authentication system is **fully implemented** with sophisticated state machine-based flows:

- **Authentication Hooks**: [`src/hooks/auth/CLAUDE.md`](src/hooks/auth/CLAUDE.md) - State machine hooks and flow orchestration
- **Authentication Components**: [`src/components/auth/CLAUDE.md`](src/components/auth/CLAUDE.md) - Flow components and step UI
- **Core Hooks**: [`src/hooks/CLAUDE.md`](src/hooks/CLAUDE.md) - Complete hooks documentation including auth

### Architecture Overview

**State Machine Pattern:**
- **Flow Hooks**: `useSignupFlow`, `useLegacyMigrationFlow`, `useNostrLoginFlow`
- **State Machines**: TypeScript-based predictable authentication flows
- **Step Components**: Reusable UI components for each authentication step
- **Dual Authentication**: Firebase token preferred, NIP-98 fallback

**Key Features:**
- **Multi-Method Support**: Extension, nsec, bunker authentication
- **Legacy Integration**: Firebase account linking and migration
- **Type Safety**: Comprehensive TypeScript implementation
- **Error Handling**: Robust error recovery and user feedback

**Implementation Status:**
- ✅ **Flow Components**: All flows fully implemented and tested
- ✅ **Step Components**: Complete UI component library
- ✅ **State Machines**: Production-ready state management
- ✅ **Authentication Logic**: Working implementation in `/src/pages/Login.tsx`

## Quick Start

### Development Practices

- Follow shadcn/ui component patterns
- Use `@/` path aliases for imports
- Let GlobalLayout handle headers/footers automatically
- Test with users having 0, 1, and multiple groups

### Testing Your Changes

Always run before considering a task complete:

```bash
npm run ci
```

This runs typecheck and build validation.

### Build Commands

- Development: `npm run build:dev`
- Production: `npm run build`

## Key Implementation Guidelines

### Authentication
- Maintain Nostr-only login approach
- Firebase only for group owner features
- Use `useCurrentUser()` for auth state

### Layout System  
- Never manually import Header/Footer components
- Use consistent spacing: `my-6 space-y-6`
- GlobalLayout handles all layout concerns

### Nostr Protocol
- Decode NIP-19 identifiers before use in filters
- Use TanStack Query with `useNostr()` for data fetching
- Handle encryption with NIP-44 when available

## Important Reminders

- Do what has been asked; nothing more, nothing less
- Never create files unless absolutely necessary
- Always prefer editing existing files
- Don't create documentation unless explicitly requested

### Enhanced Auth Work
- **Always base branches off `auth-updates`** - contains all implemented components
- **Check ENHANCED_AUTH_MASTER_TODO.md first** - shows current status and what's already done
- **Most core components are complete** - focus on integration and remaining Phase 3 work