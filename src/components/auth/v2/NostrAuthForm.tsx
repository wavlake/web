/**
 * Nostr Authentication Form Component
 * 
 * Pure UI component for Nostr authentication.
 * All business logic is provided via props - no internal state management.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import type { 
  NostrAuthMethod, 
  NostrCredentials 
} from '@/types/authFlow';
import { 
  getMethodDisplayName, 
  getMethodDescription,
  extractPubkeyFromNsec 
} from '@/hooks/auth/useNostrAuthentication';

// ============================================================================
// Types
// ============================================================================

interface NostrAuthFormProps {
  /** Called when authentication is attempted */
  onAuthenticate: (method: NostrAuthMethod, credentials: NostrCredentials) => Promise<void>;
  /** Called when user wants to go back */
  onBack: () => void;
  /** Whether authentication is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Methods available for authentication */
  supportedMethods: NostrAuthMethod[];
  /** Expected pubkey for validation (optional) */
  expectedPubkey?: string;
  /** Whether to show mismatch warnings */
  showMismatchWarning?: boolean;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

interface FormState {
  nsec: string;
  bunkerUri: string;
  activeTab: NostrAuthMethod;
  mismatchWarning: {
    show: boolean;
    expectedPubkey: string;
    enteredPubkey: string;
  } | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * NostrAuthForm Component
 * 
 * A clean, focused component for Nostr authentication that replaces the
 * complex 920-line NostrAuthStep component from the legacy system.
 * 
 * Features:
 * - Pure presentation component (no business logic)
 * - Support for extension, nsec, and bunker authentication
 * - Real-time validation feedback
 * - File upload support for private keys
 * - Mismatch detection and warnings
 * - Responsive design
 * 
 * @example
 * ```tsx
 * function NostrAuthScreen() {
 *   const { authenticate, isLoading, error, supportedMethods } = useNostrAuthentication();
 *   
 *   return (
 *     <NostrAuthForm
 *       onAuthenticate={authenticate}
 *       onBack={() => send({ type: 'BACK' })}
 *       isLoading={isLoading}
 *       error={error}
 *       supportedMethods={supportedMethods}
 *     />
 *   );
 * }
 * ```
 */
export function NostrAuthForm({
  onAuthenticate,
  onBack,
  isLoading = false,
  error,
  supportedMethods,
  expectedPubkey,
  showMismatchWarning = true,
  title = 'Sign in with Nostr',
  description = 'Access your account securely with Nostr',
}: NostrAuthFormProps) {
  
  const [formState, setFormState] = useState<FormState>({
    nsec: '',
    bunkerUri: '',
    activeTab: supportedMethods[0] || 'extension',
    mismatchWarning: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form state
  const updateFormState = (updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  // Handle nsec input change with real-time mismatch detection
  const handleNsecChange = (value: string) => {
    updateFormState({ nsec: value });
    
    if (showMismatchWarning && expectedPubkey && value.trim()) {
      const enteredPubkey = extractPubkeyFromNsec(value.trim());
      
      if (enteredPubkey && enteredPubkey !== expectedPubkey) {
        updateFormState({
          mismatchWarning: {
            show: true,
            expectedPubkey,
            enteredPubkey,
          }
        });
      } else {
        updateFormState({ mismatchWarning: null });
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const trimmedContent = content.trim();
      handleNsecChange(trimmedContent);
    };
    reader.readAsText(file);
  };

  // Handle authentication attempts
  const handleExtensionAuth = async () => {
    await onAuthenticate('extension', { method: 'extension' });
  };

  const handleNsecAuth = async () => {
    if (!formState.nsec.trim()) return;
    await onAuthenticate('nsec', { method: 'nsec', nsec: formState.nsec.trim() });
  };

  const handleBunkerAuth = async () => {
    if (!formState.bunkerUri.trim()) return;
    await onAuthenticate('bunker', { method: 'bunker', bunkerUri: formState.bunkerUri.trim() });
  };

  // Validation helpers
  const isNsecValid = formState.nsec.trim().length > 0 && formState.nsec.startsWith('nsec1');
  const isBunkerValid = formState.bunkerUri.trim().length > 0 && formState.bunkerUri.startsWith('bunker://');

  return (
    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
      <DialogHeader className="px-6 pt-6 pb-0 relative">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 h-8 w-8"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
        
        <DialogDescription className="text-center text-muted-foreground mt-2">
          {description}
        </DialogDescription>
      </DialogHeader>

      <div className="px-6 py-6 space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Mismatch Warning */}
        {formState.mismatchWarning?.show && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Account Mismatch Detected</p>
                <p className="text-sm">
                  The private key you entered belongs to a different account than expected.
                </p>
                <div className="text-xs space-y-1 font-mono">
                  <div>Expected: ...{formState.mismatchWarning.expectedPubkey.slice(-8)}</div>
                  <div>Entered: ...{formState.mismatchWarning.enteredPubkey.slice(-8)}</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Authentication Methods */}
        <Tabs 
          value={formState.activeTab} 
          onValueChange={(value) => updateFormState({ activeTab: value as NostrAuthMethod })}
          className="w-full"
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${supportedMethods.length}, 1fr)` }}>
            {supportedMethods.map(method => (
              <TabsTrigger key={method} value={method}>
                {getMethodDisplayName(method).replace(' ', '')}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Extension Authentication */}
          {supportedMethods.includes('extension') && (
            <TabsContent value="extension" className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
                <div className="text-sm text-muted-foreground mb-4">
                  {getMethodDescription('extension')}
                </div>
                <Button
                  className="w-full rounded-full py-6"
                  onClick={handleExtensionAuth}
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Login with Extension'}
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  Supports Alby, nos2x, and other NIP-07 extensions
                </div>
              </div>
            </TabsContent>
          )}

          {/* Nsec Authentication */}
          {supportedMethods.includes('nsec') && (
            <TabsContent value="nsec" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="nsec"
                    className="text-sm font-medium text-foreground"
                  >
                    Enter your private key (nsec)
                  </label>
                  <Input
                    id="nsec"
                    type="password"
                    value={formState.nsec}
                    onChange={(e) => handleNsecChange(e.target.value)}
                    className="rounded-lg focus-visible:ring-primary"
                    placeholder="nsec1..."
                    disabled={isLoading}
                  />
                  <div className="text-xs text-muted-foreground">
                    Your private key is never stored and remains secure
                  </div>
                </div>

                <div className="text-center">
                  <input
                    type="file"
                    accept=".txt,.key"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Private Key File
                  </Button>
                </div>

                <Button
                  className="w-full rounded-full py-6 mt-4"
                  onClick={handleNsecAuth}
                  disabled={isLoading || !isNsecValid}
                >
                  {isLoading 
                    ? 'Verifying...' 
                    : formState.mismatchWarning?.show 
                      ? 'Proceed with This Account'
                      : 'Login with Private Key'
                  }
                </Button>
              </div>
            </TabsContent>
          )}

          {/* Bunker Authentication */}
          {supportedMethods.includes('bunker') && (
            <TabsContent value="bunker" className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="bunkerUri"
                  className="text-sm font-medium text-foreground"
                >
                  Bunker URI (NIP-46)
                </label>
                <Input
                  id="bunkerUri"
                  value={formState.bunkerUri}
                  onChange={(e) => updateFormState({ bunkerUri: e.target.value })}
                  className="rounded-lg focus-visible:ring-primary"
                  placeholder="bunker://..."
                  disabled={isLoading}
                />
                {formState.bunkerUri && !isBunkerValid && (
                  <div className="text-destructive text-xs">
                    Invalid bunker URI format. Must be a valid bunker:// URL.
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {getMethodDescription('bunker')}
                </div>
              </div>

              <Button
                className="w-full rounded-full py-6"
                onClick={handleBunkerAuth}
                disabled={isLoading || !isBunkerValid}
              >
                {isLoading ? 'Connecting...' : 'Connect with Bunker'}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DialogContent>
  );
}