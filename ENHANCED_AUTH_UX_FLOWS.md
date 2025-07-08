# Enhanced Authentication UX User Flows

## 🎯 Overview

This document details the complete user experience for each authentication path in the enhanced authentication system. Each flow shows the exact screens, decisions, and outcomes users will encounter.

## ⚠️ Implementation Note

**Passwordless authentication (magic links) has been deferred to a future phase.** The current implementation focuses on email/password authentication. Where "tabs" are referenced in the UI flows below, only the email/password option will be implemented initially. Complete passwordless UX flows are preserved for future implementation.

---

## 🚀 **Flow 1: New User - "Get Started"**

### **User Profile**: First-time visitor to Wavlake
### **Goal**: Quick onboarding with minimal friction

### **UX Path**:
```
1. Landing Page
   ┌─────────────────────────────────┐
   │  Welcome to Wavlake             │
   │                                 │
   │  [Get Started]                  │  ← USER CLICKS
   │  [I have a Wavlake account]     │
   │  [I have a Nostr account]       │
   └─────────────────────────────────┘

2. Auto Account Creation (Behind the scenes)
   ┌─────────────────────────────────┐
   │  Creating your account...       │
   │  [Loading spinner]              │
   │                                 │
   │  • Generating Nostr keys        │
   │  • Setting up Lightning wallet  │
   └─────────────────────────────────┘

3. Profile Setup
   ┌─────────────────────────────────┐
   │  Complete Your Profile          │
   │                                 │
   │  Name: [Generated name]         │
   │  Picture: [Default avatar]      │
   │                                 │
   │  [Continue] [Skip for now]      │
   └─────────────────────────────────┘

4. Welcome Dashboard
   ┌─────────────────────────────────┐
   │  Welcome to Wavlake!            │
   │                                 │
   │  You're all set up and ready    │
   │  to discover music.             │
   │                                 │
   │  [Explore Music]                │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Zero friction**: No email, password, or complex setup required
- **Immediate value**: User can start exploring immediately
- **Educational**: Brief explanation of what was created for them
- **Optional personalization**: Profile setup can be skipped

---

## 📧 **Flow 2: Legacy User with Linked Pubkey**

### **User Profile**: Existing Wavlake user who has previously linked their Nostr account
### **Goal**: Quick sign-in with familiar email, then seamless Nostr authentication

### **UX Path**:
```
1. Landing Page Choice
   ┌─────────────────────────────────┐
   │  Welcome to Wavlake             │
   │                                 │
   │  [Get Started]                  │
   │  [I have a Wavlake account]     │  ← USER CLICKS
   │  [I have a Nostr account]       │
   └─────────────────────────────────┘

2. Email Authentication
   ┌─────────────────────────────────┐
   │  Sign in to Wavlake             │
   │                                 │
   │  Email/Password Authentication   │
   │                                 │
   │  Email: [user@example.com]      │
   │  Password: [••••••••]           │
   │                                 │
   │  [Sign In] [Create Account]     │
   │                                 │
   │  ← Back                         │
   └─────────────────────────────────┘

3. Profile Discovery & Options
   ┌─────────────────────────────────┐
   │  Welcome back!                  │
   │                                 │
   │  We found your linked account:  │
   │                                 │
   │  ┌─────────────────────────────┐ │
   │  │ 🎵 @musiclover             │ │  ← USER'S LINKED PROFILE
   │  │ npub1abc...def8             │ │
   │  │ [Sign in with this account] │ │  ← PRIMARY OPTION
   │  └─────────────────────────────┘ │
   │                                 │
   │  [Use different Nostr account]  │  ← LOGIN WITH DIFFERENT PUBKEY
   │  [Generate new account]         │  ← CREATES NEW WITH LEGACY PROFILE
   └─────────────────────────────────┘

4a. Nostr Authentication (Targeted - if "Sign in with this account")
   ┌─────────────────────────────────┐
   │  Sign in with Nostr             │
   │                                 │
   │  Please sign in with:           │
   │  @musiclover (...abc8)          │
   │                                 │
   │  [Extension] [Paste Key] [Bunker] │
   │                                 │
   │  [Different Account] ← Back     │
   └─────────────────────────────────┘

