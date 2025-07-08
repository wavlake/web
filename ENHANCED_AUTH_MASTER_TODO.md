# Enhanced Authentication Master Todo List

## 🎯 Project Overview

This master todo list tracks the complete implementation of the enhanced authentication UX for Wavlake, including:

- Firebase passwordless authentication (magic links)
- Enhanced multi-path login flows for legacy and new users
- Automatic pubkey linking with legacy profile population
- Three-option landing page (Get Started, Wavlake Account, Nostr Account)

## 📋 Implementation Status

**Overall Progress: 0% (Planning Complete)**

---

## 🔧 **Phase 1: Firebase Passwordless Authentication**

### **Firebase Console Setup**

- [ ] **Enable Email/Password provider** in Firebase Console
- [ ] **Enable "Email link (passwordless sign-in)"** option
- [ ] **Configure authorized domains** (localhost, wavlake.com)
- [ ] **Test email delivery** in development environment
- [ ] **Optional: Set up Dynamic Links** for prettier email URLs

### **Core Passwordless Components**

- [ ] **Update FirebaseAuthDialog.tsx** - Add tabbed interface (Password/Passwordless)
- [ ] **Create EmailLinkInputForm.tsx** - Email input for magic links
- [ ] **Create EmailLinkSentView.tsx** - "Check your email" screen with resend
- [ ] **Create useEmailLinkAuth.ts hook** - Handle email link sending/completion
- [ ] **Create AuthComplete.tsx page** - Handle magic link completion
- [ ] **Add /auth/complete route** - Routing for link completion

### **Integration & Testing**

- [ ] **Test email link delivery** across different email providers
- [ ] **Test magic link completion flow**
- [ ] **Test cross-device scenarios** (send on mobile, click on desktop)
- [ ] **Implement rate limiting** for email link requests
- [ ] **Add comprehensive error handling** for expired/invalid links
- [ ] **Test mobile deep linking** for iOS/Android apps

**Phase 1 Estimated Time: 1 week**

---

## 🎨 **Phase 2: Enhanced Landing Page & Login Flows**

### **Three-Option Landing Page**

- [ ] **Create LoginChoiceStep.tsx** - Three authentication options
- [ ] **Update Index.tsx** - Add enhanced login flow option
- [ ] **Create CompositeLoginDialog.tsx** - Orchestrate multi-step flows
- [ ] **Update LoginArea.tsx** - Support enhanced vs legacy flows

### **Legacy User Flows**

- [ ] **Create ProfileSelectionStep.tsx** - Show linked pubkeys with profiles
- [ ] **Create NostrAuthStep.tsx** - Enhanced NSEC auth with validation
- [ ] **Create useLinkedPubkeys.ts hook** - Fetch linked pubkeys with profiles
- [ ] **Create useLegacyProfile.ts hook** - Fetch Wavlake profile data
- [ ] **Create generateNostrAccountWithProfile.ts** - Account generation with legacy data

### **Auto-Linking System**

- [ ] **Create useAutoLinkPubkey.ts hook** - Automatic pubkey linking
- [ ] **Implement graceful error handling** - Non-blocking linking failures
- [ ] **Add success/failure toast notifications** - User feedback for linking
- [ ] **Test all auto-linking scenarios** - Different pubkeys, existing links, failures

**Phase 2 Estimated Time: 1.5 weeks**

---

## 🎵 **Phase 3: Upload Flow Integration**

### **Just-in-Time Linking**

- [ ] **Create UploadRequiredDialog.tsx** - Lightweight upload linking prompt
- [ ] **Update upload components** - Add linking detection before uploads
- [ ] **Create useUploadWithLinking.ts hook** - Upload flow integration
- [ ] **Test upload flow scenarios** - Linked vs unlinked users

### **Group Creation Integration**

- [ ] **Add linking detection** to group creation flows
- [ ] **Update group creation components** - Prompt for linking when needed
- [ ] **Test group creation scenarios** - Various user states

**Phase 3 Estimated Time: 0.5 weeks**

---

## 🔧 **Phase 4: Backend API Enhancements**

- we should skip phase 4 for now, and manually review it later

### **New API Endpoints**

- [ ] **Implement POST /v1/auth/login-email** - Email login with pubkey discovery - This item should be accomplished by the firebase api, and not by our app api (skip this)
- [ ] **Enhance GET /v1/auth/get-linked-pubkeys** - Include kind 0 profile data - kind 0 profile data should be fetched directly from nostr relays, not from the app api (skip this)
- [ ] **Create GET /v1/auth/legacy-profile** - Fetch Wavlake profile for population - this is already accomplished by the useLegacyMetadata() hook
- [ ] **Test all API endpoints** - Comprehensive API testing

