import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';
import { type NLoginType, NUser } from "@nostrify/react/login";
import { useNostr } from "@nostrify/react";
import { useMemo } from "react";

export function useSignupUploadFile(createdLogin: NLoginType | null) {
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

  return useMutation({
    mutationFn: async (file: File) => {
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
        return updatedTags;
      }
      
      return tags;
    },
  });
}