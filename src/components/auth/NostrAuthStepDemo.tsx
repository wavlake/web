/**
 * Demo component showcasing NostrAuthStep integration patterns and auto-linking capabilities.
 * 
 * This component demonstrates:
 * - Proper integration with Firebase authentication state
 * - Auto-linking configuration for seamless account connection
 * - Error handling and user feedback patterns
 * - Integration with existing authentication hooks
 * 
 * Production usage: This is a demo component. Use CompositeLoginDialog directly
 * for the full enhanced authentication flow in production applications.
 */

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { NostrAuthStep } from "./NostrAuthStep";
import { useLinkedPubkeysWithProfiles } from "@/hooks/useLinkedPubkeys";
import type { NLoginType } from "@nostrify/react/login";
import type { FirebaseUser } from "@/types/auth";

interface NostrAuthStepDemoProps {
  /** Controls dialog visibility */
  isOpen: boolean;
  /** Callback for closing the dialog */
  onClose: () => void;
  /** Callback fired on successful Nostr authentication */
  onSuccess: (login: NLoginType) => void;
  /** Optional Firebase user for demonstrating auto-linking functionality */
  mockFirebaseUser?: FirebaseUser;
  /** Optional specific pubkey to demonstrate expected pubkey authentication */
  expectedPubkey?: string;
}

export const NostrAuthStepDemo: React.FC<NostrAuthStepDemoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mockFirebaseUser,
  expectedPubkey
}) => {
  // Fetch linked pubkeys for the authenticated Firebase user
  const { data: linkedPubkeys = [] } = useLinkedPubkeysWithProfiles(mockFirebaseUser);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <NostrAuthStep
        firebaseUser={mockFirebaseUser}
        linkedPubkeys={linkedPubkeys}
        expectedPubkey={expectedPubkey}
        onSuccess={(login) => {
          onSuccess(login);
          onClose();
        }}
        onBack={onClose}
        enableAutoLink={true}
      />
    </Dialog>
  );
};

/**
 * Example usage in a page or component:
 * 
 * ```tsx
 * import { NostrAuthStepDemo } from "@/components/auth/NostrAuthStepDemo";
 * 
 * const MyComponent = () => {
 *   const [showDemo, setShowDemo] = useState(false);
 *   
 *   const handleLoginSuccess = (login: NLoginType) => {
 *     console.log("User logged in:", login);
 *     // Handle successful login
 *   };
 *   
 *   return (
 *     <div>
 *       <Button onClick={() => setShowDemo(true)}>
 *         Demo NostrAuthStep
 *       </Button>
 *       
 *       <NostrAuthStepDemo
 *         isOpen={showDemo}
 *         onClose={() => setShowDemo(false)}
 *         onSuccess={handleLoginSuccess}
 *       />
 *     </div>
 *   );
 * };
 * ```
 */

/**
 * Integration with CompositeLoginDialog (future implementation):
 * 
 * The NostrAuthStep component is designed to be integrated into the enhanced
 * authentication flow as follows:
 * 
 * 1. User selects authentication method in LoginChoiceStep
 * 2. If "Nostr Account" is selected, show NostrAuthStep directly
 * 3. If "Wavlake Account" is selected:
 *    - Show FirebaseAuthDialog first
 *    - On Firebase success, fetch linked pubkeys
 *    - Show NostrAuthStep with Firebase user and linked pubkeys
 *    - Enable auto-linking for seamless account connection
 * 
 * The component handles all edge cases:
 * - No linked pubkeys: User can sign in with any Nostr account
 * - Multiple linked pubkeys: User can choose which one to use
 * - Expected pubkey: User must sign in with specific account
 * - Auto-linking: Automatically links new pubkeys to Firebase account
 * - Error handling: Comprehensive error messages and recovery
 */

export default NostrAuthStepDemo;