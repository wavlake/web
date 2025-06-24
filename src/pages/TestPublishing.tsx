import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePublishingAuth } from '@/hooks/usePublishingAuth';
import { PublishingEnrollment } from '@/components/auth/PublishingEnrollment';

function TestPublishing() {
  const { user } = useCurrentUser();
  const {
    canPublish,
    isPublishingEnabled,
    isPublishingConfigured,
    firebaseToken,
    linkedEmail,
    error,
  } = usePublishingAuth();
  
  const [showEnrollment, setShowEnrollment] = useState(false);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Publishing Features Test</h1>
      
      {/* Current State */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication State</CardTitle>
          <CardDescription>Current user and publishing status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nostr User:</strong>
              <p className="font-mono text-xs mt-1">
                {user ? `${user.pubkey.slice(0, 8)}...${user.pubkey.slice(-8)}` : 'Not logged in'}
              </p>
            </div>
            <div>
              <strong>Publishing Configured:</strong>
              <p className="mt-1">{isPublishingConfigured ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Publishing Enabled:</strong>
              <p className="mt-1">{isPublishingEnabled ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Can Publish:</strong>
              <p className="mt-1">{canPublish ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Firebase Token:</strong>
              <p className="font-mono text-xs mt-1">
                {firebaseToken ? `${firebaseToken.slice(0, 20)}...` : 'None'}
              </p>
            </div>
            <div>
              <strong>Recovery Email:</strong>
              <p className="mt-1">{linkedEmail || 'Not linked'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Publishing Features</CardTitle>
          <CardDescription>Enable publishing to test the catalog API integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be logged in with Nostr to enable publishing features.
              </AlertDescription>
            </Alert>
          ) : !isPublishingEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Publishing features allow you to upload content to the Wavlake catalog.
                You can optionally add email recovery to protect your account.
              </p>
              <Button onClick={() => setShowEnrollment(true)} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Enable Publishing Features
              </Button>
            </div>
          ) : (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Publishing features are enabled! You can now upload content.
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Mock Upload Test */}
      {canPublish && (
        <Card>
          <CardHeader>
            <CardTitle>Test Upload</CardTitle>
            <CardDescription>This would trigger the upload flow</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <Upload className="w-4 h-4 mr-2" />
              Upload Audio (Not implemented in test)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Publishing Enrollment Dialog */}
      <PublishingEnrollment
        isOpen={showEnrollment}
        onClose={() => setShowEnrollment(false)}
        onSuccess={() => {
          console.log('Publishing enabled successfully!');
        }}
      />
    </div>
  );
}

export default TestPublishing;