### **Profile Data Integration**

- [ ] **Implement kind 0 profile fetching** - Nostr profile events - this should already be handled by a hook that fetches kind 0 profile events - useAuthor
- [ ] **Add profile caching** - Performance optimization - this may already be handled by the hook that fetched kind 0 profile events - useAuthor
- [ ] **Handle missing profile data** - Graceful fallbacks
      **Phase 4 Estimated Time: 1 week**

---

## 🧪 **Phase 5: Testing & Quality Assurance**

### **User Flow Testing**

- [ ] **Test Flow 1: New User ("Get Started")** - Unchanged functionality
- [ ] **Test Flow 2: Legacy User with Linked Pubkey** - All branching paths
- [ ] **Test Flow 3: Legacy User without Linked Pubkey** - Account generation scenarios
- [ ] **Test Flow 4: Existing Nostr User** - Direct access path
- [ ] **Test Flow 5: Upload Attempt** - Just-in-time linking
- [ ] **Test all error scenarios** - Network failures, invalid data, expired links

### **Cross-Browser & Device Testing**

- [ ] **Test on Chrome, Firefox, Safari** - Desktop browsers
- [ ] **Test on mobile browsers** - iOS Safari, Android Chrome
- [ ] **Test PWA functionality** - If applicable
- [ ] **Test email client integrations** - Gmail, Outlook, Apple Mail

### **Performance Testing**

- [ ] **Measure authentication flow performance** - Time to complete each flow
- [ ] **Test with slow network conditions** - 3G simulation
- [ ] **Optimize bundle size** - Check impact of new components
- [ ] **Test concurrent user scenarios** - Multiple users, rate limiting

**Phase 5 Estimated Time: 1 week**

---

## 📚 **Phase 6: Documentation & Deployment**

### **User Documentation**

- [ ] **Update help documentation** - New authentication options
- [ ] **Create troubleshooting guide** - Common issues and solutions
- [ ] **Document account linking benefits** - Why users should link accounts

### **Developer Documentation**

- [ ] **Update component documentation** - All new components
- [ ] **Document API changes** - New endpoints and enhanced functionality
- [ ] **Create deployment guide** - Firebase setup, environment variables
- [ ] **Update README** - New authentication features

### **Deployment & Monitoring**

- [ ] **Deploy to staging environment** - Full testing environment
- [ ] **Set up monitoring** - Authentication success rates, error tracking
- [ ] **Configure analytics** - Track authentication method usage
- [ ] **Deploy to production** - Gradual rollout with feature flags

**Phase 6 Estimated Time: 0.5 weeks**

---

## 🎯 **Milestone Checklist**

### **Milestone 1: Passwordless Auth Working** ✨

- [ ] Users can sign in with magic links
- [ ] Email delivery working in all environments
- [ ] Magic link completion flow functional
- [ ] Error handling comprehensive

### **Milestone 2: Enhanced Flows Working** ✨

- [ ] Three-option landing page functional
- [ ] Legacy users can discover linked accounts
- [ ] Profile population from legacy data working
- [ ] Auto-linking system functional

### **Milestone 3: Upload Integration Complete** ✨

- [ ] Upload flow prompts for linking when needed
- [ ] Group creation requires linking
- [ ] Just-in-time flows are seamless

### **Milestone 4: Production Ready** ✨

- [ ] All tests passing
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] Monitoring in place

---

## 🚨 **Critical Dependencies & Blockers**

### **External Dependencies**

- [ ] **Firebase Console access** - Required for passwordless setup
- [ ] **Email delivery testing** - Ensure emails reach users
- [ ] **Domain configuration** - Authorized domains for magic links
- [ ] **API backend deployment** - New endpoints need to be deployed

### **Potential Blockers**

- [ ] **Email deliverability issues** - Spam filters, corporate firewalls
- [ ] **Cross-device magic link issues** - Different browsers/devices
- [ ] **Legacy profile data access** - API availability for Wavlake profile data
- [ ] **Performance impact** - New components affecting load times

---

## 📊 **Success Metrics & KPIs**

### **User Experience Metrics**

- [ ] **Authentication completion rate** - % users who complete each flow
- [ ] **Time to authenticate** - Average time for each authentication method
- [ ] **User preference distribution** - Password vs passwordless usage
- [ ] **Error rate by flow** - Track where users encounter issues

