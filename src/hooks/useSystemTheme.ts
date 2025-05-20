// src/hooks/useSystemTheme.ts
import { useEffect } from 'react';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_CLASS = 'dark';

export function useSystemTheme() {
  useEffect(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);

    const handleChange = () => {
      if (mediaQueryList.matches) {
        document.documentElement.classList.add(THEME_CLASS);
      } else {
        document.documentElement.classList.remove(THEME_CLASS);
      }
    };

    // initial check
    handleChange();

    // listen for changes
    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);
}
