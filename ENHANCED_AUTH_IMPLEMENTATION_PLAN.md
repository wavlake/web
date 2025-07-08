# Enhanced Authentication UX Implementation Plan

## Branch: `enhance-auth-ux`

## 🎯 Overview

This plan implements an enhanced authentication UX that allows legacy Wavlake users to sign in with their email addresses, discover linked Nostr accounts, and seamlessly authenticate while maintaining all existing functionality.

## 📊 Current State Analysis

### ✅ Already Implemented (70% of functionality):
- **`FirebaseAuthDialog.tsx`** - Complete email/password auth with sign-in/sign-up
- **`useFirebaseLegacyAuth()`** - All Firebase operations  
- **`useLinkFirebaseAccount()`** - API integration for linking accounts
- **`useAccountLinkingStatus()`** - Status checking and validation
- **`AccountLinking.tsx`** - Complete self-service management page
- **`LoginDialog.tsx`** - Nostr-only authentication (extension/nsec/bunker)

### 🔄 What We Need to Build (30% new functionality):
- Orchestration components to combine existing flows
- Three-option landing page choice
- Upload flow integration
- Automatic linking capability

## 🚀 Target User Flows

### **Flow 1: New User** (unchanged)
```
"Get Started" → Auto-create Nostr account → Profile setup
```

### **Flow 2: Legacy User with Linked Pubkey**
```
"I have a Wavlake account" → Email auth → Show linked profile → 
NSEC login (validates against specific pubkey) → Auto-sign in
```

### **Flow 3: Legacy User without Linked Pubkey**
```
"I have a Wavlake account" → Email auth → No profiles found → 
Any NSEC login OR Generate new → Auto-link → Sign in
```

### **Flow 4: Legacy User with Different NSEC**
```
"I have a Wavlake account" → Email auth → Show linked profile → 
"Use different account" → Any NSEC login → Auto-link → Sign in
```

### **Flow 5: Upload Flow (Enhanced)**
```
Attempt upload → Check linking status → If not linked, prompt for linking → 
Use existing FirebaseAuthDialog → Auto-link → Continue upload
```

## 🛠️ Implementation Plan

### **Phase 1: Core Components (Week 1)**

#### **Firebase Enhancement: Add Passwordless Auth** - ENHANCED
**Purpose**: Update existing FirebaseAuthDialog to support both password and passwordless authentication
**Reference**: See `FIREBASE_PASSWORDLESS_AUTH_DESIGN.md` for complete implementation details

```typescript
// Enhanced FirebaseAuthDialog will support:
// - Tab interface: "Password" and "Passwordless"
// - Magic link email authentication
// - Auto-completion via /auth/complete route
```

#### **1. Create `CompositeLoginDialog.tsx`** - NEW
**Purpose**: Orchestrates the enhanced login flow
**Reuses**: `FirebaseAuthDialog` as embedded component

```typescript
interface CompositeLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (login: NLoginType) => void;
}

const CompositeLoginDialog: React.FC<CompositeLoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [step, setStep] = useState<'choice' | 'firebase' | 'nostr'>('choice');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [linkedPubkeys, setLinkedPubkeys] = useState<Array<{pubkey: string, profile?: NostrProfile}>>([]);
  
  const handleFirebaseSuccess = async (user: FirebaseUser) => {
    setFirebaseUser(user);
    const pubkeys = await fetchLinkedPubkeys(user.email);
    setLinkedPubkeys(pubkeys);
    setStep('nostr');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {step === 'choice' && <LoginChoiceStep onSelect={setStep} />}
      {step === 'firebase' && (
        <FirebaseAuthDialog // REUSE EXISTING
          isOpen={true}
          onClose={() => setStep('choice')}
          onSuccess={handleFirebaseSuccess}
          title="Sign in with Wavlake Account"
        />
      )}
      {step === 'nostr' && (
        <NostrAuthStep
          firebaseUser={firebaseUser}
          linkedPubkeys={linkedPubkeys}
          onSuccess={onLogin}
          onBack={() => setStep('choice')}
        />
      )}
    </Dialog>
  );
};
```

