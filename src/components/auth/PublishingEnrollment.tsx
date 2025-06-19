import React, { useState } from "react";
import { Upload, Mail, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePublishingAuth } from "@/hooks/usePublishingAuth";

interface PublishingEnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PublishingEnrollment({
  isOpen,
  onClose,
  onSuccess,
}: PublishingEnrollmentProps) {
  const [email, setEmail] = useState("");
  const [setupType, setSetupType] = useState<"quick" | "recovery">("quick");

  const {
    isPublishingEnabled,
    enablePublishing,
    linkEmail,
    isEnablingPublishing,
    isLinkingEmail,
    error,
    clearError,
  } = usePublishingAuth();

  const handleQuickSetup = async () => {
    console.log("Quick setup initiated");
    try {
      await enablePublishing();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to enable publishing:", err);
    }
  };

  const handleSetupWithRecovery = async () => {
    if (!email.trim() || !email.includes("@")) {
      return;
    }

    try {
      // First enable publishing
      if (!isPublishingEnabled) {
        await enablePublishing();
      }

      // Then link email for recovery
      await linkEmail(email);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to setup publishing with recovery:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Enable Publishing Features
          </DialogTitle>
          <DialogDescription>
            To upload and publish content, you need to enable publishing
            features for your account.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={setupType}
          onValueChange={(v) => setSetupType(v as "quick" | "recovery")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Setup</TabsTrigger>
            <TabsTrigger value="recovery">Setup with Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Quick Setup</p>
                  <p className="text-sm text-muted-foreground">
                    Enable publishing with your Nostr identity. No email
                    required.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  ⚠️ Without email recovery, you won't be able to recover your
                  account if you lose your Nostr key.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleQuickSetup}
                disabled={isEnablingPublishing}
                className="w-full"
              >
                {isEnablingPublishing ? "Enabling..." : "Enable Publishing"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="recovery" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Setup with Recovery</p>
                  <p className="text-sm text-muted-foreground">
                    Add an email for account recovery in case you lose your
                    Nostr key.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery-email">Recovery Email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isEnablingPublishing || isLinkingEmail}
                />
                <p className="text-xs text-muted-foreground">
                  This email will only be used for account recovery, not for
                  login.
                </p>
              </div>

              <Button
                onClick={handleSetupWithRecovery}
                disabled={
                  isEnablingPublishing || isLinkingEmail || !email.trim()
                }
                className="w-full"
              >
                {isEnablingPublishing || isLinkingEmail
                  ? "Setting up..."
                  : "Enable Publishing with Recovery"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError}>
                <X className="w-4 h-4" />
              </button>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
