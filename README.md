# Chorus - Grow and give back to the communities that matter to you

Chorus is a decentralized, privacy-conscious, user-moderated groups platform inspired by the early promise of Facebook Groups reimagined on the Nostr protocol. It supports secure, pseudonymous communities where users can create, join, and contribute freely.

## Features

- **Browse Communities**: Discover and join communities created by other users
- **Create Communities**: Start your own community with custom name, description, and image
- **Post to Communities**: Share text and images with community members
- **Moderation**: Community creators can manage their communities their way
- **User Profiles**: View user profiles and their activity
- **Responsive Design**: Mobile-first, browser-based for use on any smartphone

## Technology Stack

- **React 18.x**: Modern React with hooks and functional components
- **TailwindCSS 3.x**: Utility-first CSS framework for styling
- **Vite**: Fast build tool and development server
- **shadcn/ui**: Unstyled, accessible UI components
- **Nostrify**: Nostr protocol framework for web
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and state management

## Nostr Protocol Integration

This application implements NIP-72 for moderated communities:

- **Kind 34550**: Community definition events
- **Kind 4550**: Post approval events
- **Kind 1**: Standard text note events (posts)

## Getting Started

1. Clone the repository
2. Start the development server: `npm run dev`
3. Open your browser to the displayed URL (usually http://localhost:5173)

## Building for Production

```bash
npm run build
```

## Deployment

```bash
npm run deploy
```

## License

MIT
