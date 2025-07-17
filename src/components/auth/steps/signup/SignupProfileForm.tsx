import { useEffect, type FC, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { NSchema as n, type NostrMetadata } from "@nostrify/nostrify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';
import { type NLoginType, NUser } from "@nostrify/react/login";
import { useToast } from "@/hooks/useToast";
import { KINDS } from "@/lib/nostr-kinds";
import { useNostr } from "@nostrify/react";

interface ProfileData {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

interface SignupProfileFormProps {
  createdLogin: NLoginType | null;
  generatedName: string | null;
  onComplete: (profileData: ProfileData) => Promise<void>;
}

/**
 * SignupProfileForm provides a simplified profile setup interface for signup flow.
 * Unlike EditProfileForm, this component works without requiring a logged-in user
 * by using the createdLogin object directly for authentication operations.
 */
export const SignupProfileForm: FC<SignupProfileFormProps> = ({
  createdLogin,
  generatedName,
  onComplete,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const { nostr } = useNostr();

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
    
    // Check if this is an audio file
    const isAudioFile = file.type.startsWith('audio/');
    
    // Override mime-type for audio files if Blossom returns video/webm
    if (isAudioFile) {
      // Tags are in format: [["url", "https://..."], ["m", "video/webm"], ...]
      // Find and update the mime-type tag
      const updatedTags = tags.map(tag => {
        if (tag[0] === 'm' && tag[1] === 'video/webm') {
          // Override video/webm with audio/webm for audio files
          return ['m', 'audio/webm'];
        }
        return tag;
      });
      
      // Extract URL from the first tag (should be the URL tag)
      const urlTag = updatedTags.find(tag => tag[0] === 'url');
      return urlTag ? urlTag[1] : updatedTags[0][1];
    }
    
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
      console.error("Failed to upload profile picture:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Publish profile event using user signer
  const publishProfile = async (data: NostrMetadata) => {
    if (!user?.signer) {
      throw new Error('No signer available for publishing');
    }

    // Create the kind 0 event
    const event = {
      kind: KINDS.METADATA,
      content: JSON.stringify(data),
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
    };

    // Sign the event
    const signedEvent = await user.signer.signEvent(event);
    
    // Publish to relays (we'll need to implement relay publishing)
    // For now, we'll just resolve - the actual publishing will happen during login completion
    console.log("Profile data prepared for publishing:", {
      event: signedEvent,
      data,
    });

    return signedEvent;
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
      }, {} as any);

      console.log("Publishing profile update:", cleanedData);

      // Publish the profile event
      await publishProfile(cleanedData);

      // Signal completion to the parent component
      await onComplete(cleanedData);

      toast({
        title: "Success",
        description: "Your profile has been set up successfully!",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to set up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Check if we have the required data to function
  if (!user) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">
          Account not ready. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <FormField
              control={form.control}
              name="picture"
              render={({ field }) => (
                <div className="text-center">
                  <div className="mb-4 relative mx-auto">
                    <Avatar className="h-24 w-24 rounded-full mx-auto">
                      <AvatarImage src={field.value} />
                      <AvatarFallback className="text-xl">
                        {form.getValues().name?.slice(0, 2).toUpperCase() ||
                          "UP"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full shadow"
                        onClick={() =>
                          document.getElementById("signup-picture-upload")?.click()
                        }
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <input
                        id="signup-picture-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadPicture(file);
                          }
                        }}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                  <FormDescription className="text-center text-sm">
                    Upload a profile picture (optional)
                  </FormDescription>
                  <FormMessage />
                </div>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      {...field}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormDescription>
                    This is the name that will be displayed to others.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              className="w-full max-w-[200px] flex items-center justify-center gap-2 mx-auto"
              disabled={isPublishing || isUploading || !form.watch("name")?.trim()}
            >
              {(isPublishing || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isPublishing ? "Setting up profile..." : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};