#### **2. Create `LoginChoiceStep.tsx`** - NEW
**Purpose**: Three-option landing page choice

```typescript
interface LoginChoiceStepProps {
  onSelect: (choice: 'nostr' | 'firebase') => void;
}

const LoginChoiceStep: React.FC<LoginChoiceStepProps> = ({ onSelect }) => {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Welcome to Wavlake</DialogTitle>
        <DialogDescription>
          Choose how you'd like to get started
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Button 
          onClick={() => onSelect('nostr')}
          className="w-full"
          size="lg"
        >
          Get Started
          <span className="text-sm text-muted-foreground ml-2">
            (New to Wavlake)
          </span>
        </Button>
        <Button 
          onClick={() => onSelect('firebase')}
          variant="outline"
          className="w-full"
          size="lg"
        >
          I have a Wavlake account
          <span className="text-sm text-muted-foreground ml-2">
            (Sign in with email)
          </span>
        </Button>
        <Button 
          onClick={() => onSelect('nostr')}
          variant="ghost"
          className="w-full"
        >
          I have a Nostr account
        </Button>
      </div>
    </DialogContent>
  );
};
```

#### **3. Create `NostrAuthStep.tsx`** - NEW
**Purpose**: Enhanced Nostr authentication with auto-linking
**Reuses**: Existing `LoginDialog` functionality

```typescript
interface NostrAuthStepProps {
  firebaseUser?: FirebaseUser;
  linkedPubkeys: Array<{pubkey: string, profile?: NostrProfile}>;
  onSuccess: (login: NLoginType) => void;
  onBack: () => void;
}

const NostrAuthStep: React.FC<NostrAuthStepProps> = ({
  firebaseUser,
  linkedPubkeys,
  onSuccess,
  onBack
}) => {
  const { autoLink } = useAutoLinkPubkey();
  const { data: legacyProfile } = useLegacyProfile(firebaseUser);
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'auth' | 'generate'>('select');
  
  const handleNostrLogin = async (login: NLoginType) => {
    try {
      // Auto-link if Firebase user and not already linked
      if (firebaseUser && !linkedPubkeys.some(p => p.pubkey === login.pubkey)) {
        await autoLink(firebaseUser, login.pubkey);
      }
      
      onSuccess(login);
    } catch (error) {
      console.error('Auth error:', error);
      // Continue with sign-in even if linking fails
      onSuccess(login);
    }
  };
  
  const handleCreateNewAccount = async () => {
    try {
      // Generate new account with legacy profile data
      const newAccount = await generateNostrAccountWithProfile(legacyProfile);
      
      // Auto-link if Firebase user
      if (firebaseUser) {
        await autoLink(firebaseUser, newAccount.pubkey);
      }
      
      onSuccess(newAccount);
    } catch (error) {
      console.error('Account creation error:', error);
    }
  };
  
  if (mode === 'select' && linkedPubkeys.length > 0) {
    return (
      <ProfileSelectionStep
        linkedPubkeys={linkedPubkeys}
        onSelectPubkey={(pubkey) => {
          setSelectedPubkey(pubkey);
          setMode('auth');
        }}
        onUseDifferent={() => {
          setSelectedPubkey(null);
          setMode('auth');
        }}
        onCreateNew={() => setMode('generate')}
        onBack={onBack}
      />
    );
  }
  
  if (mode === 'generate') {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            We'll create a new Nostr account using your Wavlake profile information.
          </DialogDescription>
        </DialogHeader>
        
        {legacyProfile && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Profile Preview:</p>
            <p className="text-sm">Name: {legacyProfile.name}</p>
            {legacyProfile.picture && <p className="text-sm">Picture: ✓</p>}
          </div>
        )}
        
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleCreateNewAccount}>
            Create Account
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Sign in with Nostr</DialogTitle>
        {selectedPubkey ? (
          <DialogDescription>
            Please sign in with your account ending in ...{selectedPubkey.slice(-8)}
          </DialogDescription>
        ) : (
          <DialogDescription>
            Sign in with any Nostr account. This will be linked to your Wavlake account.
          </DialogDescription>
        )}
      </DialogHeader>
      
      <NostrLoginForm 
        expectedPubkey={selectedPubkey}
        onLogin={handleNostrLogin}
      />
      
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        {linkedPubkeys.length > 0 && (
          <Button variant="outline" onClick={() => setMode('select')}>
            Choose Different Account
          </Button>
        )}
        {firebaseUser && (
          <Button variant="outline" onClick={() => setMode('generate')}>
            Generate New Account
          </Button>
        )}
      </div>
    </div>
  );
};
```

