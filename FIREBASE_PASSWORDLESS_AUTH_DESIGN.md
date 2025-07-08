# Firebase Passwordless Authentication Design

## 🎯 Overview

This document details the implementation of Firebase's passwordless authentication (email link auth) for the Wavlake application. This feature enhances the FirebaseAuthDialog component to support both traditional password login and modern passwordless magic link authentication.

## 🔧 Firebase Setup Requirements

### **1. Enable Passwordless Authentication**
In Firebase Console:
```
Authentication → Sign-in method → Email/Password
✓ Enable "Email/Password" provider
✓ Enable "Email link (passwordless sign-in)" option
```

### **2. Configure Authorized Domains**
```
Authentication → Settings → Authorized domains
- localhost (for development)
- wavlake.com (production)
- Any other domains where auth will be used
```

### **3. Optional: Dynamic Links Setup**
```
Dynamic Links → Create domain
- Creates prettier email links (wavlake.page.link/xyz)
- Better branding and trust indicators
- Not required but recommended for production
```

## 🏗️ Architecture Overview

### **Authentication Flow Comparison**

#### **Traditional Password Flow:**
```
1. User enters email + password
2. Firebase validates credentials
3. User is signed in immediately
```

#### **Passwordless Flow:**
```
1. User enters email only
2. Firebase sends magic link to email
3. User clicks link in email
4. User is signed in automatically
```

### **Component Architecture**

```typescript
FirebaseAuthDialog
├── TabsContainer
│   ├── PasswordTab
│   │   └── PasswordAuthForm (existing)
│   └── PasswordlessTab
│       ├── EmailLinkInputForm (new)
│       └── EmailLinkSentView (new)
├── AuthCompleteHandler (new)
└── EmailLinkRedirectPage (new)
```

## 📱 Component Design

### **Enhanced FirebaseAuthDialog Interface**

```typescript
interface FirebaseAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: FirebaseUser) => void;
  title?: string;
  description?: string;
  targetFirebaseUid?: string;
  defaultTab?: 'password' | 'passwordless'; // New prop
}

interface AuthState {
  mode: 'password' | 'passwordless';
  step: 'input' | 'sent' | 'verifying';
  email: string;
  error: string | null;
  isLoading: boolean;
}
```

### **Main Component Structure**