4b. Open Nostr Authentication (if "Use different account")
   ┌─────────────────────────────────┐
   │  Sign in with any Nostr account │
   │                                 │
   │  [Extension] [Paste Key] [Bunker] │
   │                                 │
   │  Note: This will be linked to   │
   │  your Wavlake account           │
   │                                 │
   │  ← Back                         │
   └─────────────────────────────────┘

4c. Generate New Account (if "Generate new account")
   ┌─────────────────────────────────┐
   │  Creating new account...        │
   │  [Loading spinner]              │
   │                                 │
   │  • Generating Nostr keys        │
   │  • Using your legacy profile    │
   │  • Linking to your email        │
   └─────────────────────────────────┘

5. Success & Auto-Link Confirmation
   ┌─────────────────────────────────┐
   │  ✅ Signed in successfully!     │
   │                                 │
   │  Account verified and linked.   │
   │                                 │
   │  [Continue to Dashboard]        │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Familiar start**: Begins with email they already know
- **Recognition**: Shows their linked profile with name/avatar
- **Guided auth**: Requests specific account for security
- **Flexibility**: Can use different pubkey or generate new one
- **Legacy profile population**: New accounts use existing Wavlake profile data
- **Confirmation**: Clear feedback when everything works

---

## 📧 **Flow 3: Legacy User without Linked Pubkey**

### **User Profile**: Existing Wavlake user who has NOT linked a Nostr account yet
### **Goal**: Email authentication, then onboard them to Nostr

### **UX Path**:
```
1. Landing Page Choice
   ┌─────────────────────────────────┐
   │  Welcome to Wavlake             │
   │                                 │
   │  [Get Started]                  │
   │  [I have a Wavlake account]     │  ← USER CLICKS
   │  [I have a Nostr account]       │
   └─────────────────────────────────┘

2. Email Authentication
   ┌─────────────────────────────────┐
   │  Sign in to Wavlake             │
   │                                 │
   │  Email/Password Authentication   │
   │                                 │
   │  Email: [user@example.com]      │
   │  Password: [••••••••]           │
   │                                 │
   │  [Sign In] [Create Account]     │
   │                                 │
   │  ← Back                         │
   └─────────────────────────────────┘

3. No Linked Accounts Found
   ┌─────────────────────────────────┐
   │  Welcome back!                  │
   │                                 │
   │  No Nostr accounts found.       │
   │  Let's get you set up:          │
   │                                 │
   │  [Generate new account] ← Recommended │  ← USES LEGACY PROFILE
   │  [Use existing Nostr account]   │
   │                                 │
   │  ← Back                         │
   └─────────────────────────────────┘

4a. Generate New Account Path
   ┌─────────────────────────────────┐
   │  Creating your Nostr account... │
   │  [Loading spinner]              │
   │                                 │
   │  • Generating secure keys       │
   │  • Using your legacy profile    │  ← NEW: POPULATE FROM WAVLAKE
   │  • Linking to your email        │
   │  • Setting up Lightning wallet  │
   └─────────────────────────────────┘

4b. OR Use Existing Account Path
   ┌─────────────────────────────────┐
   │  Sign in with any Nostr account │
   │                                 │
   │  [Extension] [Paste Key] [Bunker] │
   │                                 │
   │  Note: This will be linked to   │
   │  your Wavlake account           │
   │                                 │
   │  [Generate New] ← Back          │
   └─────────────────────────────────┘

5. Success & Auto-Link
   ┌─────────────────────────────────┐
   │  ✅ Account linked successfully! │
   │                                 │
   │  Your Nostr account is now      │
   │  linked to user@example.com     │
   │                                 │
   │  [Continue to Dashboard]        │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Clear explanation**: Explains why Nostr is needed
- **Recommended path**: Suggests generating new account (easier)
- **Legacy profile population**: New accounts use existing Wavlake profile data
- **Flexibility**: Still allows using existing Nostr account
- **Auto-linking**: Automatically links whatever account they choose
- **Education**: Brief explanation of what linking provides

---

## 🔑 **Flow 4: Existing Nostr User - Direct Access**

### **User Profile**: User who already has a Nostr account and prefers direct access
### **Goal**: Skip email authentication, go straight to Nostr login

### **UX Path**:
```
1. Landing Page Choice
   ┌─────────────────────────────────┐
   │  Welcome to Wavlake             │
   │                                 │
   │  [Get Started]                  │
   │  [I have a Wavlake account]     │
   │  [I have a Nostr account]       │  ← USER CLICKS
   └─────────────────────────────────┘

