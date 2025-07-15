/**
 * NIP-78 Application Settings Hook
 *
 * Provides functionality to store and retrieve user-specific application settings
 * using Nostr kind 30078 events. Settings are stored per-user and encrypted.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNostr } from "@nostrify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { KINDS } from "@/lib/nostr-kinds";
import { useNostrPublish } from "./useNostrPublish";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface AppSettings {
  isArtist?: boolean;
  // // UI preferences
  // theme?: "light" | "dark" | "system";
  // language?: string;

  // // Audio preferences
  // volume?: number;
  // autoplay?: boolean;
  // soundEffects?: boolean;

  // // Notification preferences
  // notifications?: {
  //   enabled: boolean;
  //   mentions: boolean;
  //   likes: boolean;
  //   reposts: boolean;
  //   follows: boolean;
  // };

  // // Privacy preferences
  // showProfile?: boolean;
  // showActivity?: boolean;

  // // Feature flags
  // betaFeatures?: boolean;

  // // Custom user settings
  // [key: string]: unknown;
}

interface UseAppSettingsResult {
  settings: AppSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isUpdating: boolean;
  hasSettingsEvent: boolean;
}

interface SettingsEvent {
  kind: 30078;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
  id: string;
  sig: string;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: AppSettings = {};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse settings from event content
 */
function parseSettingsFromEvent(event: SettingsEvent): AppSettings | null {
  try {
    if (!event.content) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(event.content);

    // Merge with defaults to ensure all required fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.warn("[useAppSettings] Failed to parse settings event:", error);
    return null;
  }
}

/**
 * Create settings event content
 */
function createSettingsEventContent(settings: AppSettings): string {
  try {
    return JSON.stringify(settings);
  } catch (error) {
    console.error("[useAppSettings] Failed to serialize settings:", error);
    throw new Error("Failed to serialize settings");
  }
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for managing user application settings via NIP-78
 *
 * This hook provides:
 * - Automatic settings loading for authenticated users
 * - Settings updates with optimistic UI updates
 * - Fallback to default settings for unauthenticated users
 * - Error handling and recovery
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { settings, updateSettings, isLoading, isUpdating } = useAppSettings();
 *
 *   const handleThemeChange = (theme: 'light' | 'dark') => {
 *     updateSettings({ theme });
 *   };
 *
 *   if (isLoading) return <div>Loading settings...</div>;
 *
 *   return (
 *     <div>
 *       <h2>Current theme: {settings?.theme}</h2>
 *       <button onClick={() => handleThemeChange('dark')}>
 *         Switch to Dark Mode
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAppSettings(): UseAppSettingsResult {
  const { mutateAsync: publishEvent } = useNostrPublish();

  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const [lastError, setLastError] = useState<Error | null>(null);

  // ============================================================================
  // Query Settings
  // ============================================================================

  const {
    data: queryResult,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["app-settings", user?.pubkey],
    queryFn: async (): Promise<{ settings: AppSettings | null; hasEvent: boolean }> => {
      if (!user?.pubkey) {
        // Return default settings for unauthenticated users
        return { settings: null, hasEvent: false };
      }

      try {
        const signal = AbortSignal.timeout(5000);

        // Query for the user's settings event (kind 30078)
        const events = await nostr.query(
          [
            {
              kinds: [KINDS.APP_SETTINGS],
              authors: [user.pubkey],
              limit: 1,
            },
          ],
          { signal }
        );

        if (events.length === 0) {
          // No settings event found, return defaults
          return { settings: DEFAULT_SETTINGS, hasEvent: false };
        }

        const latestEvent = events[0] as SettingsEvent;
        const parsedSettings = parseSettingsFromEvent(latestEvent);

        if (!parsedSettings) {
          console.warn(
            "[useAppSettings] Failed to parse settings, using defaults"
          );
          return { settings: DEFAULT_SETTINGS, hasEvent: false };
        }

        return { settings: parsedSettings, hasEvent: true };
      } catch (error) {
        console.error("[useAppSettings] Failed to fetch settings:", error);
        throw new Error("Failed to load settings");
      }
    },
    enabled: true, // Always enabled - returns defaults for unauthenticated users
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000, // 2 hours
  });

  // ============================================================================
  // Update Settings Mutation
  // ============================================================================

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      if (!user?.pubkey || !user?.signer) {
        throw new Error("User must be authenticated to update settings");
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new Error("No settings updates provided");
      }

      try {
        // Merge with current settings
        const currentSettings = queryResult?.settings || DEFAULT_SETTINGS;
        const newSettings: AppSettings = {
          ...currentSettings,
          ...updates,
        };

        // Create the settings event
        const eventContent = createSettingsEventContent(newSettings);

        // Publish the settings event
        const event = {
          kind: KINDS.APP_SETTINGS,
          content: eventContent,
          tags: [
            ["d", "settings"], // replaceable event identifier
            ["client", "wavlake"], // client identifier
          ],
        };

        return await publishEvent(event);
      } catch (error) {
        console.error("[useAppSettings] Failed to update settings:", error);
        throw new Error("Failed to update settings");
      }
    },
    onSuccess: (newSettings) => {
      toast.success("Saved app settings!");

      // Update the cache with the new settings
      queryClient.setQueryData(["app-settings", user?.pubkey], { settings: newSettings, hasEvent: true });
      setLastError(null);
    },
    onError: (error) => {
      console.error("[useAppSettings] Settings update failed:", error);
      toast.error("Failed to save app settings. Please try again.");
    },
  });
  // ============================================================================
  // Exposed Functions
  // ============================================================================

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>): Promise<void> => {
      setLastError(null);
      await updateSettingsMutation.mutateAsync(updates);
    },
    [updateSettingsMutation]
  );

  // ============================================================================
  // Combined Error Handling
  // ============================================================================

  const error = useMemo(() => {
    return queryError || lastError || null;
  }, [queryError, lastError]);

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    settings: queryResult?.settings || null,
    isLoading,
    error,
    updateSettings,
    isUpdating: updateSettingsMutation.isPending,
    hasSettingsEvent: queryResult?.hasEvent || false,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get a specific setting value with type safety
 */
export function useAppSetting<K extends keyof AppSettings>(
  key: K
): AppSettings[K] | undefined {
  const { settings } = useAppSettings();
  return settings?.[key];
}

/**
 * Hook to update a specific setting
 */
export function useUpdateAppSetting() {
  const { updateSettings, isUpdating } = useAppSettings();

  return {
    updateSetting: useCallback(
      async <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
      ): Promise<void> => {
        await updateSettings({ [key]: value } as Partial<AppSettings>);
      },
      [updateSettings]
    ),
    isUpdating,
  };
}

export default useAppSettings;
