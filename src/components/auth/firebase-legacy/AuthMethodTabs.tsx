import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Upload } from "lucide-react";
import { AUTH_METHODS } from "./constants";
import { handleTextFileUpload } from "@/lib/file-utils";

interface AuthMethodTabsProps {
  onExtension: () => void;
  onNsec: () => void;
  onBunker: () => void;
  isForAuthentication?: boolean;
  isLoading: boolean;
  nsec: string;
  setNsec: (value: string) => void;
  bunkerUri: string;
  setBunkerUri: (value: string) => void;
}

export function AuthMethodTabs({
  onExtension,
  onNsec,
  onBunker,
  isForAuthentication = false,
  isLoading,
  nsec,
  setNsec,
  bunkerUri,
  setBunkerUri,
}: AuthMethodTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleTextFileUpload(e, setNsec);
  };

  return (
    <Tabs
      defaultValue={"nostr" in window ? "extension" : "key"}
      className="w-full"
    >
      <TabsList className="grid grid-cols-3">
        {AUTH_METHODS.map((method) => (
          <TabsTrigger
            key={method.type}
            value={method.type === "nsec" ? "key" : method.type}
          >
            {method.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="extension" className="space-y-3 mt-4">
        <div className="text-center p-3 rounded-lg bg-muted">
          <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="text-sm text-muted-foreground">
            {AUTH_METHODS[0].description}
          </div>
        </div>
        <Button
          onClick={onExtension}
          disabled={isLoading}
          className={
            isForAuthentication
              ? "w-full bg-green-600 hover:bg-green-700"
              : "w-full"
          }
          variant={isForAuthentication ? "default" : "outline"}
        >
          {isLoading
            ? isForAuthentication
              ? "Authenticating..."
              : "Connecting..."
            : isForAuthentication
            ? "Authenticate with Extension"
            : "Link Extension Identity"}
        </Button>
      </TabsContent>

      <TabsContent value="key" className="space-y-3 mt-4">
        <div className="space-y-2">
          <label
            htmlFor={isForAuthentication ? "auth-nsec" : "nsec"}
            className="text-sm font-medium"
          >
            {isForAuthentication
              ? "Enter your nsec for the selected identity"
              : "Enter your nsec"}
          </label>
          <Input
            id={isForAuthentication ? "auth-nsec" : "nsec"}
            value={nsec}
            onChange={(e) => setNsec(e.target.value)}
            placeholder="nsec1..."
            type="password"
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
            className="w-full mb-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Nsec File
          </Button>
        </div>

        <Button
          onClick={onNsec}
          disabled={isLoading || !nsec.trim()}
          className={
            isForAuthentication
              ? "w-full bg-green-600 hover:bg-green-700"
              : "w-full"
          }
          variant={isForAuthentication ? "default" : "outline"}
        >
          {isLoading
            ? isForAuthentication
              ? "Authenticating..."
              : "Linking..."
            : isForAuthentication
            ? "Authenticate with Nsec"
            : "Link Nsec Identity"}
        </Button>
      </TabsContent>

      <TabsContent value="bunker" className="space-y-3 mt-4">
        <div className="space-y-2">
          <label
            htmlFor={isForAuthentication ? "auth-bunker" : "bunkerUri"}
            className="text-sm font-medium"
          >
            {isForAuthentication
              ? "Bunker URI for the selected identity"
              : "Bunker URI"}
          </label>
          <Input
            id={isForAuthentication ? "auth-bunker" : "bunkerUri"}
            value={bunkerUri}
            onChange={(e) => setBunkerUri(e.target.value)}
            placeholder="bunker://"
          />
          {bunkerUri && !bunkerUri.startsWith("bunker://") && (
            <div className="text-destructive text-xs">
              URI must start with bunker://
            </div>
          )}
        </div>

        <Button
          onClick={onBunker}
          disabled={
            isLoading || !bunkerUri.trim() || !bunkerUri.startsWith("bunker://")
          }
          className={
            isForAuthentication
              ? "w-full bg-green-600 hover:bg-green-700"
              : "w-full"
          }
          variant={isForAuthentication ? "default" : "outline"}
        >
          {isLoading
            ? "Connecting..."
            : isForAuthentication
            ? "Connect with Bunker"
            : "Link Bunker Identity"}
        </Button>
      </TabsContent>
    </Tabs>
  );
}