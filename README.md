# Wavlake - Empowering Musicians & Fans Through Modern Protocols

Wavlake is creating a new, online world where musicians and listeners can freely transact with one another in an open ecosystem. Discover new music on Wavlake mobile, powered by Nostr. https://app.wavlake.com

This project was forked from [Chorus](https://github.com/andotherstuff/chorus), a decentralized community platform built on Nostr. We've adapted it specifically for the music community, adding features tailored for artists and fans.

## Key Features

- **Artist Communities**: Musicians can create dedicated spaces with custom branding, images, and descriptions — managed their way
- **Fan Discovery & Engagement**: Discover and participate in artist communities that match your musical interests
- **Direct Support & Payments**: Support your favorite artists directly using privacy-respecting Bitcoin payments powered by [Cashu](https://cashu.space)
- **Decentralized Music Platform**: Share music, updates, and connect with fans via the [Nostr protocol](https://github.com/nostr-protocol)
- **Pseudonymous Profiles**: Connect authentically while maintaining the privacy you choose
- **Mobile-First Design**: Optimized for music discovery and engagement on any smartphone

### Music-Focused Features

- **Artist Profiles**: Artist pages with music, links, and contact information
- **Music Sharing**: Upload and share tracks, albums, and audio content with your community
- **Fan Interaction**: Engage with fans through posts, replies, and direct messaging
- **Tour & Event Promotion**: Share tour dates, concerts, and music events with your fanbase
- **Merchandise Integration**: Connect fans to your merchandise and music sales

### Content & Interaction

- **Rich Posts**: Share music, images, and rich media content with your community
- **Threaded Discussions**: Engage in meaningful conversations with nested replies
- **Music Reactions**: React to tracks and posts with customizable emojis
- **Real-time Updates**: Stay updated with community activities and new music releases

### Privacy & Ownership

- **Artist Ownership**: Musicians own their data and communities through Nostr keys
- **Decentralized Storage**: Content stored across distributed networks, not corporate servers
- **Fan Privacy**: Fans control their data and can interact pseudonymously
- **Community Moderation**: Artists and fans collectively moderate their spaces

### Built-in Payments & Music Economy

- **Cashu Integration**: Native support for the [Cashu](https://cashu.space/) protocol
- **Direct Artist Support**: Fans can directly support musicians through micropayments
- **Music Monetization**: Artists earn Bitcoin for their content and community engagement
- **Tip & Support Features**: Built-in tipping for tracks, posts, and community contributions
- **Bitcoin-Native**: All payments powered by Bitcoin's Lightning Network
- **Privacy-First Transactions**: Private, non-custodial payments between artists and fans
- **Instant Transfers**: Fast, lightweight transactions for real-time support
- **Multiple Mints**: Support for various Cashu mints and payment providers

## Supported Nostr Event Kinds

### Core Protocol

- Kind 0: User metadata/profile
- Kind 1: Text note
- Kind 3: Follow list
- Kind 5: Deletion
- Kind 7: Reaction
- Kind 9735: Zap
- Kind 1984: Report

### Communities & Groups

- Kind 11: Post in a community
- Kind 1111: Reply to community posts
- Kind 4550: Post approval
- Kind 4551: Post removal
- Kind 4552: Join request
- Kind 4553: Leave request
- Kind 4554: Close report
- Kind 34550: Community definition
- Kind 34551: Approved members list
- Kind 34552: Declined members list
- Kind 34553: Banned members list
- Kind 34554: Pinned posts list
- Kind 34555: Pinned communities list

## Getting Started

1. **Visit the Platform**: Open [wavlake.com](https://wavlake.com) in your browser
2. **Create Your Identity**: Use any Nostr key or generate a new one for artist/fan identity
3. **Join Music Communities**: Browse and join artist communities that match your musical taste
4. **Start Engaging**: Share music, create posts, reply to others, and build your musical network
5. **Set Up Payments**: Configure your Cashu wallet to start supporting artists or receiving fan support

## For Musicians

- **Create Your Artist Community**: Set up a professional space for your music and fans
- **Share Your Music**: Upload tracks, share updates, and promote your latest releases
- **Connect with Fans**: Build direct relationships with your audience without platform intermediaries
- **Monetize Your Art**: Receive direct support from fans through Bitcoin micropayments
- **Own Your Data**: Maintain control over your content and community through decentralized protocols

## For Music Fans

- **Discover New Artists**: Find emerging and established musicians in a decentralized music ecosystem
- **Support Artists Directly**: Send Bitcoin payments directly to musicians you love
- **Engage Authentically**: Participate in music communities without algorithmic manipulation
- **Own Your Experience**: Control your data and music discovery preferences

## Technology Stack

### Frontend & Core

- **Frontend**: React 18.x with TypeScript
- **Styling**: TailwindCSS 3.x
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: TanStack Query
- **Routing**: React Router

### Decentralized Protocols

- **Nostr**: Decentralized social protocol for musician-fan connections
- **Blossom**: Decentralized blob storage for music and media files
- **Bitcoin**: Native cryptocurrency integration for artist support
- **Cashu**: Privacy-focused Bitcoin payments and micropayments
- **Lightning Network**: Fast, low-cost Bitcoin transactions

## Local Development

```bash
# Clone the repository
git clone https://github.com/wavlake/web.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## Contributing

We welcome contributions from the music and developer communities! Whether you're a musician with feature ideas or a developer who wants to improve the platform, your input is valuable.

## License

MIT License

## Links

- [Website](https://wavlake.com)
- [GitHub](https://github.com/wavlake/web)
- [Wavlake Music Community](https://wavlake.com)
- [Bug Reports & Feature Requests](https://github.com/wavlake/web/issues/new)

---

_Powered by Nostr, Blossom, and Bitcoin - Building the future of decentralized music_
