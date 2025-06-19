import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react";

import { useAccountRecovery } from "@/hooks/useAccountRecovery";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Component for managing email recovery options for Nostr users
 */
export function AccountRecoverySettings() {
  const { user: nostrUser } = useCurrentUser();
  const {
    recoveryStatus,
    isLoading,
    error,
    hasEmailRecovery,
    linkedEmail,
    linkEmailRecovery,
    removeEmailRecovery,
    clearError,
    isLinkingEmail,
    isRemovingEmail,
  } = useAccountRecovery();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Don't show for users who aren't logged in with Nostr
  if (!nostrUser) {
    return null;
  }

  const handleAddEmailRecovery = async () => {
    try {
      await linkEmailRecovery(formData);
      setShowAddForm(false);
      setFormData({ email: '', password: '', confirmPassword: '' });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleRemoveEmailRecovery = async () => {
    if (confirm('Are you sure you want to remove email recovery? You will no longer be able to recover your account via email.')) {
      try {
        await removeEmailRecovery();
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Recovery
          </CardTitle>
          <CardDescription>
            Loading recovery options...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Account Recovery
        </CardTitle>
        <CardDescription>
          Add email recovery to your Nostr account for additional security
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium">Email Recovery</div>
              {hasEmailRecovery ? (
                <div className="text-sm text-muted-foreground">
                  Linked to: {linkedEmail}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Not configured
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasEmailRecovery ? (
              <>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveEmailRecovery}
                  disabled={isRemovingEmail}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {isRemovingEmail ? 'Removing...' : 'Remove'}
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Not Set
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Add Email Form */}
        {showAddForm && !hasEmailRecovery && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3">Add Email Recovery</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="recovery-email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="recovery-password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="recovery-password"
                  type="password"
                  placeholder="Create a password for email recovery"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="recovery-confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="recovery-confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddEmailRecovery}
                  disabled={
                    isLinkingEmail || 
                    !formData.email || 
                    !formData.password || 
                    !formData.confirmPassword
                  }
                  className="flex-1"
                >
                  {isLinkingEmail ? 'Setting up...' : 'Add Email Recovery'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ email: '', password: '', confirmPassword: '' });
                    clearError();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info about email recovery */}
        {!hasEmailRecovery && !showAddForm && (
          <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="text-sm text-blue-800">
              <strong>Why add email recovery?</strong>
              <ul className="mt-1 space-y-1 text-blue-700">
                <li>• Recover access if you lose your Nostr keys</li>
                <li>• Additional account security layer</li>
                <li>• Access to legacy Firebase features</li>
                <li>• Backup authentication method</li>
              </ul>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Nostr Identity Info */}
        <div className="pt-3 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>Current Nostr Identity:</strong> {nostrUser.pubkey.slice(0, 8)}...{nostrUser.pubkey.slice(-8)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}