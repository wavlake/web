import React, { useRef, useState } from "react";
import { ArrowLeft, Shield, Upload } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { useLoginActions } from "@/hooks/useLoginActions";
import { useProfileSync } from "@/hooks/useProfileSync";
import type { NostrAuthMethod, NostrCredentials } from "@/types/authFlow";
import { useNavigate } from "react-router-dom";
import { NostrAvatar } from "@/components/NostrAvatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const NostrAuthForm = ({
  title,
  description,
  expectedPubkey,
}: {
  expectedPubkey?: string;
  title?: string;
  description?: string;
}) => {
  console.log(
    "renderin g NostrSignUpForm with expectedPubkey:",
    expectedPubkey
  );
  // Fetch profile data for the expected pubkey
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const login = useLoginActions();
  const { syncProfile } = useProfileSync();
  const handleExtensionLogin = async () => {
    setIsLoading(true);
    try {
      if (handleNostrAuth) {
        // Use new auth flow
        await handleNostrAuth("extension", { method: "extension" });
      } else {
        // Fallback to legacy useLoginActions
        if (!("nostr" in window)) {
          throw new Error(
            "Nostr extension not found. Please install a NIP-07 extension."
          );
        }
        const loginInfo = await login.extension();

        // Sync profile after successful login
        await syncProfile(loginInfo.pubkey);
      }
    } catch (error) {
      console.error("Extension login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyLogin = async () => {
    if (!nsec.trim()) return;
    setIsLoading(true);

    try {
      if (handleNostrAuth) {
        // Use new auth flow
        await handleNostrAuth("nsec", { method: "nsec", nsec });
      } else {
        // Fallback to legacy useLoginActions
        const loginInfo = login.nsec(nsec);

        // Sync profile after successful login
        await syncProfile(loginInfo.pubkey);
      }
    } catch (error) {
      console.error("Nsec login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim() || !bunkerUri.startsWith("bunker://")) return;
    setIsLoading(true);

    try {
      if (handleNostrAuth) {
        // Use new auth flow
        await handleNostrAuth("bunker", { method: "bunker", bunkerUri });
      } else {
        // Fallback to legacy useLoginActions
        const loginInfo = await login.bunker(bunkerUri);

        // Sync profile after successful login
        await syncProfile(loginInfo.pubkey);
      }
    } catch (error) {
      console.error("Bunker login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNsec(content.trim());
    };
    reader.readAsText(file);
  };

  // {expectedPubkey && (
  //   <NostrAvatar
  //     pubkey={expectedPubkey || ""}
  //     size={64}
  //     includeName
  //   />
  // )}
  return (
    <div className="px-6 py-8 space-y-6">
      <Tabs
        defaultValue={"nostr" in window ? "extension" : "key"}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="extension">Extension</TabsTrigger>
          <TabsTrigger value="key">Nsec</TabsTrigger>
          <TabsTrigger value="bunker">Bunker</TabsTrigger>
        </TabsList>

        <TabsContent value="extension" className="space-y-4">
          <div className="text-center p-4 rounded-lg bg-muted">
            <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
            <div className="text-sm text-muted-foreground mb-4">
              Login with one click using the browser extension
            </div>
          </div>
          <Button
            className="w-full rounded-full py-6"
            onClick={handleExtensionLogin}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login with Extension"}
          </Button>
        </TabsContent>

        <TabsContent value="key" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="nsec"
                className="text-sm font-medium text-foreground"
              >
                Enter your nsec
              </label>
              <Input
                id="nsec"
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                className="rounded-lg focus-visible:ring-primary"
                placeholder="nsec1..."
              />
            </div>

            <div className="text-center">
              <div className="text-sm mb-2 text-muted-foreground">
                Or upload a key file
              </div>
              <input
                type="file"
                accept=".txt"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Nsec File
              </Button>
            </div>

            <Button
              className="w-full rounded-full py-6 mt-4"
              onClick={handleKeyLogin}
              disabled={isLoading || !nsec.trim()}
            >
              {isLoading ? "Verifying..." : "Login with Nsec"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="bunker" className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="bunkerUri"
              className="text-sm font-medium text-foreground"
            >
              Bunker URI
            </label>
            <Input
              id="bunkerUri"
              value={bunkerUri}
              onChange={(e) => setBunkerUri(e.target.value)}
              className="rounded-lg focus-visible:ring-primary"
              placeholder="bunker://"
            />
            {bunkerUri && !bunkerUri.startsWith("bunker://") && (
              <div className="text-destructive text-xs">
                URI must start with bunker://
              </div>
            )}
          </div>

          <Button
            className="w-full rounded-full py-6"
            onClick={handleBunkerLogin}
            disabled={
              isLoading ||
              !bunkerUri.trim() ||
              !bunkerUri.startsWith("bunker://")
            }
          >
            {isLoading ? "Connecting..." : "Login with Bunker"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};
