# Firebase Console Configuration Guide

## 🎯 Overview

This guide provides step-by-step instructions for configuring Firebase Console to enable passwordless authentication (magic links) for the Wavlake application.

## 🔧 Required Configuration Steps

### 1. Enable Email/Password Authentication Provider

1. Navigate to [Firebase Console](https://console.firebase.google.com/)
2. Select your Wavlake project
3. Go to **Authentication** → **Sign-in method**
4. Click on **Email/Password** provider
5. Enable the **Email/Password** toggle if not already enabled
6. **Enable the "Email link (passwordless sign-in)" option**
7. Click **Save**

### 2. Configure Authorized Domains

1. In the Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add the following domains if not already present:
   - `localhost` (for development)
   - `wavlake.com` (production)
   - Any other domains where auth will be used

### 3. Optional: Dynamic Links Setup (Recommended for Production)

1. In the Firebase Console, go to **Dynamic Links**
2. Click **Get Started** if not already set up
3. Create a new domain prefix (e.g., `wavlake.page.link`)
4. Configure the domain settings:
   - **Domain prefix**: `wavlake.page.link`
   - **Deep link URL pattern**: `https://wavlake.com/auth/complete`
   - **Fallback URL**: `https://wavlake.com`

## 📧 Email Template Configuration

### Customize Authentication Email Templates

1. Go to **Authentication** → **Templates**
2. Select **Email link sign-in**
3. Customize the email template:
   - **Subject**: "Sign in to Wavlake"
   - **Body**: Update with Wavlake branding and clear instructions
   - **Action URL**: Ensure it points to `https://wavlake.com/auth/complete`

### Sample Email Template

```
Subject: Sign in to Wavlake

Hi,

Click the link below to sign in to your Wavlake account:

%LINK%

This link will expire in 1 hour and can only be used once.

If you didn't request this email, you can safely ignore it.

Best regards,
The Wavlake Team
```

## 🔒 Security Settings

### Configure Security Rules

1. Go to **Authentication** → **Settings** → **User actions**
2. Set **Email enumeration protection** to **Enabled**
3. Configure **Multi-factor authentication** as needed
4. Set **Password policy** (if using password auth as fallback)

### Rate Limiting

1. In **Authentication** → **Settings** → **Usage**
2. Review and adjust rate limits:
   - **Sign-in attempts**: 5 per minute per IP
   - **Email verification**: 3 per minute per email

## 🧪 Testing Configuration

### Development Environment Testing

1. **Test Email Delivery**:
   - Use a real email address during development
   - Check spam/junk folders
   - Verify email delivery time (should be < 30 seconds)

2. **Test Magic Link Functionality**:
   - Request a magic link
   - Click the link in the email
   - Verify successful authentication
   - Test link expiration (1 hour)

3. **Test Cross-Device Scenarios**:
   - Request link on mobile device
   - Click link on desktop (should prompt for email)
   - Verify successful authentication

### Validation Checklist

- [ ] Email/Password provider is enabled
- [ ] Passwordless sign-in option is enabled
- [ ] Authorized domains include localhost and wavlake.com
- [ ] Dynamic Links domain is configured (optional)
- [ ] Email template is customized with Wavlake branding
- [ ] Security settings are configured
- [ ] Test emails are delivered successfully
- [ ] Magic links work correctly
- [ ] Cross-device authentication works

## 🚨 Common Issues and Troubleshooting

### Email Delivery Issues

**Problem**: Emails not being delivered
**Solutions**:
- Check spam/junk folders
- Verify authorized domains configuration
- Check Firebase Console → Authentication → Usage for any quota limits
- Ensure email addresses are valid

### Link Expiration

**Problem**: Magic links expire too quickly
**Solutions**:
- Magic links expire after 1 hour (Firebase default)
- Users can request new links if needed
- Implement proper error handling for expired links

### Cross-Device Authentication

**Problem**: Users can't complete authentication on different devices
**Solutions**:
- Ensure proper email prompting is implemented
- Test with actual devices (not just browser dev tools)
- Verify Dynamic Links configuration for mobile apps

## 📋 Configuration Verification

### Step-by-Step Verification

1. **Check Provider Configuration**:
   - Firebase Console → Authentication → Sign-in method
   - Email/Password provider should show "Enabled"
   - Email link option should be checked

2. **Verify Authorized Domains**:
   - Firebase Console → Authentication → Settings → Authorized domains
   - Should include localhost and wavlake.com

3. **Test Email Delivery**:
   - Use Firebase Console → Authentication → Templates
   - Send test email to verify delivery

4. **Validate Dynamic Links** (if configured):
   - Firebase Console → Dynamic Links
   - Test link generation and redirection

## 🎯 Success Criteria

Configuration is complete when:
- ✅ Passwordless authentication is enabled in Firebase Console
- ✅ All required domains are authorized
- ✅ Test emails are delivered successfully in development
- ✅ Magic links work correctly in test environment
- ✅ Email templates are customized with Wavlake branding
- ✅ Security settings are properly configured

## 🔄 Maintenance

### Regular Monitoring

1. **Check Email Delivery Metrics**:
   - Firebase Console → Authentication → Usage
   - Monitor delivery success rates

2. **Review Security Logs**:
   - Check for unusual authentication patterns
   - Monitor rate limiting effectiveness

3. **Update Email Templates**:
   - Keep branding consistent
   - Update contact information as needed

## 📞 Support

For Firebase Console configuration issues:
1. Check Firebase Console status page
2. Review Firebase documentation
3. Contact Firebase support if needed
4. Update team if configuration changes are required

---

*This configuration enables passwordless authentication for the Wavlake application. Complete all steps in this guide to ensure proper functionality.*