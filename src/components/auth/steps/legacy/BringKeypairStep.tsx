/**
 * Bring Keypair Step
 * 
 * Allows users to import their existing Nostr private key for legacy migration.
 * Includes validation and security warnings.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, KeyIcon, AlertTriangle, ShieldCheckIcon } from 'lucide-react';

interface BringKeypairStepProps {
  onComplete: (privateKey: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface FormData {
  privateKey: string;
}

interface FormErrors {
  privateKey?: string;
}

export function BringKeypairStep({ onComplete, isLoading, error }: BringKeypairStepProps) {
  const [formData, setFormData] = useState<FormData>({
    privateKey: "",
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // ============================================================================
  // Form Validation
  // ============================================================================

  const validatePrivateKey = (key: string): string | null => {
    if (!key.trim()) {
      return "Private key is required";
    }
    
    // Remove any whitespace
    const cleanKey = key.trim();
    
    // Check if it starts with nsec (bech32 format)
    if (cleanKey.startsWith('nsec1')) {
      if (cleanKey.length !== 63) {
        return "Invalid nsec format - should be 63 characters";
      }
      return null;
    }
    
    // Check if it's a hex key
    if (/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
      return null;
    }
    
    return "Private key must be either a 64-character hex string or nsec format";
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    const privateKeyError = validatePrivateKey(formData.privateKey);
    if (privateKeyError) {
      errors.privateKey = privateKeyError;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      privateKey: value,
    }));
    
    // Clear error when user starts typing
    if (formErrors.privateKey) {
      setFormErrors(prev => ({
        ...prev,
        privateKey: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Clean the private key (remove whitespace)
    const cleanPrivateKey = formData.privateKey.trim();
    await onComplete(cleanPrivateKey);
  };

  const togglePrivateKeyVisibility = () => {
    setShowPrivateKey(prev => !prev);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
          <KeyIcon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Import Your Nostr Keypair</CardTitle>
        <CardDescription>
          Enter your existing Nostr private key to link with your Wavlake account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Global Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Security Warning */}
          <Alert>
            <ShieldCheckIcon className="h-4 w-4" />
            <AlertDescription>
              Your private key will be stored securely in your browser and never sent to our servers.
            </AlertDescription>
          </Alert>
          
          {/* Private Key Field */}
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showPrivateKey ? "text" : "password"}
                placeholder="nsec1... or hex format"
                value={formData.privateKey}
                onChange={handlePrivateKeyChange}
                disabled={isLoading}
                className={formErrors.privateKey ? "border-red-500 pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePrivateKeyVisibility}
                disabled={isLoading}
              >
                {showPrivateKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formErrors.privateKey && (
              <p className="text-sm text-red-500">{formErrors.privateKey}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Accepts both nsec1... (bech32) and 64-character hex formats
            </p>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !formData.privateKey.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing Key...
              </>
            ) : (
              "Import Private Key"
            )}
          </Button>
        </form>
        
        {/* Help Text */}
        <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
          <p>
            Your private key allows you to maintain your existing Nostr identity and followers.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Never share your private key with anyone</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}