```typescript
const FirebaseAuthDialog: React.FC<FirebaseAuthDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign in to Wavlake",
  description,
  defaultTab = 'password'
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    mode: defaultTab,
    step: 'input',
    email: '',
    error: null,
    isLoading: false
  });

  const { sendEmailLink } = useEmailLinkAuth();

  const handleSendEmailLink = async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = await sendEmailLink(email);
    
    if (result.success) {
      setAuthState(prev => ({ 
        ...prev, 
        step: 'sent', 
        email, 
        isLoading: false 
      }));
    } else {
      setAuthState(prev => ({ 
        ...prev, 
        error: result.error, 
        isLoading: false 
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Tabs 
          value={authState.mode} 
          onValueChange={(value) => 
            setAuthState(prev => ({ 
              ...prev, 
              mode: value as 'password' | 'passwordless', 
              step: 'input',
              error: null 
            }))
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTab value="password">Password</TabsTab>
            <TabsTab value="passwordless">Passwordless</TabsTab>
          </TabsList>

          <TabsContent value="password">
            <PasswordAuthForm 
              onSuccess={onSuccess}
              onError={(error) => setAuthState(prev => ({ ...prev, error }))}
            />
          </TabsContent>

          <TabsContent value="passwordless">
            {authState.step === 'input' && (
              <EmailLinkInputForm 
                email={authState.email}
                onEmailChange={(email) => setAuthState(prev => ({ ...prev, email }))}
                onSendLink={handleSendEmailLink}
                isLoading={authState.isLoading}
                error={authState.error}
              />
            )}
            {authState.step === 'sent' && (
              <EmailLinkSentView 
                email={authState.email}
                onResend={() => handleSendEmailLink(authState.email)}
                onBack={() => setAuthState(prev => ({ ...prev, step: 'input' }))}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

## 🔗 Email Link Authentication Hook

```typescript
export function useEmailLinkAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmailLink = async (email: string): Promise<{success: boolean, error?: string}> => {
    setIsLoading(true);
    setError(null);

    try {
      const actionCodeSettings: ActionCodeSettings = {
        // URL where user will be redirected after clicking link
        url: `${window.location.origin}/auth/complete`,
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.wavlake.app'
        },
        android: {
          packageName: 'com.wavlake.app',
          installApp: true,
          minimumVersion: '12'
        },
        // Optional: use Dynamic Links for better branding
        dynamicLinkDomain: 'wavlake.page.link'
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Store email locally for verification when user returns
      localStorage.setItem('emailForSignIn', email);
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const completeEmailLinkSignIn = async (emailLink: string): Promise<{success: boolean, user?: FirebaseUser, error?: string}> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify this is a valid sign-in link
      if (!isSignInWithEmailLink(auth, emailLink)) {
        throw new Error('Invalid sign-in link');
      }

      // Get email from localStorage or prompt user
      let email = localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }

      if (!email) {
        throw new Error('Email is required to complete sign in');
      }

      const result = await signInWithEmailLink(auth, email, emailLink);
      
      // Clear stored email
      localStorage.removeItem('emailForSignIn');
      
      return { success: true, user: result.user };
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendEmailLink,
    completeEmailLinkSignIn,
    isLoading,
    error
  };
}
```

## 🎨 UI Components

### **Email Link Input Form**

```typescript
interface EmailLinkInputFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSendLink: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const EmailLinkInputForm: React.FC<EmailLinkInputFormProps> = ({
  email,
  onEmailChange,
  onSendLink,
  isLoading,
  error
}) => {
  const [isValidEmail, setIsValidEmail] = useState(false);

  useEffect(() => {
    setIsValidEmail(validateEmail(email));
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail) {
      await onSendLink(email);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={isLoading}
          className={error ? 'border-destructive' : ''}
        />
        <p className="text-sm text-muted-foreground">
          We'll send you a secure link to sign in instantly
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !isValidEmail}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send magic link
          </>
        )}
      </Button>
    </form>
  );
};
```

### **Email Link Sent View**

```typescript
interface EmailLinkSentViewProps {
  email: string;
  onResend: () => Promise<void>;
  onBack: () => void;
}

