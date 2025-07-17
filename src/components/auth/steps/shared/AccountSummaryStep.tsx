/**
 * Account Summary Step Component
 * 
 * Shows a comprehensive summary of the user's account setup including
 * linked accounts, profile information, and next steps.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  CheckCircle, 
  Mail, 
  Key, 
  Link as LinkIcon,
  ArrowRight,
  Shield
} from 'lucide-react';
import { LinkedPubkey } from '@/hooks/auth/machines/types';

interface AccountSummaryStepProps {
  onContinue: () => void;
  // Nostr account info
  currentPubkey: string;
  displayName?: string;
  profilePicture?: string;
  // Linked accounts
  linkedPubkeys?: LinkedPubkey[];
  isLinked?: boolean;
  // Firebase info
  firebaseEmail?: string;
  hasFirebaseBackup?: boolean;
  // Flow context
  flowType: 'signup' | 'migration' | 'login';
  isArtist?: boolean;
}

export function AccountSummaryStep({
  onContinue,
  currentPubkey,
  displayName,
  profilePicture,
  linkedPubkeys = [],
  isLinked = false,
  firebaseEmail,
  hasFirebaseBackup = false,
  flowType,
  isArtist = false,
}: AccountSummaryStepProps) {

  const formatPubkey = (pubkey: string) => {
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  };

  const getFlowTitle = () => {
    switch (flowType) {
      case 'signup':
        return 'Account Created Successfully!';
      case 'migration':
        return 'Migration Complete!';
      case 'login':
        return 'Welcome Back!';
      default:
        return 'Account Setup Complete!';
    }
  };

  const getFlowDescription = () => {
    switch (flowType) {
      case 'signup':
        return 'Your new Wavlake account has been set up and configured.';
      case 'migration':
        return 'Your legacy account has been successfully migrated to the new system.';
      case 'login':
        return 'You are now signed in to your Wavlake account.';
      default:
        return 'Your account configuration is complete.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            {getFlowTitle()}
          </CardTitle>
          <CardDescription className="text-green-700">
            {getFlowDescription()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Nostr Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <div className="font-medium">
                  {displayName || 'New User'}
                </div>
                <code className="text-sm text-muted-foreground">
                  {formatPubkey(currentPubkey)}
                </code>
              </div>
            </div>
            <div className="flex gap-2">
              {isArtist && (
                <Badge variant="secondary">Artist</Badge>
              )}
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Backup & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Backup & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Firebase Backup Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Email Backup</div>
                <div className="text-sm text-muted-foreground">
                  {hasFirebaseBackup ? (
                    <>Account recovery via email</>
                  ) : (
                    <>No email backup configured</>
                  )}
                </div>
              </div>
            </div>
            {hasFirebaseBackup ? (
              <div className="text-right">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Linked
                </Badge>
                {firebaseEmail && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {firebaseEmail}
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Not Set Up
              </Badge>
            )}
          </div>

          {/* Key Pair Management */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Nostr Keys</div>
                <div className="text-sm text-muted-foreground">
                  Your cryptographic identity
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Secure
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Linked Accounts (if any) */}
      {linkedPubkeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Linked Accounts ({linkedPubkeys.length})
            </CardTitle>
            <CardDescription>
              Other Nostr accounts associated with this profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedPubkeys.map((account) => (
                <div 
                  key={account.pubkey}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <code className="text-sm">{formatPubkey(account.pubkey)}</code>
                      {account.profile?.display_name && (
                        <div className="text-xs text-muted-foreground">
                          {account.profile.display_name}
                        </div>
                      )}
                    </div>
                  </div>
                  {account.isMostRecentlyLinked && (
                    <Badge variant="secondary" className="text-xs">
                      Most Recent
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Your account is ready to use</span>
            </div>
            {isArtist && (
              <>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span>Access your artist dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span>Upload music and create content</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span>Explore communities and connect with others</span>
            </div>
            {!hasFirebaseBackup && (
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-orange-500" />
                <span>Consider setting up email backup for account recovery</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button 
          onClick={onContinue} 
          className="px-8 py-3 text-lg"
          size="lg"
        >
          {flowType === 'signup' ? 'Get Started' : 'Continue to Dashboard'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}