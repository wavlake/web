/**
 * Account Choice Step
 *
 * Auto-generates a Nostr account and provides profile editing interface
 * with an option to sign in with existing keys instead.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Loader2, 
  Upload, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { NSchema as n, type NostrMetadata } from "@nostrify/nostrify";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';
import { type NLoginType, NUser } from "@nostrify/react/login";
import { useToast } from "@/hooks/useToast";
import { useNostr } from "@nostrify/react";
import { type ProfileData } from "@/types/profile";
import { NostrCredentials } from "@/types/authFlow";

// Import existing auth components
import { NostrAuthTabs } from "../../ui/NostrAuthTabs";
import { AuthLoadingStates, AuthErrors } from "../../types";

interface AccountChoiceStepProps {
  // Auto-generated account data
  createdLogin: NLoginType | null;
  generatedName: string | null;
  
  // Action handlers
  onSaveProfile: (profileData: ProfileData) => Promise<void>;
  onSignInWithExisting: (credentials: NostrCredentials) => Promise<void>;
  onAutoGenerate: () => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
  isGenerating: boolean;
}

export function AccountChoiceStep({
  createdLogin,
  generatedName,
  onSaveProfile,
  onSignInWithExisting,
  onAutoGenerate,
  isLoading,
  error,
  isGenerating,
}: AccountChoiceStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showExistingAuth, setShowExistingAuth] = useState(false);
  const [authLoadingStates, setAuthLoadingStates] = useState<AuthLoadingStates>({
    extension: false,
    nsec: false,
    bunker: false,
  });
  const [authErrors, setAuthErrors] = useState<AuthErrors>({
    extension: null,
    nsec: null,
    bunker: null,
  });
  
  const { toast } = useToast();
  const { nostr } = useNostr();

  // Auto-generate account on mount if not already done
  useEffect(() => {
    if (!createdLogin && !isGenerating) {
      onAutoGenerate().catch((err) => {
        console.error("Failed to auto-generate account:", err);
      });
    }
  }, [createdLogin, isGenerating, onAutoGenerate]);

  // Convert login to user to get signer
  const user = useMemo(() => {
    if (!createdLogin) return null;
    
    try {
      switch (createdLogin.type) {
        case 'nsec':
          return NUser.fromNsecLogin(createdLogin);
        case 'bunker':
          return NUser.fromBunkerLogin(createdLogin, nostr);
        case 'extension':
          return NUser.fromExtensionLogin(createdLogin);
        default:
          throw new Error(`Unsupported login type: ${createdLogin.type}`);
      }
    } catch (error) {
      console.error('Failed to create user from login:', error);
      return null;
    }
  }, [createdLogin, nostr]);

  // Initialize the form with default values
  const form = useForm<NostrMetadata>({
    resolver: zodResolver(n.metadata()),
    defaultValues: {
      name: generatedName || "",
      picture: "",
    },
  });

  // Update form values when generatedName changes
  useEffect(() => {
    if (generatedName) {
      form.setValue("name", generatedName);
    }
  }, [generatedName, form]);

  // Upload file using user signer
  const uploadFile = async (file: File): Promise<string> => {
    if (!user?.signer) {
      throw new Error('No signer available for file upload');
    }

    const uploader = new BlossomUploader({
      servers: [
        'https://blossom.primal.net/',
      ],
      signer: user.signer,
    });

    const tags = await uploader.upload(file);
    
    // Extract URL from the first tag (should be the URL tag)
    const urlTag = tags.find(tag => tag[0] === 'url');
    return urlTag ? urlTag[1] : tags[0][1];
  };

  // Handle file uploads for profile picture
  const uploadPicture = async (file: File) => {
    if (!user?.signer) {
      toast({
        title: "Error",
        description: "No authentication available for file upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(file);
      form.setValue("picture", url);
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error("Failed to upload picture:", error);
      toast({
        title: "Error",
        description: "Failed to upload picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: NostrMetadata) => {
    if (!user) {
      toast({
        title: "Error",
        description: "No account created yet",
        variant: "destructive",
      });
      return;
    }

    // Check if the name field is filled out
    const hasName = values.name && values.name.trim() !== "";
    
    if (!hasName) {
      toast({
        title: "Error",
        description: "Please provide a name for your profile",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      // Prepare the profile data
      const profileData = {
        name: values.name?.trim(),
        picture: values.picture || "",
      };

      // Remove empty values
      const cleanedData = Object.entries(profileData).reduce((acc, [key, value]) => {
        if (value && value !== "") {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Signal completion to the parent component
      await onSaveProfile(cleanedData);

      toast({
        title: "Success",
        description: "Your profile has been set up successfully!",
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast({
        title: "Error",
        description: "Failed to set up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle existing Nostr authentication
  const handleExtensionAuth = async () => {
    setAuthLoadingStates((prev) => ({ ...prev, extension: true }));
    setAuthErrors((prev) => ({ ...prev, extension: null }));
    try {
      await onSignInWithExisting({ method: "extension" });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        extension: error instanceof Error ? error : new Error("Extension authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, extension: false }));
    }
  };

  const handleNsecAuth = async (nsecValue: string) => {
    setAuthLoadingStates((prev) => ({ ...prev, nsec: true }));
    setAuthErrors((prev) => ({ ...prev, nsec: null }));
    try {
      await onSignInWithExisting({ method: "nsec", nsec: nsecValue });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        nsec: error instanceof Error ? error : new Error("Nsec authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, nsec: false }));
    }
  };

  const handleBunkerAuth = async (bunkerUri: string) => {
    setAuthLoadingStates((prev) => ({ ...prev, bunker: true }));
    setAuthErrors((prev) => ({ ...prev, bunker: null }));
    try {
      await onSignInWithExisting({ method: "bunker", bunkerUri });
    } catch (error) {
      setAuthErrors((prev) => ({
        ...prev,
        bunker: error instanceof Error ? error : new Error("Bunker authentication failed"),
      }));
    } finally {
      setAuthLoadingStates((prev) => ({ ...prev, bunker: false }));
    }
  };

  // Show loading state during account generation
  if (isGenerating || (!createdLogin && !error)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Creating Your Nostr Account</h3>
          <p className="text-sm text-muted-foreground">
            Generating your secure keypair and setting up your profile...
          </p>
        </div>
      </div>
    );
  }

  // Show error if account generation failed
  if (error && !createdLogin) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => onAutoGenerate()}
          className="w-full"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            "Try Again"
          )}
        </Button>
      </div>
    );
  }

  // Show profile form once account is ready
  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generated Account Success Message */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">Nostr account created successfully!</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your account is ready. Customize your profile below.
        </p>
      </div>

      {/* Profile Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <div className="space-y-4">
            <FormLabel>Profile Picture</FormLabel>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={form.watch("picture")} />
                <AvatarFallback className="text-lg font-medium">
                  {form.watch("name")?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadPicture(file);
                    }
                  }}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your display name" 
                    {...field} 
                    disabled={isPublishing}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Save Profile Button */}
          <Button
            type="submit"
            disabled={isPublishing || isLoading}
            className="w-full"
            size="lg"
          >
            {isPublishing || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              "Save Profile & Continue"
            )}
          </Button>
        </form>
      </Form>

      {/* Alternative Authentication Option */}
      <div className="pt-4 border-t">
        <Collapsible open={showExistingAuth} onOpenChange={setShowExistingAuth}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              type="button"
            >
              <span className="text-sm text-muted-foreground">
                Already have a Nostr account? Sign in instead
              </span>
              {showExistingAuth ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <NostrAuthTabs
                onExtensionAuth={handleExtensionAuth}
                onNsecAuth={handleNsecAuth}
                onBunkerAuth={handleBunkerAuth}
                loadingStates={authLoadingStates}
                errors={authErrors}
                externalLoading={isLoading}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Global Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}