2. Nostr Authentication (Open)
   ┌─────────────────────────────────┐
   │  Sign in with Nostr             │
   │                                 │
   │  Bring your own pubkey:         │
   │                                 │
   │  [Extension] [Paste Key] [Bunker] │
   │                                 │
   │  ← Back                         │
   └─────────────────────────────────┘

3. Immediate Dashboard Access
   ┌─────────────────────────────────┐
   │  ✅ Signed in!                  │
   │                                 │
   │  Welcome back!                  │
   │                                 │
   │  [Continue to Dashboard]        │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Fastest path**: Direct Nostr authentication
- **Bring-your-own-pubkey**: No profile setup required
- **No email required**: Pure Nostr-first experience
- **Familiar**: Uses existing LoginDialog component
- **Immediate access**: No additional steps or linking prompts

---

## 🎵 **Flow 5: Upload Attempt (Linking Required)**

### **User Profile**: Any user attempting to upload music who doesn't have linked account
### **Goal**: Prompt for account linking when needed, without blocking workflow

### **UX Path**:
```
1. User Attempts Upload
   ┌─────────────────────────────────┐
   │  Upload Track                   │
   │                                 │
   │  [Select File]                  │  ← USER CLICKS
   │                                 │
   │  Or drag and drop here          │
   └─────────────────────────────────┘

2. Linking Required Dialog
   ┌─────────────────────────────────┐
   │  Account Linking Required       │
   │                                 │
   │  To upload music, you need to   │
   │  link your Wavlake account.     │
   │                                 │
   │  Linking enables:               │
   │  • Music uploading              │
   │  • Artist profile features      │
   │  • Revenue tracking             │
   │                                 │
   │  [Link Account] [Cancel]        │
   └─────────────────────────────────┘

3. Email Authentication (if Link Account clicked)
   ┌─────────────────────────────────┐
   │  Link Account to Upload         │
   │                                 │
   │  Email/Password Authentication   │
   │                                 │
   │  Email: [user@example.com]      │
   │  Password: [••••••••]           │
   │                                 │
   │  [Sign In] [Create Account]     │
   │                                 │
   │  ← Cancel                       │
   └─────────────────────────────────┘

4. Linking Success
   ┌─────────────────────────────────┐
   │  ✅ Account linked!             │
   │                                 │
   │  You can now upload music.      │
   │                                 │
   │  [Continue Upload] [Later]      │
   └─────────────────────────────────┘

5. Return to Upload (if Continue clicked)
   ┌─────────────────────────────────┐
   │  Upload Track                   │
   │                                 │
   │  [Select File] ← Ready to work  │
   │                                 │
   │  Or drag and drop here          │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Just-in-time prompting**: Only asks for linking when needed
- **Clear value proposition**: Explains benefits of linking
- **Non-blocking**: User can cancel and continue exploring
- **Seamless return**: Takes user back to upload after linking
- **Educational**: Explains why account linking is required

---

## 🔄 **Flow 6: Legacy User Creating New Account**

### **User Profile**: Existing Wavlake user who wants to create a fresh Nostr account
### **Goal**: Email authentication, then bypass linked account to create new

### **UX Path**:
```
1-2. [Same as Flow 2: Email Authentication]

