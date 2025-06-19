import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Lock, Shield, Upload, Sparkles } from "lucide-react";
import type { NostrEvent } from "@nostrify/nostrify";
import { generateSecretKey, nip19, getEventHash, getPublicKey, finalizeEvent } from "nostr-tools";
import { NLogin } from "@nostrify/react/login";

import { 
  initializeFirebasePublishing, 
  isPublishingConfigured 
} from "@/lib/firebasePublishing";
import { generateFakeName } from "@/lib/utils";
import { useNostrLogin } from "@nostrify/react/login";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { toast } from "@/hooks/useToast";

interface FirebaseLegacyLoginProps {
  onBack: () => void;
  onComplete: () => void;
}

interface MigrationStep {
  step: 'login' | 'nostr-setup' | 'linking' | 'complete';
  data?: any;
}

interface NostrSetupData {
  firebaseUser: any;
  firebaseToken: string;
}

export function FirebaseLegacyLogin({ onBack, onComplete }: FirebaseLegacyLoginProps) {
  const [migrationState, setMigrationState] = useState<MigrationStep>({ step: 'login' });
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Nostr setup state
  const [nsec, setNsec] = useState('');
  const [bunkerUri, setBunkerUri] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks for Nostr functionality
  const { addLogin } = useNostrLogin();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { mutateAsync: createCashuWallet } = useCreateCashuWallet();

  // Import Firebase auth functions dynamically
  const signInWithEmailAndPassword = React.useMemo(() => {
    if (!isPublishingConfigured()) return null;
    
    // Dynamic import to avoid loading Firebase for users who don't need it
    return import('firebase/auth').then(auth => auth.signInWithEmailAndPassword);
  }, []);

  const handleFirebaseLogin = async () => {
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!signInWithEmailAndPassword) {
        throw new Error("Firebase not configured");
      }

      const { auth } = initializeFirebasePublishing();
      const signIn = await signInWithEmailAndPassword;
      
      const userCredential = await signIn(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;
      
      // Get Firebase token for API calls
      const firebaseToken = await firebaseUser.getIdToken();
      
      // Check if this user needs migration
      const response = await fetch('/api/catalog/auth/check-migration', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }

      const { hasLinkedPubkeys } = await response.json();
      
      if (hasLinkedPubkeys) {
        // User already has Nostr linked - they're good to go
        setMigrationState({ 
          step: 'complete', 
          data: { firebaseUser, alreadyMigrated: true } 
        });
      } else {
        // User needs to link Nostr
        setMigrationState({ 
          step: 'nostr-setup', 
          data: { firebaseUser, firebaseToken } 
        });
      }
    } catch (error: any) {
      console.error('Firebase login failed:', error);
      
      // Handle common Firebase errors
      let errorMessage = "Login failed. Please try again.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Easy account creation (generates keypair automatically)
  const handleCreateNostrAccount = async () => {
    setIsCreatingAccount(true);
    setError(null);

    try {
      setMigrationState(prev => ({ ...prev, step: 'linking' }));
      
      // Generate new secret key (same as handleCreateAccount)
      const sk = generateSecretKey();
      const nsec = nip19.nsecEncode(sk);
      
      // Create login and add it
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
      
      // Get pubkey for migration
      const pubkey = login.pubkey;
      
      // Generate fake name and publish profile
      const fakeName = generateFakeName();
      
      // Create challenge for migration
      const challenge = `Link generated Nostr identity to Wavlake account at ${Date.now()}`;
      
      // Create and sign event using the generated login
      const event: Partial<NostrEvent> = {
        kind: 22242,
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", pubkey],
          ["t", "wavlake-account-linking"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign the event manually using the secret key
      const signedEvent = finalizeEvent(event, sk);
      
      // Submit migration with Firebase token
      const response = await fetch('/api/catalog/auth/migrate-legacy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${migrationState.data.firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: pubkey,
          signature: JSON.stringify(signedEvent),
          challenge,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Migration failed' }));
        throw new Error(error.error || 'Failed to link Nostr identity');
      }

      // Create wallet and publish profile in background
      try {
        await createCashuWallet();
        await publishEvent({
          kind: 0,
          content: JSON.stringify({ name: fakeName }),
        });
      } catch (error) {
        console.warn('Failed to create wallet or publish profile:', error);
        // Don't fail the migration for this
      }

      setMigrationState({ 
        step: 'complete', 
        data: { ...migrationState.data, nostrPubkey: pubkey, generatedAccount: true } 
      });
    } catch (error: any) {
      console.error('Account creation failed:', error);
      setError(error.message || 'Failed to create Nostr account');
      setMigrationState(prev => ({ ...prev, step: 'nostr-setup' }));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Advanced: Login with existing extension
  const handleExtensionLogin = async () => {
    if (!window.nostr) {
      setError("Please install a Nostr extension (like Alby or nos2x) to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setMigrationState(prev => ({ ...prev, step: 'linking' }));
      
      // Get Nostr pubkey
      const pubkey = await window.nostr.getPublicKey();
      
      // Create challenge for migration
      const challenge = `Link existing Nostr identity to Wavlake account at ${Date.now()}`;
      
      // Create event to sign
      const event: Partial<NostrEvent> = {
        kind: 22242,
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", pubkey],
          ["t", "wavlake-account-linking"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign the event
      const signedEvent = await window.nostr.signEvent(event as NostrEvent);
      
      // Submit migration with Firebase token
      const response = await fetch('/api/catalog/auth/migrate-legacy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${migrationState.data.firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: pubkey,
          signature: JSON.stringify(signedEvent),
          challenge,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Migration failed' }));
        throw new Error(error.error || 'Failed to link Nostr keypair');
      }

      setMigrationState({ 
        step: 'complete', 
        data: { ...migrationState.data, nostrPubkey: pubkey } 
      });
    } catch (error: any) {
      console.error('Extension login failed:', error);
      setError(error.message || 'Failed to link existing Nostr identity');
      setMigrationState(prev => ({ ...prev, step: 'nostr-setup' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced: Login with nsec
  const handleNsecLogin = async () => {
    if (!nsec.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      setMigrationState(prev => ({ ...prev, step: 'linking' }));
      
      // Create login from nsec
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
      
      const pubkey = login.pubkey;
      
      // Create challenge for migration
      const challenge = `Link imported Nostr identity to Wavlake account at ${Date.now()}`;
      
      // Create and sign event
      const event: Partial<NostrEvent> = {
        kind: 22242,
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", pubkey],
          ["t", "wavlake-account-linking"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Get the secret key from the nsec to sign manually
      const { type, data: sk } = nip19.decode(nsec);
      if (type !== 'nsec') throw new Error('Invalid nsec format');
      
      // Create signed event manually
      const signedEvent = finalizeEvent(event, sk as Uint8Array);
      
      // Submit migration
      const response = await fetch('/api/catalog/auth/migrate-legacy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${migrationState.data.firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: pubkey,
          signature: JSON.stringify(signedEvent),
          challenge,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Migration failed' }));
        throw new Error(error.error || 'Failed to link Nostr identity');
      }

      setMigrationState({ 
        step: 'complete', 
        data: { ...migrationState.data, nostrPubkey: pubkey } 
      });
    } catch (error: any) {
      console.error('Nsec login failed:', error);
      setError(error.message || 'Failed to link Nostr identity');
      setMigrationState(prev => ({ ...prev, step: 'nostr-setup' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced: Login with bunker
  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim() || !bunkerUri.startsWith('bunker://')) return;
    
    setIsLoading(true);
    setError(null);

    try {
      setMigrationState(prev => ({ ...prev, step: 'linking' }));
      
      // Create login from bunker URI
      const login = await NLogin.fromBunkerUri(bunkerUri);
      addLogin(login);
      
      const pubkey = login.pubkey;
      
      // Create challenge for migration
      const challenge = `Link bunker Nostr identity to Wavlake account at ${Date.now()}`;
      
      // Create and sign event
      const event: Partial<NostrEvent> = {
        kind: 22242,
        content: challenge,
        tags: [
          ["challenge", challenge],
          ["p", pubkey],
          ["t", "wavlake-account-linking"],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // For bunker connections, we need to use the signer properly
      // Wait a moment for the login to be properly set up
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to get a signed event using current user context
      // This is a workaround since bunker signers need proper async setup
      let signedEvent: NostrEvent;
      try {
        // The publishEvent will handle the signing through the current user's signer
        signedEvent = await publishEvent(event as NostrEvent);
      } catch (error) {
        // If publishing fails due to relay issues, we might still have gotten a signed event
        // For now, throw the error as we can't easily extract the signed event
        throw new Error('Failed to sign migration event with bunker connection');
      }
      
      // Submit migration
      const response = await fetch('/api/catalog/auth/migrate-legacy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${migrationState.data.firebaseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nostrPubkey: pubkey,
          signature: JSON.stringify(signedEvent),
          challenge,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Migration failed' }));
        throw new Error(error.error || 'Failed to link Nostr identity');
      }

      setMigrationState({ 
        step: 'complete', 
        data: { ...migrationState.data, nostrPubkey: pubkey } 
      });
    } catch (error: any) {
      console.error('Bunker login failed:', error);
      setError(error.message || 'Failed to link bunker identity');
      setMigrationState(prev => ({ ...prev, step: 'nostr-setup' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNsec(content.trim());
    };
    reader.readAsText(file);
  };

  // Step 1: Firebase Login
  if (migrationState.step === 'login') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">Login to Existing Account</CardTitle>
              <CardDescription>
                Enter your Wavlake email and password
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleFirebaseLogin()}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleFirebaseLogin}
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Nostr Setup
  if (migrationState.step === 'nostr-setup') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">Set Up Nostr Identity</CardTitle>
              <CardDescription>
                Choose how to add Nostr capabilities to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Easy Option - Create New Account */}
          <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-primary">Quick Setup (Recommended)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll create a new Nostr identity for you automatically
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Instant setup, no extensions needed</li>
                  <li>• Secure key stored in your browser</li>
                  <li>• Random username generated</li>
                  <li>• Can export keys later</li>
                </ul>
                <Button 
                  onClick={handleCreateNostrAccount}
                  disabled={isCreatingAccount}
                  className="w-full mt-3"
                >
                  {isCreatingAccount ? "Creating Account..." : "Create New Nostr Identity"}
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-sm font-medium">Or use an existing Nostr identity:</div>
            </div>

            <Tabs defaultValue={'nostr' in window ? 'extension' : 'key'} className="w-full">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="extension">Extension</TabsTrigger>
                <TabsTrigger value="key">Nsec</TabsTrigger>
                <TabsTrigger value="bunker">Bunker</TabsTrigger>
              </TabsList>

              <TabsContent value="extension" className="space-y-3 mt-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm text-muted-foreground">
                    Use your browser extension to link existing identity
                  </div>
                </div>
                <Button
                  onClick={handleExtensionLogin}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Connecting...' : 'Link Extension Identity'}
                </Button>
              </TabsContent>

              <TabsContent value="key" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <label htmlFor="nsec" className="text-sm font-medium">
                    Enter your nsec
                  </label>
                  <Input
                    id="nsec"
                    value={nsec}
                    onChange={(e) => setNsec(e.target.value)}
                    placeholder="nsec1..."
                  />
                </div>

                <div className="text-center">
                  <div className="text-sm mb-2 text-muted-foreground">Or upload a key file</div>
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full mb-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Nsec File
                  </Button>
                </div>

                <Button
                  onClick={handleNsecLogin}
                  disabled={isLoading || !nsec.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Linking...' : 'Link Nsec Identity'}
                </Button>
              </TabsContent>

              <TabsContent value="bunker" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <label htmlFor="bunkerUri" className="text-sm font-medium">
                    Bunker URI
                  </label>
                  <Input
                    id="bunkerUri"
                    value={bunkerUri}
                    onChange={(e) => setBunkerUri(e.target.value)}
                    placeholder="bunker://"
                  />
                  {bunkerUri && !bunkerUri.startsWith('bunker://') && (
                    <div className="text-destructive text-xs">URI must start with bunker://</div>
                  )}
                </div>

                <Button
                  onClick={handleBunkerLogin}
                  disabled={isLoading || !bunkerUri.trim() || !bunkerUri.startsWith('bunker://')}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Connecting...' : 'Link Bunker Identity'}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Step 3: Linking in progress
  if (migrationState.step === 'linking') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              🔐
            </div>
            <h3 className="font-medium">Linking accounts...</h3>
            <p className="text-sm text-muted-foreground">
              Please check your Nostr extension for a signing request
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Complete
  if (migrationState.step === 'complete') {
    const { alreadyMigrated, generatedAccount } = migrationState.data;
    
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <CardTitle className="text-green-800">
            {alreadyMigrated ? "Welcome Back! 🎉" : "Account Updated! 🎉"}
          </CardTitle>
          <CardDescription className="text-green-600">
            {alreadyMigrated 
              ? "Your account already supports the new authentication system."
              : generatedAccount
              ? "Your account now has Nostr capabilities with a new identity we created for you."
              : "Your account now supports both Firebase and Nostr authentication."
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-green-700">
            <p>✅ Access to all publishing features</p>
            <p>✅ Enhanced security with Nostr signatures</p>
            <p>✅ Email recovery still available</p>
            <p>✅ All your existing data preserved</p>
            {generatedAccount && (
              <p>✅ New Nostr identity securely stored in browser</p>
            )}
          </div>

          {generatedAccount && (
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-sm text-blue-800">
                <strong>Important:</strong> Your new Nostr identity is saved in this browser. 
                You can export your keys later from your profile settings.
              </div>
            </div>
          )}
        </CardContent>
        
        <CardContent>
          <Button 
            onClick={onComplete}
            className="w-full"
          >
            Continue to App
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: NostrEvent): Promise<NostrEvent>;
    };
  }
}