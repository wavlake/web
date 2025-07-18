/**
 * Nostr Authentication Tabs Component
 *
 * Provides a unified tabbed interface for Nostr authentication methods
 * (extension, nsec, bunker) with consistent styling and behavior.
 *
 * This component extracts the common tabbed authentication interface
 * used by both NostrAuthStep and LinkedNostrAuthStep components.
 */

import React, { useRef, useState } from "react";
import { Shield, Upload, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import shared types and utilities
import { AuthTabsProps, AuthLoadingStates, AuthErrors } from "../types";
import {
  validateNsec,
  validateBunkerUri,
  isExtensionAvailable,
} from "../utils/validation";
import { formatPubkey, formatAuthErrorMessage } from "../utils/formatters";

// ============================================================================
// Component
// ============================================================================

/**
 * NostrAuthTabs Component
 *
 * Provides a consistent tabbed interface for Nostr authentication methods.
 * Supports extension, nsec, and bunker authentication with proper validation
 * and error handling.
 *
 * @example
 * ```tsx
 * <NostrAuthTabs
 *   onExtensionAuth={handleExtensionAuth}
 *   onNsecAuth={handleNsecAuth}
 *   onBunkerAuth={handleBunkerAuth}
 *   loadingStates={loadingStates}
 *   errors={errors}
 * />
 * ```
 */
export function NostrAuthTabs({
  onExtensionAuth,
  onNsecAuth,
  onBunkerAuth,
  loadingStates,
  errors,
  externalLoading = false,
  className = "",
}: AuthTabsProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [nsecValue, setNsecValue] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nsecValidation, setNsecValidation] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });
  const [bunkerValidation, setBunkerValidation] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Validation Handlers
  // ============================================================================

  const handleNsecChange = (value: string) => {
    setNsecValue(value);
    if (value.trim()) {
      const validation = validateNsec(value);
      setNsecValidation(validation);
    } else {
      setNsecValidation({ isValid: true });
    }
  };

  const handleBunkerChange = (value: string) => {
    setBunkerUri(value);
    if (value.trim()) {
      const validation = validateBunkerUri(value);
      setBunkerValidation(validation);
    } else {
      setBunkerValidation({ isValid: true });
    }
  };

  // ============================================================================
  // File Upload Handler
  // ============================================================================

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("nsec1")) {
          handleNsecChange(trimmed);
          break;
        }
      }
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleExtensionClick = async () => {
    if (!isExtensionAvailable()) {
      return;
    }
    await onExtensionAuth();
  };

  const handleNsecClick = async () => {
    if (!nsecValue.trim() || !nsecValidation.isValid) return;
    await onNsecAuth(nsecValue.trim());
  };

  const handleBunkerClick = async () => {
    if (!bunkerUri.trim() || !bunkerValidation.isValid) return;
    await onBunkerAuth(bunkerUri.trim());
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderExtensionTab = () => (
    <TabsContent value="extension" className="space-y-4">
      <div className="text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Browser Extension</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in using your browser extension
        </p>

        <Button
          onClick={handleExtensionClick}
          disabled={
            loadingStates.extension ||
            externalLoading ||
            !isExtensionAvailable()
          }
          className="w-full"
        >
          {loadingStates.extension ? "Connecting..." : "Connect Extension"}
        </Button>

        {errors.extension && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {formatAuthErrorMessage(errors.extension, "extension")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TabsContent>
  );

  const renderNsecTab = () => (
    <TabsContent value="nsec" className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nsec">Private Key (nsec)</Label>
          <div className="relative">
            <Input
              id="nsec"
              type={showPassword ? "text" : "password"}
              value={nsecValue}
              onChange={(e) => handleNsecChange(e.target.value)}
              placeholder="nsec1..."
              className="pr-10"
              disabled={loadingStates.nsec || externalLoading}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loadingStates.nsec || externalLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.key"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Or upload a key file
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingStates.nsec || externalLoading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Nsec File
            </Button>
          </div>

          {/* Validation message */}
          {nsecValue && !nsecValidation.isValid && (
            <div className="text-destructive text-xs">
              {nsecValidation.message}
            </div>
          )}
        </div>

        <Button
          onClick={handleNsecClick}
          disabled={
            !nsecValue.trim() ||
            !nsecValidation.isValid ||
            loadingStates.nsec ||
            externalLoading
          }
          className="w-full"
        >
          {loadingStates.nsec ? "Signing in..." : "Sign in with Key"}
        </Button>

        {errors.nsec && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {formatAuthErrorMessage(errors.nsec, "nsec")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TabsContent>
  );

  const renderBunkerTab = () => (
    <TabsContent value="bunker" className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bunker">Bunker URI</Label>
          <Input
            id="bunker"
            type="text"
            value={bunkerUri}
            onChange={(e) => handleBunkerChange(e.target.value)}
            placeholder="bunker://..."
            disabled={loadingStates.bunker || externalLoading}
          />

          {/* Validation message */}
          {bunkerUri && !bunkerValidation.isValid && (
            <div className="text-destructive text-xs">
              {bunkerValidation.message}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your NIP-46 bunker URI for remote signing
          </p>
        </div>

        <Button
          onClick={handleBunkerClick}
          disabled={
            !bunkerUri.trim() ||
            !bunkerValidation.isValid ||
            loadingStates.bunker ||
            externalLoading
          }
          className="w-full"
        >
          {loadingStates.bunker ? "Connecting..." : "Connect Bunker"}
        </Button>

        {errors.bunker && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {formatAuthErrorMessage(errors.bunker, "bunker")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TabsContent>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={className}>
      <Tabs defaultValue="extension" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="extension">Extension</TabsTrigger>
          <TabsTrigger value="nsec">Private Key</TabsTrigger>
          <TabsTrigger value="bunker">Bunker</TabsTrigger>
        </TabsList>

        {renderExtensionTab()}
        {renderNsecTab()}
        {renderBunkerTab()}
      </Tabs>
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

NostrAuthTabs.displayName = "NostrAuthTabs";
