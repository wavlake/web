import { useState, useEffect } from "react";
import { useCurrentUser } from "./useCurrentUser";

interface GroupSettings {
  hideModeratorsAnnouncements: boolean;
}

const DEFAULT_SETTINGS: GroupSettings = {
  hideModeratorsAnnouncements: false,
};

/**
 * Hook to manage group owner settings (stored in localStorage for now)
 * @param groupId The group ID to manage settings for
 */
export function useGroupSettings(groupId: string) {
  const { user } = useCurrentUser();
  const [settings, setSettings] = useState<GroupSettings>(DEFAULT_SETTINGS);

  const storageKey = `group-settings-${groupId}-${user?.pubkey}`;

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!user || !groupId) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load group settings:', error);
    }
  }, [storageKey, user, groupId]);

  // Update settings and save to localStorage
  const updateSettings = (newSettings: Partial<GroupSettings>) => {
    if (!user || !groupId) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save group settings:', error);
    }
  };

  return {
    settings,
    updateSettings,
  };
}