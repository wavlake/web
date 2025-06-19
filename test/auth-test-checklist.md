# Quick Test Checklist for Hybrid Authentication

## 🚀 Priority 1: Critical User Flows

### New User Signup
- [ ] Click "Get Started" → automatic account creation
- [ ] Set profile name/pic → redirects to /groups
- [ ] Wallet created successfully
- [ ] Can play music immediately

### Legacy Firebase Migration
- [ ] Login with email/password
- [ ] See "Set Up Nostr Identity" screen
- [ ] Click "Quick Setup" → auto-generates keypair
- [ ] Success screen → Continue to App
- [ ] Can access all features

### Existing Nostr User
- [ ] Login with extension/nsec/bunker
- [ ] No Firebase prompts for reading
- [ ] "Enable Publishing" only when needed
- [ ] Publishing state persists after refresh

## 🔍 Priority 2: Edge Cases

### Account State Conflicts
- [ ] Already migrated user → shows "Welcome Back!"
- [ ] Email already in use → proper error message
- [ ] Invalid credentials → specific error messages
- [ ] Network timeout → can retry

### Multiple Device Scenarios  
- [ ] Login on device A, then device B
- [ ] Publishing enabled on A → available on B
- [ ] Logout on A → B still logged in
- [ ] Different browsers = different sessions

### Storage Issues
- [ ] Clear localStorage → graceful logout
- [ ] Private browsing → warning shown
- [ ] Corrupted data → handled gracefully

## ⚠️ Priority 3: Error Scenarios

### Network Failures
- [ ] API down → shows retry option
- [ ] Timeout during migration → can resume
- [ ] Firebase unavailable → specific error

### Invalid Inputs
- [ ] Short password (<6 chars) → error
- [ ] Invalid email format → error  
- [ ] Bad nsec format → error
- [ ] Wrong bunker protocol → error

### Security Checks
- [ ] No tokens in URLs
- [ ] HTTPS for all API calls
- [ ] Tokens expire properly
- [ ] Can't access other users' data

## ✅ Quick Smoke Test (5 min)

1. **New User Flow**
   - Get Started → Set name → Reach /groups

2. **Legacy Migration**  
   - Firebase login → Quick Setup → Success

3. **Publishing Flow**
   - Nostr login → Enable Publishing → Upload works

4. **Settings Check**
   - Keys visible in settings
   - Account recovery options work
   - Can add/remove email recovery

## 🐛 Common Issues to Check

1. **Login Dialog Won't Close**
   - Check browser console for errors
   - Verify localStorage has auth data
   - Try page refresh

2. **Publishing Not Available**
   - Check if Firebase token exists
   - Verify catalog API is running
   - Check browser dev tools network tab

3. **Migration Fails**
   - Verify user has no existing pubkeys
   - Check catalog API logs
   - Ensure Firebase project is configured

4. **Can't See Settings Options**
   - Verify navigation to /settings (not /pages/settings)
   - Check user is logged in
   - Refresh page after login

## 📊 Test Data Setup

```bash
# Create test legacy user (in catalog DB)
INSERT INTO users (firebase_uid, email, created_at) 
VALUES ('test_legacy_' || substr(md5(random()::text), 1, 8), 'test@example.com', now());

# Check if user has linked pubkeys
SELECT u.email, up.pubkey 
FROM users u 
LEFT JOIN user_pubkey up ON u.id = up.user_id 
WHERE u.email = 'test@example.com';

# Clear test user's pubkeys (to test migration)
DELETE FROM user_pubkey 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

## 🎯 Success Criteria

- [ ] All priority 1 flows work without errors
- [ ] No regression in existing Nostr features  
- [ ] Firebase SDK only loads when needed
- [ ] Error messages are user-friendly
- [ ] Performance impact < 2s for publishing
- [ ] Settings page shows all auth options