# Chorus - Grow and give back to the communities that matter to you

Chorus is a decentralized, privacy-conscious, user-moderated groups platform inspired by the early promise of Facebook Groups reimagined on the Nostr protocol. It supports secure, pseudonymous communities where users can create, join, and contribute freely.

## 🌟 Key Features

- **Create & Curate Communities**: Start your own space with a custom name, image, and description — and moderate it your way
- **Browse & Join Groups**: Discover and participate in public communities that match your interests
- **Post Freely**: Share notes and images with your groups via the [Nostr protocol](hhttps://github.com/nostr-protocol)
- **Built-in Payments to Give & Get Support**: Contribute to the communities you care about or receive support for your work using simple, privacy-respecting payments powered by [Cashu](https://cashu.space)
- **Pseudonymous Profiles**: Find like-minded people and follow their work—without sharing more than you want to
- **Lightweight & On-the-Go Design**: Mobile-first, browser-based for use on any smartphone

### Content & Interaction
- **Rich Posts**: Share text and images with your community
- **Threaded Replies**: Engage in meaningful discussions with nested replies
- **Reactions**: React to posts with customizable emojis
- **Notifications**: Stay updated with community activities

### Privacy & Security
- **Pseudonymous**: Use any Nostr key for identity
- **Decentralized**: No central authority controls your data
- **User-Moderated**: Communities are managed by their members
- **Claim Your Handle**: Link your profile to a human-readable handle (like an email or domain)

### 💰 Built-in Payments & Support
- **Cashu Integration**: Native support for the [Cashu](https://cashu.space/) protocol
- **Community Funding**: Crowdfund causes through community-driven micropayments
- **Support Creators**: Pay fellow contributors and reward organizers
- **Receive Support**: Get funded for your work, activism, or ideas
- **Bitcoin Payments**: All payments powered by Bitcoin
- **Privacy-Focused**: Private, non-custodial payments
- **Instant Transfers**: Fast, lightweight transactions
- **Multiple Mints**: Support for various Cashu mints

## 🔧 Supported NIPs

Chorus implements several Nostr Improvement Proposals (NIPs) to provide a rich feature set:

### Core NIPs
- **NIP-01**: Basic protocol flow
- **NIP-05**: Mapping Nostr keys to DNS-based internet identifiers
- **NIP-07**: Browser extension for signing events
- **NIP-19**: bech32-encoded entities
- **NIP-44**: Encrypted payloads (versioned)

### Group Features
- **NIP-72**: Moderated communities
  - Kind 34550: Community definition
  - Kind 4550: Post approval
  - Kind 4551: Post removal
  - Kind 4552: Join request
  - Kind 4553: Leave request
  - Kind 14550: Approved members list
  - Kind 14551: Declined members list
  - Kind 14552: Banned users list
  - Kind 14553: Pinned groups

### Content & Interaction
- **NIP-11**: Text notes (posts)
- **NIP-25**: Reactions
- **NIP-94**: File attachments

### Payments & Tips
- **NIP-57**: Lightning zaps
- **NIP-60**: Cashu wallet integration
  - Kind 17375: Wallet info (replaceable event for wallet configuration)
  - Kind 7375: Token events (unspent proofs)
  - Kind 7376: Spending history (encrypted transaction records)
  - Kind 7374: Quote events (optional payment references)
  - Kind 10019: Zap info (payment configuration)
  - Kind 9321: Zap events (actual payments)

## 🚀 Getting Started

1. **Visit the Site**: Open [chorus.community](https://chorus.community) in your browser
2. **Create an Account**: Use any Nostr key or generate a new one
3. **Join Communities**: Browse and join groups that interest you
4. **Start Contributing**: Create posts, reply to others, and engage with your communities
5. **Set Up Payments**: Configure your Cashu wallet to start supporting others

## 💻 Development

### Technology Stack
- **Frontend**: React 18.x with TypeScript
- **Styling**: TailwindCSS 3.x
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: TanStack Query
- **Routing**: React Router

### Local Development
```bash
# Clone the repository
git clone https://github.com/andotherstuff/chorus.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🌐 Links

- [Website](https://chorus.community)
- [GitHub](https://github.com/andotherstuff/chorus)
- [+chorus Group](https://chorus.community/group/34550:932614571afcbad4d17a191ee281e39eebbb41b93fac8fd87829622aeb112f4d:and-other-stuff)
- [Bug Reports](https://github.com/andotherstuff/chorus/issues/new)
