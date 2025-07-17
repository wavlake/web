// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import NostrProvider from "@/components/NostrProvider";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NostrLoginProvider } from "@nostrify/react/login";
import AppRouter from "./AppRouter";
import { ThemeProvider } from "@/components/ThemeProvider";
import { JoinDialogProvider } from "@/components/groups/JoinDialogProvider";
import { WalletLoader } from "@/components/WalletLoader";
import { GlobalAudioPlayer } from "@/components/audio/GlobalAudioPlayer";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";

// DO NOT MODIFY THIS LIST UNLESS YOU ARE ABSOLUTELY CERTAIN EACH RELAY URL YOU ARE ADDING IS VALID AND THE RELAY IS CURRENTLY ONLINE AND CONFIRMED TO BE FULLY FUNCTIONAL AND WORKING.
const defaultRelays = [
  "wss://relay.wavlake.com/", // DO NOT MODIFY THIS UNLESS EXPLICITLY REQUESTED
  "wss://relay.chorus.community/",
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

export function App() {
  return (
    <SentryErrorBoundary>
      <ThemeProvider>
        <FirebaseAuthProvider>
          <NostrLoginProvider storageKey="nostr:login">
            <NostrProvider relays={defaultRelays}>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <JoinDialogProvider>
                    <WalletLoader />
                    <GlobalAudioPlayer />
                    <Toaster />
                    <Sonner />
                    <AppRouter />
                  </JoinDialogProvider>
                </TooltipProvider>
              </QueryClientProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </FirebaseAuthProvider>
      </ThemeProvider>
    </SentryErrorBoundary>
  );
}

export default App;
