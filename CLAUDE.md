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