#### **4. Create `ProfileSelectionStep.tsx`** - NEW
**Purpose**: Display linked pubkeys with profiles for selection

```typescript
interface ProfileSelectionStepProps {
  linkedPubkeys: Array<{pubkey: string, profile?: NostrProfile}>;
  onSelectPubkey: (pubkey: string) => void;
  onUseDifferent: () => void;
  onCreateNew: () => void;
  onBack: () => void;
}

const ProfileSelectionStep: React.FC<ProfileSelectionStepProps> = ({
  linkedPubkeys,
  onSelectPubkey,
  onUseDifferent,
  onCreateNew,
  onBack
}) => {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose Your Account</DialogTitle>
        <DialogDescription>
          We found {linkedPubkeys.length} Nostr account(s) linked to your email
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-3">
        {linkedPubkeys.map((account) => (
          <Card 
            key={account.pubkey}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelectPubkey(account.pubkey)}
          >
            <CardContent className="flex items-center space-x-4 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={account.profile?.picture} />
                <AvatarFallback>
                  {account.profile?.name?.[0] || account.pubkey.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="font-medium">
                  {account.profile?.name || 'Unnamed Account'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex flex-col space-y-2">
        <Button onClick={onUseDifferent} variant="outline">
          Use Different Nostr Account
        </Button>
        <Button onClick={onCreateNew} variant="outline">
          Generate New Account
        </Button>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
      </div>
    </DialogContent>
  );
};
```

#### **5. Create `UploadRequiredDialog.tsx`** - NEW
**Purpose**: Lightweight dialog for upload scenarios