const EmailLinkSentView: React.FC<EmailLinkSentViewProps> = ({
  email,
  onResend,
  onBack
}) => {
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    setIsResending(true);
    await onResend();
    setIsResending(false);
    setCanResend(false);
    setCountdown(60);
  };

  const openEmailClient = () => {
    // Try to open default email client
    window.location.href = 'mailto:';
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Check your email</h3>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            We've sent a magic link to
          </p>
          <p className="font-medium text-sm">{email}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Click the link in your email to sign in instantly
        </p>
      </div>
      
      <div className="space-y-3">
        <Button
          onClick={openEmailClient}
          variant="default"
          className="w-full"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open email app
        </Button>
        
        {canResend ? (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : (
              'Resend email'
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled
            className="w-full"
          >
            Resend in {countdown}s
          </Button>
        )}
        
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full"
        >
          Use different email
        </Button>
      </div>
      
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Keep this window open
            </p>
            <p className="text-xs text-muted-foreground">
              The link will automatically sign you in when clicked. 
              Links expire after 1 hour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 🛣️ Routing & Completion

### **Auth Completion Route**

```typescript
// Add to your router configuration
{
  path: '/auth/complete',
  element: <AuthCompletePage />
}
```

### **Auth Completion Page**

```typescript
const AuthCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeEmailLinkSignIn } = useEmailLinkAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        const emailLink = window.location.href;
        const result = await completeEmailLinkSignIn(emailLink);
        
        if (result.success) {
          setStatus('success');
          
          // Get intended destination from state or default to dashboard
          const from = location.state?.from?.pathname || '/dashboard';
          
          // Brief success message then redirect
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setError(result.error || 'Failed to complete sign in');
        }
      } catch (err) {
        setStatus('error');
        setError('An unexpected error occurred');
      }
    };

    completeSignIn();
  }, [completeEmailLinkSignIn, navigate, location]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Completing sign in...</h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your email link
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Welcome back!</h1>
              <p className="text-sm text-muted-foreground">
                You've been successfully signed in. Redirecting to your dashboard...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Sign in failed</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="space-y-2">
            <Button onClick={() => navigate('/', { replace: true })}>
              Return to home
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
```

## 🔒 Security & Error Handling

### **Email Validation**

```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};
```

### **Firebase Error Handling**

```typescript
const getFirebaseErrorMessage = (error: any): string => {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-action-code':
      return 'This sign-in link is invalid or has expired.';
    case 'auth/expired-action-code':
      return 'This sign-in link has expired. Please request a new one.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
};
```

### **Rate Limiting**

```typescript
const useRateLimiter = (maxAttempts: number = 3, windowMs: number = 300000) => {
  const [attempts, setAttempts] = useState<number[]>([]);
  
  const canMakeRequest = (): boolean => {
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    return recentAttempts.length < maxAttempts;
  };
  
  const recordAttempt = (): void => {
    const now = Date.now();
    setAttempts(prev => [...prev.filter(time => now - time < windowMs), now]);
  };
  
  const timeUntilNextAttempt = (): number => {
    const now = Date.now();
    const oldestRecentAttempt = Math.min(...attempts.filter(time => now - time < windowMs));
    return Math.max(0, windowMs - (now - oldestRecentAttempt));
  };
  
  return { canMakeRequest, recordAttempt, timeUntilNextAttempt };
};
```

## 📱 Mobile Considerations

### **Deep Linking Setup**

```typescript
// Configure for mobile app deep linking
const actionCodeSettings: ActionCodeSettings = {
  url: `${window.location.origin}/auth/complete`,
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.wavlake.app',
    appStoreId: '123456789' // Your App Store ID
  },
  android: {
    packageName: 'com.wavlake.app',
    installApp: true,
    minimumVersion: '12'
  }
};
```

### **Cross-Device Support**

```typescript
// Handle cross-device scenarios
useEffect(() => {
  // Check if this is a different device
  const storedEmail = localStorage.getItem('emailForSignIn');
  const currentUrl = window.location.href;
  
  if (isSignInWithEmailLink(auth, currentUrl) && !storedEmail) {
    // User clicked link on different device - prompt for email
    const email = window.prompt(
      'Please provide the email address you used to request the sign-in link:'
    );
    
    if (email) {
      localStorage.setItem('emailForSignIn', email);
    }
  }
}, []);
```

## 🧪 Testing Strategy

### **Development Testing**

```bash
# Test email delivery in development
1. Use Firebase emulator for local testing
2. Check Firebase Console → Authentication → Users
3. Monitor email delivery in development
4. Test with various email providers (Gmail, Outlook, etc.)
```

### **Test Scenarios**

```typescript
// Key scenarios to test:
const testScenarios = [
  'Valid email → successful link delivery',
  'Invalid email → proper error handling',
  'Expired link → clear error message',
  'Cross-device link clicking',
  'Multiple rapid requests → rate limiting',
  'Network failure during sending',
  'User closes browser before clicking link',
  'Link clicked multiple times',
  'Different browser/device completion'
];
```

## 📋 Implementation Checklist

### **Firebase Configuration:**
- [ ] Enable Email/Password provider
- [ ] Enable passwordless sign-in option
- [ ] Configure authorized domains
- [ ] Set up Dynamic Links (optional)

### **Component Development:**
- [ ] Update FirebaseAuthDialog with tabs
- [ ] Create EmailLinkInputForm component
- [ ] Create EmailLinkSentView component
- [ ] Implement useEmailLinkAuth hook
- [ ] Create AuthCompletePage component

### **Routing & Integration:**
- [ ] Add /auth/complete route
- [ ] Update existing auth flows to support passwordless
- [ ] Test email link completion
- [ ] Implement proper redirects

### **Testing & Polish:**
- [ ] Test email delivery in development
- [ ] Test cross-device scenarios
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Test mobile deep linking
- [ ] Performance testing

### **Documentation:**
- [ ] Update user documentation
- [ ] Create troubleshooting guide
- [ ] Document security considerations

## 🎯 Success Metrics

- **User Experience**: Reduce friction for users who prefer passwordless auth
- **Security**: Eliminate password-related vulnerabilities for passwordless users
- **Adoption**: Track usage between password vs passwordless methods
- **Performance**: Monitor email delivery times and completion rates

This implementation provides a complete, production-ready passwordless authentication system that integrates seamlessly with existing Firebase authentication while maintaining excellent UX and security standards.