3. Profile Discovery (with bypass option)
   ┌─────────────────────────────────┐
   │  Welcome back!                  │
   │                                 │
   │  We found your linked account:  │
   │                                 │
   │  ┌─────────────────────────────┐ │
   │  │ 🎵 @musiclover             │ │
   │  │ npub1abc...def8             │ │
   │  │ [Sign in with this account] │ │
   │  └─────────────────────────────┘ │
   │                                 │
   │  [Create new account] ← USER CLICKS │
   │  [Use different account]        │
   └─────────────────────────────────┘

4. New Account Generation
   ┌─────────────────────────────────┐
   │  Creating new account...        │
   │  [Loading spinner]              │
   │                                 │
   │  • Generating new Nostr keys    │
   │  • Linking to your email        │
   │  • Setting up Lightning wallet  │
   └─────────────────────────────────┘

5. Success & Multiple Account Notice
   ┌─────────────────────────────────┐
   │  ✅ New account created!        │
   │                                 │
   │  You now have 2 linked accounts │
   │  Visit Settings to manage them. │
   │                                 │
   │  [Continue to Dashboard]        │
   │  [Manage Accounts]              │
   └─────────────────────────────────┘
```

### **Key UX Points**:
- **Clear option**: "Create new account" is prominently displayed
- **No confusion**: Explains they'll have multiple accounts
- **Management path**: Points to Settings for account management
- **Immediate use**: New account is immediately active

---

## ⚠️ **Error Flows**

### **Network/API Errors**
```
Any Step → Error Occurs
┌─────────────────────────────────┐
│  ⚠️ Something went wrong        │
│                                 │
│  We couldn't complete this      │
│  action. Please try again.      │
│                                 │
│  [Retry] [Go Back] [Skip]       │
└─────────────────────────────────┘
```

### **Auto-Linking Failures**
```
Nostr Auth → Linking Fails
┌─────────────────────────────────┐
│  ⚠️ Linking Notice              │
│                                 │
│  You're signed in, but we       │
│  couldn't link your accounts.   │
│  You can manage this in         │
│  Settings later.                │
│                                 │
│  [Continue] [Open Settings]     │
└─────────────────────────────────┘
```

### **Wrong Nostr Account**
```
Targeted Auth → Wrong Pubkey
┌─────────────────────────────────┐
│  ❌ Account Mismatch            │
│                                 │
│  This isn't the expected        │
│  account. Please try again      │
│  with @musiclover               │
│                                 │
│  [Try Again] [Use Different]    │
└─────────────────────────────────┘
```

---

## 🎯 **UX Design Principles**

### **1. Progressive Disclosure**
- Start simple, add complexity only when needed
- Don't overwhelm users with all options at once
- Explain benefits just before asking for commitment

### **2. Clear Mental Models**
- Email = Wavlake account (traditional, familiar)
- Nostr = Cryptographic account (secure, private)
- Linking = Bridge between the two worlds

### **3. Graceful Degradation**
- If auto-linking fails, user can still sign in
- If user cancels upload linking, they can still explore
- Always provide fallback options

### **4. Recognition Over Recall**
- Show profile pictures and names when possible
- Display partial pubkeys for identification
- Use consistent visual language

### **5. Error Recovery**
- Clear error messages with actionable next steps
- Always provide a way to go back or try again
- Non-blocking errors when possible

### **6. User Agency**
- Users can choose their path (email vs Nostr)
- Clear opt-out options for additional features
- Self-service management always available

---

## 📱 **Responsive Considerations**

All flows adapt to mobile screens with:
- **Larger touch targets** for buttons
- **Simplified layouts** with single-column design
- **Thumb-friendly navigation** with bottom-aligned actions
- **Clear visual hierarchy** with prominent CTAs
- **Reduced cognitive load** with one action per screen

---

## ♿ **Accessibility Features**

- **Screen reader support** for all dialog content
- **Keyboard navigation** through all flow steps
- **High contrast** indicators for current step
- **Clear focus states** for all interactive elements
- **Descriptive alt text** for profile images
- **Semantic HTML** for proper document structure

This UX flow document ensures every user path is clearly defined, accessible, and provides a smooth experience regardless of their technical background or familiarity with Nostr.