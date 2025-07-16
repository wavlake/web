import React, { useRef, useState } from "react";
import { Shield, Upload, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfileSync } from "@/hooks/useProfileSync";
import { NostrAvatar } from "@/components/NostrAvatar";
import { nip19, getPublicKey } from "nostr-tools";

export const NostrAuthForm = ({
  title,
  description,
  expectedPubkey,
  onComplete,
}: {
  expectedPubkey?: string;
  title?: string;
  description?: string;
  onComplete?: () => void;
}) => {
  // Fetch profile data for the expected pubkey
  const [loadingStates, setLoadingStates] = useState({
    extension: false,
    nsec: false,
    bunker: false,
  });
  const [nsecValue, setNsecValue] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const [errors, setErrors] = useState({
    extension: null as string | null,
    nsec: null as string | null,
    bunker: null as string | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState<{
    expectedPubkey: string;
    enteredPubkey: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loginWithExtension, loginWithNsec, loginWithBunker } =
    useCurrentUser();
  const { syncProfile } = useProfileSync();

  // Utility function to extract pubkey from nsec
  const extractPubkeyFromNsec = (nsec: string): string | null => {
    try {
      if (!nsec.startsWith("nsec1")) return null;
      const { data: privateKey } = nip19.decode(nsec);
      const publicKey = getPublicKey(privateKey as Uint8Array);
      return publicKey;
    } catch (error) {
      return null;
    }
  };

  // Validation helpers
  const isNsecValid =
    nsecValue.trim().length > 0 && nsecValue.startsWith("nsec1");
  const isBunkerValid =
    bunkerUri.trim().length > 0 && bunkerUri.startsWith("bunker://");

  // Enhanced nsec change handler with mismatch detection
  const handleNsecChange = (value: string) => {
    setNsecValue(value);

    if (expectedPubkey && value.trim()) {
      const enteredPubkey = extractPubkeyFromNsec(value.trim());
      if (enteredPubkey && enteredPubkey !== expectedPubkey) {
        setMismatchWarning({
          expectedPubkey,
          enteredPubkey,
        });
      } else {
        setMismatchWarning(null);
      }
    } else {
      setMismatchWarning(null);
    }
  };
  const handleExtensionLogin = async () => {
    setLoadingStates((prev) => ({ ...prev, extension: true }));
    setErrors((prev) => ({ ...prev, extension: null }));
    try {
      if (!("nostr" in window)) {
        throw new Error(
          "Nostr extension not found. Please install a NIP-07 extension."
        );
      }
      const loginInfo = await loginWithExtension();

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await onComplete?.();
    } catch (error) {
      console.error("Extension login failed:", error);
      setErrors((prev) => ({
        ...prev,
        extension:
          error instanceof Error ? error.message : "Extension login failed",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, extension: false }));
    }
  };

  const handleKeyLogin = async () => {
    if (!nsecValue.trim()) return;
    setLoadingStates((prev) => ({ ...prev, nsec: true }));
    setErrors((prev) => ({ ...prev, nsec: null }));

    try {
      const loginInfo = loginWithNsec(nsecValue);

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await onComplete?.();
    } catch (error) {
      console.error("Nsec login failed:", error);
      setErrors((prev) => ({
        ...prev,
        nsec: error instanceof Error ? error.message : "Nsec login failed",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, nsec: false }));
    }
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim() || !bunkerUri.startsWith("bunker://")) return;
    setLoadingStates((prev) => ({ ...prev, bunker: true }));
    setErrors((prev) => ({ ...prev, bunker: null }));

    try {
      const loginInfo = await loginWithBunker(bunkerUri);

      // Sync profile after successful login
      await syncProfile(loginInfo.pubkey);
      await onComplete?.();
    } catch (error) {
      console.error("Bunker login failed:", error);
      setErrors((prev) => ({
        ...prev,
        bunker: error instanceof Error ? error.message : "Bunker login failed",
      }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear any existing errors
    setErrors((prev) => ({ ...prev, nsec: null }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleNsecChange(content.trim());
    };
    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        nsec: "Failed to read file. Please try again.",
      }));
    };
    reader.readAsText(file);
  };
  return (
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
        {errors.extension && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.extension}</AlertDescription>
          </Alert>
        )}
        <div className="text-center p-4 rounded-lg bg-muted">
          <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
          <div className="text-sm text-muted-foreground mb-4">
            Login with one click using the browser extension
          </div>
        </div>
        <Button
          className="w-full rounded-full py-6"
          onClick={handleExtensionLogin}
          disabled={loadingStates.extension}
        >
          {loadingStates.extension
            ? "Connecting to extension..."
            : "Login with Extension"}
        </Button>
      </TabsContent>

      <TabsContent value="key" className="space-y-4">
        {errors.nsec && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.nsec}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nsec">Enter your nsec</Label>
            <div className="relative">
              <Input
                id="nsec"
                type={showPassword ? "text" : "password"}
                value={nsecValue}
                onChange={(e) => handleNsecChange(e.target.value)}
                className="rounded-lg focus-visible:ring-primary pr-10"
                placeholder="nsec1..."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loadingStates.nsec}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {nsecValue && !isNsecValid && (
              <div className="text-destructive text-xs">
                Invalid nsec format. Must start with "nsec1"
              </div>
            )}
            {mismatchWarning && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Account Mismatch Detected</p>
                    <p className="text-sm">
                      The private key you entered belongs to a different account
                      than expected.
                    </p>
                    <div className="text-xs space-y-1 font-mono">
                      <div>
                        Expected: ...{mismatchWarning.expectedPubkey.slice(-8)}
                      </div>
                      <div>
                        Entered: ...{mismatchWarning.enteredPubkey.slice(-8)}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="text-center">
            <div className="text-sm mb-2 text-muted-foreground">
              Or upload a key file
            </div>
            <input
              type="file"
              accept=".txt,.key"
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
            disabled={loadingStates.nsec || !isNsecValid}
          >
            {loadingStates.nsec
              ? "Verifying private key..."
              : mismatchWarning
              ? "Proceed with This Account"
              : "Login with Nsec"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="bunker" className="space-y-4">
        {errors.bunker && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.bunker}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="bunkerUri">Bunker URI</Label>
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
          disabled={loadingStates.bunker || !isBunkerValid}
        >
          {loadingStates.bunker
            ? "Connecting to bunker..."
            : "Login with Bunker"}
        </Button>
      </TabsContent>
    </Tabs>
  );
};
