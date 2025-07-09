/**
 * LinkedAccountCard Component
 * 
 * Displays a linked account with profile information, mirroring the legacy
 * ProfileDiscoveryScreen implementation. Uses useAuthor hook for real-time 
 * Nostr profile data.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import type { LinkedAccount } from '@/types/authFlow';

// ============================================================================
// Types
// ============================================================================

interface LinkedAccountCardProps {
  /** The linked account to display */
  account: LinkedAccount;
  /** Called when the account is selected */
  onSelect: () => void;
  /** Whether the card is disabled */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * LinkedAccountCard Component
 * 
 * Displays a linked account with profile information. This component mirrors
 * the legacy ProfileDiscoveryScreen's LinkedAccountCard implementation and
 * uses the useAuthor hook to fetch real-time Nostr profile data.
 * 
 * Features:
 * - Real-time profile data via useAuthor hook
 * - Avatar display with fallback
 * - Account name and pubkey display
 * - Primary account indicator
 * - Profile description (about field)
 * - Hover and click states
 * - Responsive design
 * 
 * @example
 * ```tsx
 * <LinkedAccountCard
 *   account={{
 *     pubkey: "npub123...",
 *     profile: { name: "Alice", picture: "https://..." },
 *     isPrimary: true
 *   }}
 *   onSelect={() => handleSelectAccount(account.pubkey)}
 * />
 * ```
 */
export function LinkedAccountCard({
  account,
  onSelect,
  disabled = false,
}: LinkedAccountCardProps) {
  // Use the existing useAuthor hook to get real-time profile data
  // This mirrors the legacy implementation exactly
  const author = useAuthor(account.pubkey);
  const profile = author.data?.metadata || account.profile;

  // Display name logic matching legacy implementation
  const displayName = profile?.name || profile?.display_name || "Unnamed Account";
  
  // Pubkey display format matching legacy implementation
  const pubkeyDisplay = `${account.pubkey.slice(0, 8)}...${account.pubkey.slice(-8)}`;

  return (
    <Card 
      className={`cursor-pointer transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-muted/50 active:bg-muted/70'
      }`}
      onClick={disabled ? undefined : onSelect}
    >
      <CardContent className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4">
        {/* Avatar - matches legacy sizing and fallback logic */}
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage src={profile?.picture} />
          <AvatarFallback>
            {displayName[0]?.toUpperCase() || account.pubkey.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Account Info - matches legacy structure */}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm sm:text-base truncate">
              {displayName}
            </p>
            {account.isPrimary && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">
                Primary
              </span>
            )}
          </div>
          
          {/* Pubkey display - matches legacy styling */}
          <p className="text-xs sm:text-sm text-muted-foreground font-mono">
            {pubkeyDisplay}
          </p>
          
          {/* Profile description - matches legacy implementation */}
          {profile?.about && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {profile.about}
            </p>
          )}
        </div>
        
        {/* Chevron icon - matches legacy implementation */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display name for an account (matches legacy logic)
 */
export function getDisplayName(account: LinkedAccount, metadata?: any): string {
  const profile = metadata || account.profile;
  return profile?.name || profile?.display_name || "Unnamed Account";
}

/**
 * Get pubkey display format (matches legacy logic)
 */
export function getPubkeyDisplay(pubkey: string): string {
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

/**
 * Check if account has profile data
 */
export function hasProfileData(account: LinkedAccount): boolean {
  return !!(account.profile?.name || account.profile?.display_name || account.profile?.picture);
}