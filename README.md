# NostrGroups - A NIP-72 Groups Platform

A Facebook-inspired groups platform built on the Nostr protocol using NIP-72 for moderated communities.

## Features

- **Browse Communities**: Discover and join communities created by other users
- **Create Communities**: Start your own community with custom name, description, and image
- **Post to Communities**: Share text and images with community members
- **Moderation**: Community creators can approve posts and manage their communities
- **User Profiles**: View user profiles and their activity
- **Responsive Design**: Works on desktop and mobile devices

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
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to the displayed URL (usually http://localhost:5173)

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