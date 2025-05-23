# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **PWA Builder Optimization**: Complete App Store readiness with comprehensive icon set
  - Generated missing iOS-specific icons (152×152, 167×167, 180×180, 1024×1024)
  - Enhanced manifest.json with complete icon definitions including maskable variants
  - Added PWA screenshots for app store listings (desktop and mobile)
  - Improved service worker with enhanced caching strategies and push notification support
  - Expected PWA Builder score of 95%+ for seamless app store conversion
- **Push Notification System**: Native Nostr push notification support
  - Custom `usePushSubscription` hook for managing push subscriptions
  - Background sync for offline functionality
  - Notification click handling with deep linking to relevant content
- **Enhanced PWA Utilities**: Advanced PWA detection and management
  - `usePWA` hook for centralized PWA state management
  - Improved PWA install banners and user experience
  - Better detection of PWA mode across different platforms
- **Balance Display**: Enhanced Cashu wallet UI components
- **Group Guidelines**: New group management and moderation features
- **User Nutzap Dialog**: Improved ecash tipping interface
- NIP-05 verification system for user identity verification
- Image display support in posts with automatic URL hiding for posts with images
- Favicon support for better branding
- Chorus relay integration for improved performance
- Restored community activity indicators showing post count and participant count on group cards
- Added loading states for community statistics while data is being fetched
- Enhanced visual presentation of community metrics with badge-style elements
- Added activity indicators to My Groups section showing post count and active participants

### Enhanced
- **App Store Compatibility**: Comprehensive PWA to native app conversion support
  - All required icon sizes for iOS App Store and Google Play Store
  - Optimized manifest.json for PWA Builder compatibility
  - Enhanced service worker for better offline experience
- **PWA Installation Experience**: Improved installation flow and detection
- **Member Management**: Enhanced group member display and interaction
- **Profile System**: Better profile editing and user experience

### Fixed
- Improved member list loading and error handling
- Better handling of group join requests and permissions
- Enhanced responsive design for mobile devices
- Fixed various UI/UX issues in group management
- Improved error handling in wallet operations

### Technical
- **PWA Converter Documentation**: Complete planning and implementation guide
- Enhanced TypeScript support with better type safety
- Improved build process and development workflow
- Better code organization with centralized PWA utilities
- Enhanced testing and validation processes

EOF 2>&1