### **Technical Metrics**

- [ ] **API response times** - Performance of new endpoints
- [ ] **Email delivery rate** - % magic links successfully delivered
- [ ] **Auto-linking success rate** - % successful automatic account links
- [ ] **Cross-device completion rate** - % magic links clicked on different devices

### **Business Metrics**

- [ ] **Upload conversion rate** - % users who complete linking to upload
- [ ] **Account linking adoption** - % legacy users who link accounts
- [ ] **User retention** - Impact on user engagement and retention

---

## 🔄 **Future Enhancements** (Post-Launch)

### **Advanced Features**

- [ ] **Social login integration** - Google, Twitter, etc.
- [ ] **Multi-account management** - Switch between multiple linked accounts
- [ ] **Account migration tools** - Bulk profile data migration
- [ ] **Advanced security features** - 2FA, device management

### **UX Improvements**

- [ ] **Onboarding tutorial** - Guide users through new authentication options
- [ ] **Preference management** - Let users set default authentication method
- [ ] **Profile synchronization** - Auto-sync changes between Wavlake and Nostr
- [ ] **Advanced profile population** - More data fields, images, etc.

---

## 📝 **Notes & Decisions**

### **Architecture Decisions**

- **Magic Links over OTP codes** - Firebase native support, better UX
- **Reuse existing components** - Maximize FirebaseAuthDialog, LoginDialog reuse
- **Non-blocking auto-linking** - Don't fail authentication if linking fails
- **Legacy profile population** - Automatically populate new Nostr accounts

### **UX Decisions**

- **Three clear entry points** - Get Started, Wavlake Account, Nostr Account
- **Progressive disclosure** - Only show complexity when needed
- **Graceful error handling** - Always provide recovery options
- **Just-in-time prompting** - Only ask for linking when features require it

### **Technical Decisions**

- **Firebase passwordless** - Native email link authentication
- **Client-side rate limiting** - Prevent abuse of email sending
- **Local storage for email** - Support cross-device magic link completion
- **Automatic profile fetching** - Include kind 0 events with linked pubkeys

---

## 📞 **Team Assignments** (To Be Filled)

### **Frontend Development**

- **Assigned to:** _[Team Member]_
- **Responsibilities:** React components, hooks, user flows
- **Estimated effort:** 3 weeks

### **Backend Development**

- **Assigned to:** _[Team Member]_
- **Responsibilities:** API endpoints, profile data integration
- **Estimated effort:** 1 week

### **QA & Testing**

- **Assigned to:** _[Team Member]_
- **Responsibilities:** Manual testing, automated tests, cross-browser testing
- **Estimated effort:** 1 week

### **Documentation & Deployment**

- **Assigned to:** _[Team Member]_
- **Responsibilities:** User docs, deployment, monitoring setup
- **Estimated effort:** 0.5 weeks

---

## ⏰ **Timeline Summary**

| Phase       | Duration  | Dependencies     | Key Deliverables           |
| ----------- | --------- | ---------------- | -------------------------- |
| **Phase 1** | 1 week    | Firebase setup   | Passwordless auth working  |
| **Phase 2** | 1.5 weeks | Phase 1 complete | Enhanced login flows       |
| **Phase 3** | 0.5 weeks | Phase 2 complete | Upload integration         |
| **Phase 4** | 1 week    | Backend capacity | API enhancements           |
| **Phase 5** | 1 week    | All phases       | Testing & QA               |
| **Phase 6** | 0.5 weeks | Phase 5 complete | Documentation & deployment |

**Total Estimated Timeline: 5.5 weeks**

---

## ✅ **Completion Criteria**

This project will be considered complete when:

1. ✅ **All user flows are functional** - Users can authenticate via all paths
2. ✅ **Passwordless authentication works** - Magic links deliver and complete successfully
3. ✅ **Auto-linking is reliable** - Accounts link automatically with proper error handling
4. ✅ **Legacy profile population works** - New accounts use existing Wavlake data
5. ✅ **Upload flows require linking** - Just-in-time prompting is functional
6. ✅ **All tests pass** - Comprehensive testing across browsers and devices
7. ✅ **Performance is acceptable** - No significant degradation in load times
8. ✅ **Documentation is complete** - Users and developers have proper guides
9. ✅ **Monitoring is in place** - Can track success rates and identify issues
10. ✅ **Production deployment successful** - Feature is live and stable

**🎉 Ready for enhanced authentication UX implementation!**