```typescript
interface UploadRequiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (firebaseUser: FirebaseUser) => void;
}

const UploadRequiredDialog: React.FC<UploadRequiredDialogProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [showFirebase, setShowFirebase] = useState(false);
  
  if (showFirebase) {
    return (
      <FirebaseAuthDialog // REUSE EXISTING
        isOpen={true}
        onClose={onClose}
        onSuccess={onComplete}
        title="Link Account to Upload"
        description="To upload music, please link your Wavlake account."
      />
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account Linking Required</DialogTitle>
          <DialogDescription>
            To upload music, you need to link your Wavlake account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Linking your account enables:
          </p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• Music uploading and management</li>
            <li>• Artist profile features</li>
            <li>• Revenue tracking</li>
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={() => setShowFirebase(true)}>
            Link Account
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

#### **6. Create `useAutoLinkPubkey.ts`** - NEW
**Purpose**: Hook for automatic pubkey linking

```typescript
export function useAutoLinkPubkey() {
  const { linkAccount } = useLinkFirebaseAccount();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  
  const autoLink = async (firebaseUser: FirebaseUser, pubkey: string) => {
    setIsLinking(true);
    
    try {
      await linkAccount(firebaseUser, pubkey);
      toast({
        title: "Account Linked",
        description: "Your Nostr account has been linked to your Wavlake account.",
        variant: "default"
      });
      return { success: true };
    } catch (error) {
      toast({
        title: "Linking Notice",
        description: "Unable to link accounts automatically. You can manage this in Settings later.",
        variant: "warning"
      });
      console.error("Auto-linking failed:", error);
      return { success: false, error };
    } finally {
      setIsLinking(false);
    }
  };
  
  return { autoLink, isLinking };
}
```

#### **7. Create `useLinkedPubkeys.ts`** - NEW
**Purpose**: Hook for fetching linked pubkeys with profiles

```typescript
export function useLinkedPubkeys(email: string) {
  return useQuery({
    queryKey: ['linked-pubkeys', email],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/v1/auth/get-linked-pubkeys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getFirebaseToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch linked pubkeys');
      }
      
      const data = await response.json();
      
      // Fetch profile data for each pubkey
      const pubkeysWithProfiles = await Promise.all(
        data.pubkeys.map(async (pubkey: string) => {
          try {
            const profile = await fetchNostrProfile(pubkey);
            return { pubkey, profile };
          } catch {
            return { pubkey, profile: null };
          }
        })
      );
      
      return pubkeysWithProfiles;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000
  });
}
```

#### **8. Create `useLegacyProfile.ts`** - NEW
**Purpose**: Hook for fetching legacy Wavlake profile data to populate new Nostr accounts

```typescript
export function useLegacyProfile(firebaseUser: FirebaseUser | null) {
  return useQuery({
    queryKey: ['legacy-profile', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      
      const response = await fetch(`${API_BASE_URL}/v1/auth/legacy-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch legacy profile');
      }
      
      const data = await response.json();
      
      return {
        name: data.displayName || data.email?.split('@')[0],
        about: data.bio || '',
        picture: data.profileImageUrl || '',
        website: data.website || '',
        nip05: data.email || ''
      };
    },
    enabled: !!firebaseUser,
    staleTime: 10 * 60 * 1000
  });
}
```

#### **9. Create `generateNostrAccountWithProfile.ts`** - NEW
**Purpose**: Utility function to generate Nostr account with legacy profile data

```typescript
export async function generateNostrAccountWithProfile(legacyProfile?: LegacyProfile) {
  // Generate new Nostr key pair
  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  
  // Create kind 0 profile event with legacy data
  if (legacyProfile) {
    const profileEvent = {
      kind: 0,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: legacyProfile.name,
        about: legacyProfile.about,
        picture: legacyProfile.picture,
        website: legacyProfile.website,
        nip05: legacyProfile.nip05
      })
    };
    
    // Sign and publish the profile event
    const signedEvent = finalizeEvent(profileEvent, privateKey);
    await publishToRelays(signedEvent);
  }
  
  return {
    pubkey: publicKey,
    type: 'nsec' as const,
    nsec: nip19.nsecEncode(privateKey)
  };
}
```

### **Phase 2: Integration (Week 2)**

#### **1. Enhanced `LoginArea.tsx`**
Add enhanced flow option to existing component:

```typescript
// Add to existing LoginArea component
const LoginArea = ({ enhanced = false }) => {
  const [showCompositeDialog, setShowCompositeDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const handleLogin = () => {
    if (enhanced) {
      setShowCompositeDialog(true);
    } else {
      setShowLoginDialog(true);
    }
  };
  
  return (
    <>
      {/* Existing login dialog */}
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLoginSuccess}
      />
      
      {/* New enhanced dialog */}
      {enhanced && (
        <CompositeLoginDialog 
          isOpen={showCompositeDialog} 
          onClose={() => setShowCompositeDialog(false)}
          onLogin={handleLoginSuccess}
        />
      )}
    </>
  );
};
```

#### **2. Update `Index.tsx`**
Modify landing page to use enhanced flow:

```typescript
// In Index.tsx, update the sign-in button
<LoginArea enhanced={true} />
```

#### **3. Upload Flow Integration**
Add linking prompts to upload-related components:

```typescript
// In upload components
const useUploadWithLinking = () => {
  const { data: linkStatus } = useAccountLinkingStatus();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const handleUpload = async () => {
    if (!linkStatus?.isLinked) {
      setShowUploadDialog(true);
      return;
    }
    
    // Continue with upload
  };
  
  return {
    handleUpload,
    UploadDialog: () => (
      <UploadRequiredDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onComplete={() => {
          setShowUploadDialog(false);
          // Refresh link status and continue upload
        }}
      />
    )
  };
};
```

### **Phase 3: Testing & Polish (Week 3)**

#### **Testing Checklist:**
- [ ] New user flow (unchanged)
- [ ] Legacy user with linked pubkey
- [ ] Legacy user without linked pubkey
- [ ] Legacy user creating new account
- [ ] Upload flow with linking
- [ ] Error handling and edge cases
- [ ] Self-service management page still works
- [ ] Existing flows remain functional

#### **Error Handling:**
- Network errors during linking
- Firebase authentication failures
- Nostr authentication failures
- API rate limiting
- Invalid pubkey validation

#### **UX Polish:**
- Loading states for all async operations
- Smooth transitions between steps
- Clear error messages
- Responsive design
- Accessibility improvements

## 📁 File Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── CompositeLoginDialog.tsx         # NEW - Main orchestrator
│   │   ├── LoginChoiceStep.tsx              # NEW - Three-option choice
│   │   ├── NostrAuthStep.tsx                # NEW - Enhanced Nostr auth
│   │   ├── ProfileSelectionStep.tsx         # NEW - Linked pubkey selection
│   │   ├── UploadRequiredDialog.tsx         # NEW - Upload linking prompt
│   │   ├── FirebaseAuthDialog.tsx           # ENHANCED - Add passwordless tabs
│   │   ├── EmailLinkInputForm.tsx           # NEW - Passwordless email input
│   │   ├── EmailLinkSentView.tsx            # NEW - Magic link sent view
│   │   ├── LoginDialog.tsx                  # EXISTING - Reused
│   │   └── AccountLinking.tsx               # EXISTING - Unchanged
│   └── ui/
│       └── LoginArea.tsx                    # MODIFIED - Add enhanced option
├── hooks/
│   ├── useAutoLinkPubkey.ts                 # NEW - Auto-linking logic
│   ├── useLinkedPubkeys.ts                  # NEW - Fetch linked pubkeys
│   ├── useFirebaseLegacyAuth.ts             # EXISTING - Reused
│   ├── useLinkFirebaseAccount.ts            # EXISTING - Reused
│   └── useAccountLinkingStatus.ts           # EXISTING - Reused
└── pages/
    ├── Index.tsx                            # MODIFIED - Use enhanced flow
    ├── AuthComplete.tsx                     # NEW - Passwordless completion
    └── AccountLinking.tsx                   # EXISTING - Unchanged
```

## 🎯 Success Metrics

### **User Experience:**
- [ ] Clear three-option choice on landing page
- [ ] Seamless email authentication
- [ ] Intuitive profile selection for linked accounts
- [ ] Smooth Nostr authentication flow
- [ ] Automatic account linking with graceful error handling

### **Technical:**
- [ ] No breaking changes to existing flows
- [ ] Reuse of existing components maximized
- [ ] Comprehensive error handling
- [ ] Proper loading states
- [ ] Accessible UI components

### **Business:**
- [ ] Legacy users can sign in with email
- [ ] Upload flow prompts for account linking
- [ ] Self-service management remains functional
- [ ] Reduced friction for new and existing users

## 🚀 Getting Started

1. **Branch created**: `enhance-auth-ux`
2. **Start with Phase 1**: Create the core components
3. **Test incrementally**: Each component can be tested in isolation
4. **Maintain compatibility**: Existing flows should remain unchanged

## 🔄 Rollback Plan

If issues arise:
1. Feature flag the enhanced flow
2. Revert to existing `LoginDialog` for all flows
3. Existing self-service management remains unaffected
4. No database or API changes required

This implementation plan leverages 70% of existing functionality while adding the enhanced UX flow, minimizing risk and development time.