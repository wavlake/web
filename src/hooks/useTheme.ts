import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  return { 
    theme: resolvedTheme as "light" | "dark",
    setTheme,
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark")
  };
}