import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useTheme } from "next-themes";

// Theme colors matching the CSS variables
const THEME_COLORS = {
  light: '#ffffff', // --background: 0 0% 100%
  dark: '#020817'   // --background: 222.2 84% 4.9%
};

function ThemeMetaUpdater() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Update meta theme-color for mobile browsers
    const themeColor = resolvedTheme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light;
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', themeColor);

    // Update apple-mobile-web-app-status-bar-style
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleStatusBar);
    }
    
    appleStatusBar.setAttribute('content', resolvedTheme === 'dark' ? 'black-translucent' : 'default');
  }, [resolvedTheme]);

  return null;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="wavlake-theme"
    >
      <ThemeMetaUpdater />
      {children}
    </NextThemesProvider>
  );
}